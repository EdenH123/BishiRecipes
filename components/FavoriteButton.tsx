'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface FavoriteButtonProps {
  recipeId: string
  userId: string
}

export default function FavoriteButton({ recipeId, userId }: FavoriteButtonProps) {
  const supabase = createClient()
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(true)

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

  async function toggleFavorite() {
    if (loading) return
    setLoading(true)

    if (favorited) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipeId)

      if (error) {
        toast.error('שגיאה בהסרה מהמועדפים')
        setLoading(false)
        return
      }

      setFavorited(false)
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, recipe_id: recipeId })

      if (error) {
        toast.error('שגיאה בהוספה למועדפים')
        setLoading(false)
        return
      }

      setFavorited(true)
    }

    setLoading(false)
  }

  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={toggleFavorite}
      disabled={loading}
      className="cursor-pointer text-2xl leading-none"
      aria-label={favorited ? 'הסר ממועדפים' : 'הוסף למועדפים'}
    >
      {favorited ? (
        <span className="text-secondary-container">⭐</span>
      ) : (
        <span className="text-gray-400">☆</span>
      )}
    </motion.button>
  )
}
