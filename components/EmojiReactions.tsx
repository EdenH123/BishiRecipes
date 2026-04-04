'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

const EMOJIS = ['😋', '🔥', '❤️', '👏', '🤤'] as const

interface EmojiReactionsProps {
  recipeId: string
  userId: string
}

export default function EmojiReactions({ recipeId, userId }: EmojiReactionsProps) {
  const supabase = createClient()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set())

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

  return (
    <div className="flex flex-wrap items-center gap-2" dir="ltr">
      {EMOJIS.map((emoji) => {
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
    </div>
  )
}
