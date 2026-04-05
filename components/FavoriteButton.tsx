'use client'

import { memo, useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface FavoriteButtonProps {
  recipeId: string
  userId: string
}

const PARTICLE_COUNT = 8

function BurstParticles() {
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * 360
    const rad = (angle * Math.PI) / 180
    const distance = 18 + Math.random() * 8
    const x = Math.cos(rad) * distance
    const y = Math.sin(rad) * distance
    const isStar = i % 2 === 0
    const size = isStar ? 10 : 6
    const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a']
    const color = colors[i % colors.length]

    return (
      <motion.span
        key={i}
        initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        animate={{ opacity: 0, x, y, scale: 0.2 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          marginLeft: -size / 2,
          marginTop: -size / 2,
          width: size,
          height: size,
          color,
        }}
      >
        {isStar ? (
          <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ) : (
          <span
            style={{
              display: 'block',
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: color,
            }}
          />
        )}
      </motion.span>
    )
  })

  return <>{particles}</>
}

function FavoriteButton({ recipeId, userId }: FavoriteButtonProps) {
  const supabase = useMemo(() => createClient(), [])
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showBurst, setShowBurst] = useState(false)

  useEffect(() => {
    async function checkFavorite() {
      const { data, error } = await supabase
        .from('favorites')
        .select()
        .eq('user_id', userId)
        .eq('recipe_id', recipeId)
        .single()

      if (data) setFavorited(true)
      setLoading(false)
    }

    checkFavorite()
  }, [recipeId, userId])

  const toggleFavorite = useCallback(async () => {
    if (loading) return

    // Optimistic update
    const wasFavorited = favorited
    setFavorited(!wasFavorited)

    if (wasFavorited) {
      // Unfavoriting
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipeId)

      if (error) {
        toast.error('שגיאה בהסרה מהמועדפים')
        setFavorited(true) // revert
        return
      }
    } else {
      // Favoriting - trigger burst
      setShowBurst(true)
      setTimeout(() => setShowBurst(false), 600)

      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, recipe_id: recipeId })

      if (error) {
        toast.error('שגיאה בהוספה למועדפים')
        setFavorited(false) // revert
        setShowBurst(false)
        return
      }
    }
  }, [loading, favorited, recipeId, userId, supabase])

  return (
    <motion.button
      onClick={toggleFavorite}
      disabled={loading}
      className="relative cursor-pointer text-2xl leading-none active:scale-95"
      aria-label={favorited ? 'הסר ממועדפים' : 'הוסף למועדפים'}
    >
      {/* Burst particles */}
      <AnimatePresence>
        {showBurst && <BurstParticles />}
      </AnimatePresence>

      {/* Heart icon */}
      <motion.span
        key={favorited ? 'filled' : 'outline'}
        initial={false}
        animate={
          favorited
            ? { scale: [1, 1.3, 1], transition: { type: 'spring', stiffness: 400, damping: 10 } }
            : { scale: [1, 0.8, 1], transition: { duration: 0.25, ease: 'easeInOut' } }
        }
        className={`material-symbols-outlined select-none ${
          favorited ? 'text-amber-500' : 'text-gray-400'
        }`}
        style={{
          fontVariationSettings: favorited
            ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
            : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        }}
      >
        star
      </motion.span>
    </motion.button>
  )
}

export default memo(FavoriteButton)
