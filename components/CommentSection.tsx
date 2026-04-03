'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

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

export default function CommentSection({ recipeId, userId, isAdmin }: CommentSectionProps) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
  }, [recipeId])

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
    toast.success('התגובה נוספה')
    await fetchComments()
    setSubmitting(false)
  }

  async function handleDelete(commentId: string) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      toast.error('שגיאה במחיקת התגובה')
      return
    }

    toast.success('התגובה נמחקה')
    await fetchComments()
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
          comments.map((comment) => (
            <motion.div
              key={comment.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 rounded-lg bg-surface-container-lowest p-3 shadow-sm"
            >
              {/* Avatar */}
              {comment.profiles.avatar_url ? (
                <img
                  src={comment.profiles.avatar_url}
                  alt={comment.profiles.display_name}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-sm font-bold text-on-secondary-container">
                  {comment.profiles.display_name?.charAt(0) || '?'}
                </span>
              )}

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
                className="shrink-0 cursor-pointer text-lg text-gray-400 transition-colors hover:text-red-500"
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
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none transition-colors focus:border-primary"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-opacity disabled:opacity-40 cursor-pointer"
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
