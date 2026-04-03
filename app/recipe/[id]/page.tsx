'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Recipe } from '@/lib/types'
import Navbar from '@/components/Navbar'
import FavoriteButton from '@/components/FavoriteButton'
import CommentSection from '@/components/CommentSection'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export default function RecipeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const id = params.id as string

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function load() {
      const [recipeRes, userRes] = await Promise.all([
        supabase
          .from('recipes')
          .select('*, profiles(id, display_name, avatar_url)')
          .eq('id', id)
          .single(),
        supabase.auth.getUser(),
      ])

      if (recipeRes.error || !recipeRes.data) {
        setError(true)
        setLoading(false)
        return
      }

      setRecipe(recipeRes.data as Recipe)
      setUserId(userRes.data.user?.id ?? null)
      setLoading(false)
    }

    load()
  }, [id])

  function toggleIngredient(index: number) {
    setCheckedIngredients((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#E8433A]" />
        </div>
      </>
    )
  }

  // Error / not found
  if (error || !recipe) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 font-rubik" dir="rtl">
          <p className="text-xl text-gray-600">המתכון לא נמצא 😕</p>
          <Link
            href="/"
            className="rounded-lg bg-[#E8433A] px-6 py-2 text-white transition-opacity hover:opacity-90"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />

      {/* Hero image */}
      <div className="relative w-full max-h-[400px] overflow-hidden rounded-b-2xl bg-[#F5A623]/20">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            width={1200}
            height={400}
            className="h-full max-h-[400px] w-full object-cover"
            priority
          />
        ) : (
          <div className="flex h-64 w-full items-center justify-center bg-[#F5A623]/20 text-7xl">
            🍽️
          </div>
        )}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-3xl px-4 py-6 font-rubik"
        dir="rtl"
      >
        {/* Title */}
        <h1 className="text-3xl font-bold">{recipe.title}</h1>

        {/* Category + tags */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {recipe.category && (
            <span className="rounded-full bg-[#4CAF7D] px-3 py-1 text-xs font-medium text-white">
              {recipe.category}
            </span>
          )}
          {recipe.tags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#FFFBF5] px-3 py-1 text-xs font-medium text-gray-700 border border-gray-200"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Author + date */}
        <p className="mt-3 text-sm text-gray-500">
          הוסיף/ה: {recipe.profiles?.display_name ?? 'משתמש/ת'} · {formatDate(recipe.created_at)}
        </p>

        {/* Action buttons */}
        <div className="mt-4 flex items-center gap-4">
          {userId && <FavoriteButton recipeId={recipe.id} userId={userId} />}
          <Link
            href={`/recipe/${recipe.id}/edit`}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            ✏️ עריכה
          </Link>
        </div>

        {/* Ingredients */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-8"
        >
          <h2 className="text-xl font-bold">מצרכים</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {recipe.ingredients.map((ingredient, i) => (
              <li key={i} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checkedIngredients.has(i)}
                  onChange={() => toggleIngredient(i)}
                  className="h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 accent-[#4CAF7D]"
                />
                <span
                  className={`text-sm ${
                    checkedIngredients.has(i) ? 'text-gray-400 line-through' : 'text-gray-700'
                  }`}
                >
                  {ingredient}
                </span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Steps */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-8"
        >
          <h2 className="text-xl font-bold">שלבי הכנה</h2>
          <ol className="mt-3 flex flex-col gap-4">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8433A] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-gray-700">{step}</p>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* Comments */}
        {userId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-8 border-t border-gray-200 pt-6"
          >
            <h2 className="mb-4 text-xl font-bold">תגובות</h2>
            <CommentSection recipeId={recipe.id} userId={userId} />
          </motion.div>
        )}
      </motion.div>
    </>
  )
}
