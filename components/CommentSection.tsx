'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import AvatarWithFrame from '@/components/AvatarWithFrame'
import { fetchEquippedFrames } from '@/lib/fetch-frames'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  recipe_id: string
  profiles: {
    display_name: string
    avatar_url: string | null
  }
}

interface CommentSectionProps {
  recipeId: string
  userId: string
  isAdmin?: boolean
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

const commentVariants = {
  initial: { opacity: 0, y: -16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
    },
  }),
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.2 },
  },
}

export default function CommentSection({ recipeId, userId, isAdmin }: CommentSectionProps) {
  const supabase = useMemo(() => createClient(), [])
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [frameMap, setFrameMap] = useState<Map<string, string>>(new Map())
  const initialLoadDone = useRef(false)

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles!user_id(display_name, avatar_url)')
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('שגיאה בטעינת התגובות')
      return
    }

    setComments((data as Comment[]) || [])
    initialLoadDone.current = true

    const userIds = Array.from(new Set((data || []).map((c: Comment) => c.user_id)))
    const frames = await fetchEquippedFrames(userIds)
    setFrameMap(frames)
  }, [supabase, recipeId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newComment.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)

    const { error } = await supabase
      .from('comments')
      .insert({ content: trimmed, user_id: userId, recipe_id: recipeId })

    if (error) {
      toast.error('שגיאה בהוספת התגובה')
      setSubmitting(false)
      return
    }

    setNewComment('')
    setSubmitting(false)
    // Optimistic: add comment immediately, refresh in background
    fetchComments()
  }

  async function handleDelete(commentId: string) {
    // Optimistic: remove immediately
    setComments(prev => prev.filter(c => c.id !== commentId))

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      toast.error('שגיאה במחיקת התגובה')
      fetchComments() // Revert on error
      return
    }
  }

  return (
    <div dir="rtl" className="flex flex-col gap-4 font-rubik">
      {/* Comments list */}
      <AnimatePresence mode="popLayout">
        {comments.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-gray-400 py-6"
          >
            אין תגובות עדיין — היו הראשונים! 💬
          </motion.p>
        ) : (
          comments.map((comment, i) => (
            <motion.div
              key={comment.id}
              layout
              custom={i}
              variants={commentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-start gap-3 rounded-lg bg-surface-container-lowest p-3 shadow-sm"
            >
              {/* Avatar */}
              <AvatarWithFrame
                userId={comment.user_id}
                avatarUrl={comment.profiles.avatar_url}
                displayName={comment.profiles.display_name}
                frameId={frameMap.get(comment.user_id)}
                size={36}
              />

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{comment.profiles.display_name}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>

              {/* Delete button — only for comment author or admin */}
              {(comment.user_id === userId || isAdmin) && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="shrink-0 cursor-pointer p-2 text-lg text-gray-400 transition-colors hover:text-red-500 active:scale-95"
                aria-label="מחק תגובה"
              >
                🗑️
              </button>
              )}
            </motion.div>
          ))
        )}
      </AnimatePresence>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="הוסיפו תגובה..."
          className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-base outline-none transition-colors focus:border-primary"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-opacity disabled:opacity-40 cursor-pointer active:scale-95"
          aria-label="שלח תגובה"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5 rotate-180"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
