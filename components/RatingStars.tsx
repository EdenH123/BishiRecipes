'use client'

import { memo, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface RatingStarsProps {
  recipeId: string
  userId: string
}

function RatingStars({ recipeId, userId }: RatingStarsProps) {
  const supabase = useMemo(() => createClient(), [])
  const [myRating, setMyRating] = useState<number>(0)
  const [average, setAverage] = useState<number>(0)
  const [count, setCount] = useState<number>(0)
  const [hover, setHover] = useState<number>(0)
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  const fetchRatings = useCallback(async () => {
    const [myRes, allRes] = await Promise.all([
      supabase
        .from('ratings')
        .select('score')
        .eq('recipe_id', recipeId)
        .eq('user_id', userIdRef.current)
        .maybeSingle(),
      supabase
        .from('ratings')
        .select('score')
        .eq('recipe_id', recipeId),
    ])

    if (myRes.data) setMyRating(myRes.data.score)

    if (allRes.data && allRes.data.length > 0) {
      const total = allRes.data.reduce((sum, r) => sum + r.score, 0)
      setAverage(total / allRes.data.length)
      setCount(allRes.data.length)
    }
  }, [supabase, recipeId])

  useEffect(() => {
    fetchRatings()
  }, [fetchRatings])

  async function handleRate(score: number) {
    const prev = myRating
    setMyRating(score)

    const { error } = await supabase
      .from('ratings')
      .upsert(
        { recipe_id: recipeId, user_id: userId, score },
        { onConflict: 'recipe_id,user_id' }
      )

    if (error) {
      setMyRating(prev)
      toast.error('שגיאה בשמירת הדירוג')
      return
    }

    await fetchRatings()
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex gap-0.5"
        dir="ltr"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = hover ? star <= hover : star <= myRating
          return (
            <button
              key={star}
              type="button"
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHover(star)}
              className="cursor-pointer p-0.5 transition-transform hover:scale-110"
            >
              <span
                className={`material-symbols-outlined text-2xl ${
                  filled ? 'text-amber-400' : 'text-gray-300'
                }`}
                style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                star
              </span>
            </button>
          )
        })}
      </div>
      {count > 0 && (
        <span className="text-sm text-gray-500">
          {average.toFixed(1)} ({count})
        </span>
      )}
    </div>
  )
}

export default memo(RatingStars)
