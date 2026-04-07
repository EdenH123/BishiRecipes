'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { type Recipe, type Collaborator, type Profile, parseIngredient, displayIngredient } from '@/lib/types'
import { exportRecipeAsImage } from '@/lib/export-recipe'
import { loadShoppingList, saveShoppingList, addIngredientsToList, loadRecipeEntries, saveRecipeEntries, addRecipeEntry } from '@/lib/shopping-list'
import RecipeCard from '@/components/RecipeCard'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import FavoriteButton from '@/components/FavoriteButton'
import CommentSection from '@/components/CommentSection'
import RatingStars from '@/components/RatingStars'
import EmojiReactions from '@/components/EmojiReactions'
import CookingMode from '@/components/CookingMode'
import UnitConverter from '@/components/UnitConverter'
import BackToTop from '@/components/BackToTop'
import ManageCollaborators from '@/components/ManageCollaborators'
import AvatarWithFrame from '@/components/AvatarWithFrame'
import { fetchEquippedFrames } from '@/lib/fetch-frames'

// --- Animation variants ---

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 25 }

const heroImageVariants = {
  hidden: { opacity: 0, scale: 1.05 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const titleDescVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

const ingredientsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.1, staggerChildren: 0.03 },
  },
}

const ingredientItemVariants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: springTransition },
}

const stepsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.15, staggerChildren: 0.04 },
  },
}

const stepItemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: springTransition },
}

const actionButtonsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

const actionButtonItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: springTransition },
}

const ratingVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { ...springTransition, stiffness: 260, damping: 18 } },
}

const tagsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

const tagChipVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: springTransition },
}

const commentsSectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

// --- Helpers ---

const UNICODE_FRACTION_VALUES: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1/3, '⅔': 2/3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}

const VALUE_TO_UNICODE: [number, string][] = [
  [0.125, '⅛'], [0.25, '¼'], [1/3, '⅓'], [0.375, '⅜'],
  [0.5, '½'], [0.625, '⅝'], [2/3, '⅔'], [0.75, '¾'], [0.875, '⅞'],
]

function parseAmount(amount: string): number {
  let str = amount.trim()
  let total = 0
  // Extract leading whole number
  const wholeMatch = str.match(/^(\d+)/)
  if (wholeMatch) {
    total += parseFloat(wholeMatch[1])
    str = str.slice(wholeMatch[0].length).trim()
  }
  // Check for Unicode fraction
  for (const [char, val] of Object.entries(UNICODE_FRACTION_VALUES)) {
    if (str.includes(char)) return total + val
  }
  // Check for slash fraction like "1/2"
  const fracMatch = str.match(/(\d+)\s*\/\s*(\d+)/)
  if (fracMatch) return total + parseFloat(fracMatch[1]) / parseFloat(fracMatch[2])
  // Plain number
  if (!wholeMatch) {
    const n = parseFloat(str)
    return isNaN(n) ? NaN : n
  }
  return total
}

function formatNumber(n: number): string {
  const whole = Math.floor(n)
  const frac = n - whole
  // Find closest unicode fraction (within tolerance)
  for (const [val, char] of VALUE_TO_UNICODE) {
    if (Math.abs(frac - val) < 0.01) {
      return whole > 0 ? `${whole}${char}` : char
    }
  }
  if (frac === 0) return String(whole)
  return n % 1 === 0 ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

function scaleAmount(amount: string, multiplier: number): string {
  if (!amount) return amount
  const num = parseAmount(amount)
  if (isNaN(num)) return amount
  if (multiplier === 1) return formatNumber(num)
  return formatNumber(num * multiplier)
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
  const supabase = useMemo(() => createClient(), [])
  const id = params.id as string

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  const [servingsMultiplier, setServingsMultiplier] = useState(1)
  const [cookingMode, setCookingMode] = useState(false)
  const [relatedRecipes, setRelatedRecipes] = useState<Recipe[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isCollaborator, setIsCollaborator] = useState(false)
  const [shareSheetOpen, setShareSheetOpen] = useState(false)
  const [frameMap, setFrameMap] = useState<Map<string, string>>(new Map())
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
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
      setRecipe(recipeData)
      document.title = `${recipeData.title} — בישי מתכונים`
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

      // Fetch collaborators
      const { data: collabData } = await supabase
        .from('recipe_collaborators')
        .select('user_id, profiles!user_id(display_name, avatar_url)')
        .eq('recipe_id', id)
      const collabs = (collabData ?? []) as unknown as Collaborator[]
      setCollaborators(collabs)
      if (currentUserId) {
        setIsCollaborator(collabs.some((c) => c.user_id === currentUserId))
      }

      // Fetch equipped frames for collaborators
      if (collabs.length > 0) {
        const collabUserIds = collabs.map((c) => c.user_id)
        const frames = await fetchEquippedFrames(collabUserIds)
        setFrameMap(frames)
      }

      setLoading(false)

      // Fetch related recipes — score by category, tags, ingredients, author & popularity
      if (recipeRes.data) {
        const r = recipeRes.data
        const currentIngredients = (r.ingredients || []).map((raw: string) => {
          try {
            const parsed = JSON.parse(raw)
            return (parsed.name || '').trim().toLowerCase()
          } catch { return raw.trim().toLowerCase() }
        }).filter(Boolean)

        const [candidatesRes, ratingsRes, favoritesRes] = await Promise.all([
          supabase
            .from('recipes')
            .select('*, profiles!created_by(id, display_name, avatar_url)')
            .neq('id', id)
            .limit(50),
          supabase
            .from('ratings')
            .select('recipe_id, score'),
          supabase
            .from('favorites')
            .select('recipe_id'),
        ])

        if (candidatesRes.data) {
          // Build popularity maps
          const avgRatings = new Map<string, number>()
          const favCounts = new Map<string, number>()
          if (ratingsRes.data) {
            const sums = new Map<string, { total: number; count: number }>()
            for (const rt of ratingsRes.data) {
              const prev = sums.get(rt.recipe_id) || { total: 0, count: 0 }
              sums.set(rt.recipe_id, { total: prev.total + rt.score, count: prev.count + 1 })
            }
            Array.from(sums.entries()).forEach(([rid, { total, count }]) => avgRatings.set(rid, total / count))
          }
          if (favoritesRes.data) {
            for (const fv of favoritesRes.data) {
              favCounts.set(fv.recipe_id, (favCounts.get(fv.recipe_id) || 0) + 1)
            }
          }

          const scored = candidatesRes.data.map((c) => {
            let score = 0

            // Category match
            if (r.category && c.category === r.category) score += 3

            // Tag overlap
            if (r.tags && c.tags) {
              for (const t of r.tags) {
                if (c.tags.includes(t)) score += 2
              }
            }

            // Ingredient overlap
            if (currentIngredients.length > 0 && c.ingredients) {
              const cIngredients = (c.ingredients as string[]).map((raw: string) => {
                try {
                  const parsed = JSON.parse(raw)
                  return (parsed.name || '').trim().toLowerCase()
                } catch { return raw.trim().toLowerCase() }
              }).filter(Boolean)

              let ingredientOverlap = 0
              for (const ing of currentIngredients) {
                if (cIngredients.some((ci: string) => ci.includes(ing) || ing.includes(ci))) {
                  ingredientOverlap++
                }
              }
              score += (ingredientOverlap / currentIngredients.length) * 3
            }

            // Same author bonus
            if (c.created_by === r.created_by) score += 1

            // Popularity bonus
            const rating = avgRatings.get(c.id) || 0
            const favs = favCounts.get(c.id) || 0
            score += Math.min(rating / 5, 1) * 0.5
            score += Math.min(favs / 10, 1) * 0.5

            return { recipe: c as Recipe, score }
          })

          const related = scored
            .filter((s) => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map((s) => s.recipe)
          setRelatedRecipes(related)
        }
      }
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
      <motion.div
        variants={heroImageVariants}
        initial="hidden"
        animate="visible"
        className="relative w-full max-h-[250px] sm:max-h-[400px] overflow-hidden rounded-b-2xl bg-secondary-container/30"
      >
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            width={1200}
            height={400}
            className="h-full max-h-[250px] sm:max-h-[400px] w-full object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        ) : (
          <div className="flex h-64 w-full items-center justify-center bg-secondary-container/30">
            <Image src="/logo.png" alt="BISHILicious" width={100} height={100} className="rounded-full opacity-40" />
          </div>
        )}
      </motion.div>

      {/* Content */}
      <div
        className="mx-auto max-w-3xl px-4 py-6 font-rubik"
        dir="rtl"
      >
        {/* Title */}
        <motion.h1
          variants={titleDescVariants}
          initial="hidden"
          animate="visible"
          className="text-3xl font-bold"
        >
          {recipe.title}
        </motion.h1>

        {/* Description */}
        {recipe.description && (
          <motion.p
            variants={titleDescVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.05 }}
            className="mt-2 text-on-surface-variant leading-relaxed whitespace-pre-line"
          >
            {recipe.description}
          </motion.p>
        )}

        {/* Category + tags */}
        <motion.div
          variants={tagsContainerVariants}
          initial="hidden"
          animate="visible"
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          {recipe.category && (
            <motion.span
              variants={tagChipVariants}
              className="rounded-full bg-tertiary px-3 py-1 text-xs font-medium text-white"
            >
              {recipe.category}
            </motion.span>
          )}
          {recipe.tags?.map((tag) => (
            <motion.span
              key={tag}
              variants={tagChipVariants}
              className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-gray-700 border border-outline-variant"
            >
              {tag}
            </motion.span>
          ))}
        </motion.div>

        {/* Prep time + Author + date */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          {recipe.prep_time && (
            <span className="flex items-center gap-1 bg-surface-container rounded-full px-3 py-1 font-medium text-on-surface">
              <span className="material-symbols-outlined text-base text-primary">schedule</span>
              {recipe.prep_time} דקות
            </span>
          )}
          <span>הוסיף/ה: {recipe.profiles?.display_name ?? 'משתמש/ת'} · {formatDate(recipe.created_at)}</span>
        </div>

        {/* Collaborators */}
        {collaborators.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>שותפים:</span>
            {collaborators.map((c) => (
              <span key={c.user_id} className="flex items-center gap-1">
                <AvatarWithFrame userId={c.user_id} avatarUrl={c.profiles?.avatar_url} displayName={c.profiles?.display_name} frameId={frameMap.get(c.user_id)} size={20} />
                <span>{c.profiles?.display_name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Rating */}
        {userId && (
          <motion.div
            variants={ratingVariants}
            initial="hidden"
            animate="visible"
            className="mt-4"
          >
            <RatingStars recipeId={recipe.id} userId={userId} />
          </motion.div>
        )}

        {/* Emoji Reactions */}
        {userId && (
          <div className="mt-3">
            <EmojiReactions recipeId={recipe.id} userId={userId} />
          </div>
        )}

        {/* Action buttons */}
        <motion.div
          variants={actionButtonsContainerVariants}
          initial="hidden"
          animate="visible"
          className="mt-4 flex items-center gap-2"
        >
          {userId && (
            <motion.div variants={actionButtonItemVariants}>
              <FavoriteButton recipeId={recipe.id} userId={userId} />
            </motion.div>
          )}
          <motion.button
            variants={actionButtonItemVariants}
            onClick={() => setCookingMode(true)}
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant px-3.5 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">skillet</span>
          </motion.button>
          <motion.button
            variants={actionButtonItemVariants}
            onClick={() => setShareSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant px-3.5 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">share</span>
          </motion.button>
          <motion.button
            variants={actionButtonItemVariants}
            onClick={() => {
              const current = loadShoppingList()
              const updated = addIngredientsToList(
                current,
                recipe.ingredients || [],
                recipe.id,
                recipe.title,
                servingsMultiplier,
              )
              saveShoppingList(updated)
              const entries = loadRecipeEntries()
              saveRecipeEntries(addRecipeEntry(entries, recipe.id, recipe.title, servingsMultiplier))
              toast.success(
                servingsMultiplier !== 1
                  ? `המצרכים נוספו (x${servingsMultiplier}) לרשימת הקניות`
                  : 'המצרכים נוספו לרשימת הקניות'
              )
            }}
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant px-3.5 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95"
            aria-label="הוסף לרשימת קניות"
          >
            <span className="material-symbols-outlined text-lg">shopping_cart</span>
          </motion.button>
          {userId && (
            <motion.div variants={actionButtonItemVariants}>
              <Link
                href={`/recipe/${recipe.id}/edit`}
                className="flex items-center gap-1.5 rounded-xl border border-outline-variant px-3.5 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </Link>
            </motion.div>
          )}
          {(userId === recipe.created_by || isAdmin) && (
            <motion.button
              variants={actionButtonItemVariants}
              onClick={() => {
                if (!confirm('למחוק את המתכון?')) return
                const recipeId = recipe.id
                router.push('/')
                const timeoutId = setTimeout(async () => {
                  deleteTimeoutRef.current = null
                  const { error } = await supabase
                    .from('recipes')
                    .delete()
                    .eq('id', recipeId)
                  if (error) {
                    toast.error('שגיאה במחיקת המתכון')
                  }
                }, 5000)
                deleteTimeoutRef.current = timeoutId
                toast('המתכון נמחק', {
                  duration: 5000,
                  action: {
                    label: 'ביטול',
                    onClick: () => {
                      if (deleteTimeoutRef.current) {
                        clearTimeout(deleteTimeoutRef.current)
                        deleteTimeoutRef.current = null
                      }
                      router.push(`/recipe/${recipeId}`)
                    },
                  },
                })
              }}
              className="flex items-center gap-1.5 rounded-xl border border-error/30 px-3.5 py-2.5 text-sm text-error transition-colors hover:bg-error/5 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </motion.button>
          )}
        </motion.div>

        {/* Share bottom sheet */}
        <AnimatePresence>
          {shareSheetOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShareSheetOpen(false)}
                className="fixed inset-0 bg-black/40 z-[60]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-2xl bg-surface p-5 pb-20 shadow-xl"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline-variant/40" />
                <h3 className="text-center font-bold text-on-surface font-rubik mb-5">שיתוף</h3>
                <div className="flex justify-center gap-6">
                  <button
                    onClick={() => {
                      const url = window.location.href
                      const text = `${recipe.title} — BISHILicious`
                      window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank')
                      setShareSheetOpen(false)
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366]/10">
                      <svg className="h-6 w-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.632-1.467A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.168 0-4.19-.587-5.932-1.61l-.425-.253-2.746.87.879-2.672-.278-.442A9.776 9.776 0 012.182 12c0-5.414 4.404-9.818 9.818-9.818S21.818 6.586 21.818 12s-4.404 9.818-9.818 9.818z"/></svg>
                    </div>
                    <span className="text-xs font-rubik text-on-surface-variant">WhatsApp</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(window.location.href)
                        toast.success('הקישור הועתק!')
                      } catch {
                        toast.error('לא ניתן להעתיק')
                      }
                      setShareSheetOpen(false)
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low">
                      <span className="material-symbols-outlined text-xl text-on-surface-variant">content_copy</span>
                    </div>
                    <span className="text-xs font-rubik text-on-surface-variant">העתק קישור</span>
                  </button>
                  <button
                    onClick={() => {
                      exportRecipeAsImage(recipe)
                      setShareSheetOpen(false)
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low">
                      <span className="material-symbols-outlined text-xl text-on-surface-variant">download</span>
                    </div>
                    <span className="text-xs font-rubik text-on-surface-variant">ייצוא תמונה</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Manage collaborators (owner only) */}
        {userId === recipe.created_by && (
          <ManageCollaborators
            recipeId={recipe.id}
            ownerId={recipe.created_by}
            collaborators={collaborators}
            onUpdate={(updated) => {
              setCollaborators(updated)
              setIsCollaborator(updated.some((c) => c.user_id === userId))
            }}
          />
        )}

        {/* Ingredients */}
        <motion.section
          variants={ingredientsContainerVariants}
          initial="hidden"
          animate="visible"
          className="mt-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">מצרכים</h2>
            <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-2 py-1">
              <button
                onClick={() => setServingsMultiplier((m) => Math.max(0.5, m - 0.5))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-base">remove</span>
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-bold">
                x{servingsMultiplier}
              </span>
              <button
                onClick={() => setServingsMultiplier((m) => m + 0.5)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-base">add</span>
              </button>
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {recipe.ingredients.map((raw, i) => {
              const ing = parseIngredient(raw)
              return (
                <motion.li key={i} variants={ingredientItemVariants} className="flex items-center gap-3">
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
                      <span className="font-bold inline-block" dir="ltr">{scaleAmount(ing.amount, servingsMultiplier)}</span>
                    )}
                    {ing.amount && ' '}
                    {ing.unit && (
                      <span className="text-outline">{ing.unit} </span>
                    )}
                    {ing.name}
                  </span>
                </motion.li>
              )
            })}
          </ul>
        </motion.section>

        {/* Unit converter */}
        <div className="mt-4">
          <UnitConverter />
        </div>

        {/* Steps */}
        <motion.section
          variants={stepsContainerVariants}
          initial="hidden"
          animate="visible"
          className="mt-8"
        >
          <h2 className="text-xl font-bold">שלבי הכנה</h2>
          <ol className="mt-3 flex flex-col gap-4">
            {recipe.steps.map((step, i) => (
              <motion.li key={i} variants={stepItemVariants} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-gray-700">{step}</p>
              </motion.li>
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

        {/* Related recipes */}
        {relatedRecipes.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-8 border-t border-outline-variant pt-6"
          >
            <h2 className="text-xl font-bold mb-4">מתכונים דומים</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {relatedRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Comments */}
        {userId && (
          <motion.div
            variants={commentsSectionVariants}
            initial="hidden"
            animate="visible"
            className="mt-8 border-t border-outline-variant pt-6"
          >
            <h2 className="mb-4 text-xl font-bold">תגובות</h2>
            <CommentSection recipeId={recipe.id} userId={userId} isAdmin={isAdmin} />
          </motion.div>
        )}
      </div>

      <BackToTop />
      <BottomNav />

      {/* Cooking mode overlay */}
      <AnimatePresence>
        {cookingMode && (
          <CookingMode
            steps={recipe.steps}
            title={recipe.title}
            onClose={() => setCookingMode(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
