'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { type Recipe, parseIngredient, displayIngredient } from '@/lib/types'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import FavoriteButton from '@/components/FavoriteButton'
import CommentSection from '@/components/CommentSection'

function scaleAmount(amount: string, multiplier: number): string {
  if (!amount || multiplier === 1) return amount
  // Try to parse as a number (supports fractions like "1/2")
  let num: number
  if (amount.includes('/')) {
    const [n, d] = amount.split('/')
    num = parseFloat(n) / parseFloat(d)
  } else {
    num = parseFloat(amount)
  }
  if (isNaN(num)) return amount
  const result = num * multiplier
  // Show nice fractions for common values
  if (result === Math.floor(result)) return String(result)
  return result % 1 === 0.5 ? `${result}` : result.toFixed(1).replace(/\.0$/, '')
}

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
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  const [servingsMultiplier, setServingsMultiplier] = useState(1)

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

      setRecipe(recipeRes.data as Recipe)
      const currentUserId = userRes.data.user?.id ?? null
      setUserId(currentUserId)

      if (currentUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUserId)
          .single()
        setIsAdmin(profile?.is_admin ?? false)
      }

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
      <div className="min-h-screen bg-surface pt-20 pb-28">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        </div>
        <BottomNav />
      </div>
    )
  }

  // Error / not found
  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-surface pt-20 pb-28">
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 font-rubik" dir="rtl">
          <p className="text-xl text-gray-600">המתכון לא נמצא 😕</p>
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

      {/* Hero image */}
      <div className="relative w-full max-h-[400px] overflow-hidden rounded-b-2xl bg-secondary-container/30">
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
          <div className="flex h-64 w-full items-center justify-center bg-secondary-container/30 text-7xl">
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

        {/* Description */}
        {recipe.description && (
          <p className="mt-2 text-on-surface-variant leading-relaxed whitespace-pre-line">
            {recipe.description}
          </p>
        )}

        {/* Category + tags */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {recipe.category && (
            <span className="rounded-full bg-tertiary px-3 py-1 text-xs font-medium text-white">
              {recipe.category}
            </span>
          )}
          {recipe.tags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-gray-700 border border-outline-variant"
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
            className="flex items-center gap-1 rounded-lg border border-outline-variant px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            עריכה
          </Link>
          {(userId === recipe.created_by || isAdmin) && (
            <button
              onClick={async () => {
                if (!confirm('למחוק את המתכון?')) return
                const { error } = await supabase
                  .from('recipes')
                  .delete()
                  .eq('id', recipe.id)
                if (error) {
                  toast.error('שגיאה במחיקת המתכון')
                  return
                }
                toast.success('המתכון נמחק')
                router.push('/')
              }}
              className="flex items-center gap-1 rounded-lg border border-error/30 px-4 py-2 text-sm text-error transition-colors hover:bg-error/10"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              מחיקה
            </button>
          )}
        </div>

        {/* Ingredients */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">מצרכים</h2>
            <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-2 py-1">
              <button
                onClick={() => setServingsMultiplier((m) => Math.max(0.5, m - 0.5))}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-base">remove</span>
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-bold">
                x{servingsMultiplier}
              </span>
              <button
                onClick={() => setServingsMultiplier((m) => m + 0.5)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-base">add</span>
              </button>
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {recipe.ingredients.map((raw, i) => {
              const ing = parseIngredient(raw)
              return (
                <li key={i} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checkedIngredients.has(i)}
                    onChange={() => toggleIngredient(i)}
                    className="h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 accent-tertiary"
                  />
                  <span
                    className={`text-sm ${
                      checkedIngredients.has(i) ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}
                  >
                    {ing.amount && (
                      <span className="font-bold">{scaleAmount(ing.amount, servingsMultiplier)} </span>
                    )}
                    {ing.unit && (
                      <span className="text-outline">{ing.unit} </span>
                    )}
                    {ing.name}
                  </span>
                </li>
              )
            })}
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
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-gray-700">{step}</p>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* Video link */}
        {recipe.video_url && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-8"
          >
            <h2 className="text-xl font-bold mb-3">סרטון המתכון</h2>
            <a
              href={recipe.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg bg-surface-container-lowest p-4 border border-outline-variant transition-colors hover:bg-surface-container group"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-2xl">play_circle</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-on-surface">צפו בסרטון</p>
                <p className="text-xs text-outline truncate" dir="ltr">{recipe.video_url}</p>
              </div>
              <span className="material-symbols-outlined text-outline">open_in_new</span>
            </a>
          </motion.section>
        )}

        {/* Comments */}
        {userId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-8 border-t border-outline-variant pt-6"
          >
            <h2 className="mb-4 text-xl font-bold">תגובות</h2>
            <CommentSection recipeId={recipe.id} userId={userId} isAdmin={isAdmin} />
          </motion.div>
        )}
      </motion.div>

      <BottomNav />
    </div>
  )
}
