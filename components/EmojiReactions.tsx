'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

const EMOJI_PICKER_OPTIONS = [
  '😋', '🔥', '❤️', '👏', '🤤',
  '😍', '🥰', '😎', '🤩', '🥳',
  '🍕', '🍔', '🌮', '🍰', '🍩',
  '🎉', '💯', '✨', '🙌', '👌',
  '😜', '🤗', '💪', '🫶', '👑',
]

interface EmojiReactionsProps {
  recipeId: string
  userId: string
}

export default function EmojiReactions({ recipeId, userId }: EmojiReactionsProps) {
  const supabase = createClient()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const fetchReactions = useCallback(async () => {
    const [allRes, myRes] = await Promise.all([
      supabase
        .from('reactions')
        .select('emoji')
        .eq('recipe_id', recipeId),
      supabase
        .from('reactions')
        .select('emoji')
        .eq('recipe_id', recipeId)
        .eq('user_id', userId),
    ])

    if (allRes.data) {
      const c: Record<string, number> = {}
      for (const row of allRes.data) {
        c[row.emoji] = (c[row.emoji] || 0) + 1
      }
      setCounts(c)
    }

    if (myRes.data) {
      setMyReactions(new Set(myRes.data.map((r) => r.emoji)))
    }
  }, [recipeId, userId])

  useEffect(() => {
    fetchReactions()
  }, [fetchReactions])

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    if (pickerOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [pickerOpen])

  async function toggle(emoji: string) {
    const active = myReactions.has(emoji)

    // Optimistic update
    const prevCounts = { ...counts }
    const prevMy = new Set(myReactions)

    if (active) {
      myReactions.delete(emoji)
      setMyReactions(new Set(myReactions))
      setCounts((c) => ({ ...c, [emoji]: Math.max((c[emoji] || 1) - 1, 0) }))
    } else {
      myReactions.add(emoji)
      setMyReactions(new Set(myReactions))
      setCounts((c) => ({ ...c, [emoji]: (c[emoji] || 0) + 1 }))
    }

    // Persist
    const { error } = active
      ? await supabase
          .from('reactions')
          .delete()
          .eq('recipe_id', recipeId)
          .eq('user_id', userId)
          .eq('emoji', emoji)
      : await supabase
          .from('reactions')
          .insert({ recipe_id: recipeId, user_id: userId, emoji })

    if (error) {
      setCounts(prevCounts)
      setMyReactions(prevMy)
      toast.error('שגיאה בשמירת התגובה')
    }
  }

  // Only show emojis that have at least one reaction
  const visibleEmojis = Object.keys(counts).filter((e) => (counts[e] || 0) > 0)

  return (
    <div className="flex flex-wrap items-center gap-2" dir="ltr">
      {visibleEmojis.map((emoji) => {
        const active = myReactions.has(emoji)
        const count = counts[emoji] || 0
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors ${
              active
                ? 'bg-primary/15 ring-1 ring-primary/40'
                : 'bg-surface-container-low hover:bg-surface-container'
            }`}
          >
            <span className="text-base">{emoji}</span>
            {count > 0 && (
              <span className={`text-xs font-medium ${active ? 'text-primary' : 'text-gray-500'}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}

      {/* Add emoji button + picker */}
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface-variant"
          aria-label="Add emoji"
        >
          <span className="material-symbols-outlined text-lg">add_reaction</span>
        </button>

        {pickerOpen && (
          <div className="absolute bottom-full mb-2 left-0 z-50 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-lg p-2 w-[220px]">
            <div className="grid grid-cols-5 gap-1">
              {EMOJI_PICKER_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    toggle(emoji)
                    setPickerOpen(false)
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-surface-container ${
                    myReactions.has(emoji) ? 'bg-primary/15' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
