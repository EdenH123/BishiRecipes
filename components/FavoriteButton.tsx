'use client'

import { useEffect, useState, useCallback } from 'react'
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
    const isHeart = i % 2 === 0
    const size = isHeart ? 10 : 6
    const colors = ['#b41c1b', '#d83730', '#ff6b6b', '#ff8a80']
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
        {isHeart ? (
          <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
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

export default function FavoriteButton({ recipeId, userId }: FavoriteButtonProps) {
  const supabase = createClient()
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
          favorited ? 'text-primary' : 'text-gray-400'
        }`}
        style={{
          fontVariationSettings: favorited
            ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
            : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        }}
      >
        favorite
      </motion.span>
    </motion.button>
  )
}
