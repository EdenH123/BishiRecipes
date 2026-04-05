'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getUserBadge } from '@/lib/types'
import { getAvatarGradient } from '@/lib/avatar-gradient'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import { motion, AnimatePresence } from 'framer-motion'

type Tab = 'recipes' | 'rated' | 'active'

interface UserWithCount {
  id: string
  display_name: string
  avatar_url: string | null
  count: number
}

interface RatedRecipe {
  recipe_id: string
  title: string
  avg_rating: number
  rating_count: number
  created_by: string
  display_name: string
  avatar_url: string | null
}

const MEDAL = ['🥇', '🥈', '🥉']

const rowVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: i < 3
      ? {
          delay: i * 0.08,
          type: 'spring' as const,
          stiffness: 260,
          damping: 20,
        }
      : {
          delay: i * 0.06,
          type: 'spring' as const,
          stiffness: 300,
          damping: 25,
        },
  }),
}

const top3Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      type: 'spring' as const,
      stiffness: 260,
      damping: 18,
    },
  }),
}

export default function LeaderboardPage() {
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<Tab>('recipes')
  const [loading, setLoading] = useState(true)
  const [mostRecipes, setMostRecipes] = useState<UserWithCount[]>([])
  const [highestRated, setHighestRated] = useState<RatedRecipe[]>([])
  const [mostActive, setMostActive] = useState<UserWithCount[]>([])

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)

      // --- Most Recipes ---
      const { data: recipes } = await supabase
        .from('recipes')
        .select('created_by, profiles!created_by(id, display_name, avatar_url)')

      const recipeCountMap = new Map<string, { id: string; display_name: string; avatar_url: string | null; count: number }>()
      if (recipes) {
        for (const r of recipes) {
          const profile = (r as Record<string, unknown>).profiles as { id: string; display_name: string; avatar_url: string | null } | null
          if (!profile) continue
          const existing = recipeCountMap.get(r.created_by)
          if (existing) {
            existing.count++
          } else {
            recipeCountMap.set(r.created_by, {
              id: profile.id,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              count: 1,
            })
          }
        }
      }
      const sortedRecipes = Array.from(recipeCountMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
      setMostRecipes(sortedRecipes)

      // --- Highest Rated ---
      const { data: ratings } = await supabase
        .from('ratings')
        .select('recipe_id, rating, recipes!recipe_id(title, created_by, profiles!created_by(id, display_name, avatar_url))')

      const ratingMap = new Map<string, { title: string; created_by: string; display_name: string; avatar_url: string | null; total: number; count: number }>()
      if (ratings) {
        for (const rt of ratings) {
          const recipe = (rt as Record<string, unknown>).recipes as { title: string; created_by: string; profiles: { id: string; display_name: string; avatar_url: string | null } } | null
          if (!recipe) continue
          const existing = ratingMap.get(rt.recipe_id)
          if (existing) {
            existing.total += rt.rating
            existing.count++
          } else {
            ratingMap.set(rt.recipe_id, {
              title: recipe.title,
              created_by: recipe.created_by,
              display_name: recipe.profiles?.display_name || '?',
              avatar_url: recipe.profiles?.avatar_url || null,
              total: rt.rating,
              count: 1,
            })
          }
        }
      }
      const sortedRated = Array.from(ratingMap.entries())
        .map(([recipe_id, data]) => ({
          recipe_id,
          title: data.title,
          avg_rating: data.total / data.count,
          rating_count: data.count,
          created_by: data.created_by,
          display_name: data.display_name,
          avatar_url: data.avatar_url,
        }))
        .sort((a, b) => b.avg_rating - a.avg_rating || b.rating_count - a.rating_count)
        .slice(0, 10)
      setHighestRated(sortedRated)

      // --- Most Active (recipes + comments) ---
      const { data: comments } = await supabase
        .from('comments')
        .select('user_id, profiles!user_id(id, display_name, avatar_url)')

      const activityMap = new Map<string, { id: string; display_name: string; avatar_url: string | null; count: number }>()

      // Add recipe counts
      const recipeEntries = Array.from(recipeCountMap.entries())
      for (const [userId, data] of recipeEntries) {
        activityMap.set(userId, { ...data })
      }

      // Add comment counts
      if (comments) {
        for (const c of comments) {
          const profile = (c as Record<string, unknown>).profiles as { id: string; display_name: string; avatar_url: string | null } | null
          if (!profile) continue
          const existing = activityMap.get(c.user_id)
          if (existing) {
            existing.count++
          } else {
            activityMap.set(c.user_id, {
              id: profile.id,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              count: 1,
            })
          }
        }
      }
      const sortedActive = Array.from(activityMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
      setMostActive(sortedActive)

      setLoading(false)
    }

    fetchLeaderboard()
  }, [])

  function renderStars(avg: number) {
    const full = Math.floor(avg)
    const half = avg - full >= 0.5
    const stars: string[] = []
    for (let i = 0; i < full; i++) stars.push('★')
    if (half) stars.push('½')
    return stars.join('')
  }

  function renderAvatar(userId: string, avatarUrl: string | null, displayName: string, size = 'h-10 w-10') {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={displayName}
          className={`${size} rounded-full object-cover`}
        />
      )
    }
    return (
      <div
        className={`${size} flex items-center justify-center rounded-full text-lg font-bold text-white`}
        style={{ background: getAvatarGradient(userId) }}
      >
        {displayName?.charAt(0) || '?'}
      </div>
    )
  }

  function renderBadge(recipeCount: number) {
    const badge = getUserBadge(recipeCount)
    if (!badge) return null
    return (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}>
        {badge.icon} {badge.label}
      </span>
    )
  }

  function getRankStyle(index: number) {
    if (index === 0) return 'bg-amber-50 border-amber-300 border'
    if (index === 1) return 'bg-gray-50 border-gray-300 border'
    if (index === 2) return 'bg-orange-50 border-orange-300 border'
    return 'bg-surface-container-lowest'
  }

  return (
    <motion.div
      dir="rtl"
      className="min-h-screen bg-surface pt-20 pb-28"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-on-surface">לידרבורד 🏆</h1>
          <p className="text-sm text-on-surface-variant mt-1">הטבחים והמתכונים המובילים</p>
          <Link
            href="/taste-map"
            className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            טעם המשפחה 🗺️
          </Link>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center gap-4 sm:gap-8 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`pb-3 text-sm sm:text-base font-rubik transition-colors ${
              activeTab === 'recipes'
                ? 'border-b-2 border-primary font-bold text-primary'
                : 'text-gray-500'
            }`}
          >
            הכי הרבה מתכונים
          </button>
          <button
            onClick={() => setActiveTab('rated')}
            className={`pb-3 text-sm sm:text-base font-rubik transition-colors ${
              activeTab === 'rated'
                ? 'border-b-2 border-primary font-bold text-primary'
                : 'text-gray-500'
            }`}
          >
            הדירוג הגבוה ביותר
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-sm sm:text-base font-rubik transition-colors ${
              activeTab === 'active'
                ? 'border-b-2 border-primary font-bold text-primary'
                : 'text-gray-500'
            }`}
          >
            הכי פעילים
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary-container border-t-transparent" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'recipes' && (
                <div className="space-y-3">
                  {mostRecipes.length === 0 ? (
                    <p className="py-12 text-center text-gray-400">אין נתונים עדיין</p>
                  ) : (
                    mostRecipes.map((user, index) => (
                      <motion.div
                        key={user.id}
                        custom={index}
                        variants={index < 3 ? top3Variants : rowVariants}
                        initial="hidden"
                        animate="visible"
                        className={`flex items-center gap-3 rounded-xl p-3 shadow-sm ${getRankStyle(index)}`}
                      >
                        <span className="text-lg font-bold w-8 text-center shrink-0">
                          {index < 3 ? MEDAL[index] : index + 1}
                        </span>
                        {renderAvatar(user.id, user.avatar_url, user.display_name)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-on-surface">{user.display_name}</span>
                            {renderBadge(user.count)}
                          </div>
                        </div>
                        <span className="text-primary font-bold text-lg shrink-0">{user.count}</span>
                        <span className="text-xs text-on-surface-variant shrink-0">מתכונים</span>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'rated' && (
                <div className="space-y-3">
                  {highestRated.length === 0 ? (
                    <p className="py-12 text-center text-gray-400">אין דירוגים עדיין</p>
                  ) : (
                    highestRated.map((recipe, index) => (
                      <motion.div
                        key={recipe.recipe_id}
                        custom={index}
                        variants={index < 3 ? top3Variants : rowVariants}
                        initial="hidden"
                        animate="visible"
                        className={`flex items-center gap-3 rounded-xl p-3 shadow-sm ${getRankStyle(index)}`}
                      >
                        <span className="text-lg font-bold w-8 text-center shrink-0">
                          {index < 3 ? MEDAL[index] : index + 1}
                        </span>
                        {renderAvatar(recipe.created_by, recipe.avatar_url, recipe.display_name)}
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-on-surface block truncate">{recipe.title}</span>
                          <span className="text-xs text-on-surface-variant">{recipe.display_name}</span>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-amber-500 text-sm">{renderStars(recipe.avg_rating)}</span>
                          <span className="text-primary font-bold mr-1">{recipe.avg_rating.toFixed(1)}</span>
                          <span className="text-[10px] text-on-surface-variant block text-center">({recipe.rating_count})</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'active' && (
                <div className="space-y-3">
                  {mostActive.length === 0 ? (
                    <p className="py-12 text-center text-gray-400">אין נתונים עדיין</p>
                  ) : (
                    mostActive.map((user, index) => (
                      <motion.div
                        key={user.id}
                        custom={index}
                        variants={index < 3 ? top3Variants : rowVariants}
                        initial="hidden"
                        animate="visible"
                        className={`flex items-center gap-3 rounded-xl p-3 shadow-sm ${getRankStyle(index)}`}
                      >
                        <span className="text-lg font-bold w-8 text-center shrink-0">
                          {index < 3 ? MEDAL[index] : index + 1}
                        </span>
                        {renderAvatar(user.id, user.avatar_url, user.display_name)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-on-surface">{user.display_name}</span>
                          </div>
                        </div>
                        <span className="text-primary font-bold text-lg shrink-0">{user.count}</span>
                        <span className="text-xs text-on-surface-variant shrink-0">פעולות</span>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </motion.div>
  )
}
