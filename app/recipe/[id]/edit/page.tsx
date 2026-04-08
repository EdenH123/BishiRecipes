'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Recipe } from '@/lib/types'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import RecipeForm from '@/components/RecipeForm'

export default function EditRecipePage() {
  const params = useParams()
  const supabase = useMemo(() => createClient(), [])
  const id = params.id as string

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    async function load() {
      const [recipeRes, userRes] = await Promise.all([
        supabase
          .from('recipes')
          .select('*, profiles!created_by(id, display_name, avatar_url)')
          .eq('id', id)
          .single(),
        supabase.auth.getUser(),
      ])

      if (recipeRes.error || !recipeRes.data) {
        setError(true)
        setLoading(false)
        return
      }

      const recipeData = recipeRes.data as Recipe
      const currentUserId = userRes.data.user?.id ?? null

      if (!currentUserId) {
        setUnauthorized(true)
        setLoading(false)
        return
      }

      setRecipe(recipeData)
      setLoading(false)
    }

    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface pt-20 pb-28">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        </div>
        <BottomNav />
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-surface pt-20 pb-28">
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 font-rubik" dir="rtl">
          <p className="text-xl text-gray-600">אין לך הרשאה לערוך מתכון זה</p>
          <Link
            href={`/recipe/${id}`}
            className="rounded-lg bg-primary px-6 py-2 text-white transition-opacity hover:opacity-90"
          >
            חזרה למתכון
          </Link>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-surface pt-20 pb-28">
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 font-rubik" dir="rtl">
          <p className="text-xl text-gray-600">המתכון לא נמצא</p>
          <Link
            href="/"
            className="rounded-lg bg-primary px-6 py-2 text-white transition-opacity hover:opacity-90"
          >
            חזרה לדף הבית
          </Link>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface pt-20 pb-28">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-3xl px-4 py-8 font-rubik"
        dir="rtl"
      >
        <h1 className="mb-6 text-3xl font-bold text-primary">עריכת מתכון</h1>
        <Link
          href={`/recipe/${id}`}
          className="mb-6 inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/30 px-3.5 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low font-rubik"
        >
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
          חזרה למתכון
        </Link>
        <RecipeForm recipe={recipe} />
      </motion.div>
      <BottomNav />
    </div>
  )
}
