'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import type { Recipe } from '@/lib/types'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import PageTransition from '@/components/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'

interface GroupedRecipes {
  key: string
  label: string
  recipes: Recipe[]
}

function formatHebrewDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function relativeDay(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'היום'
  if (diff === 1) return 'אתמול'
  if (diff < 7) return `לפני ${diff} ימים`
  return ''
}

function groupByMonth(recipes: Recipe[]): GroupedRecipes[] {
  const groups = new Map<string, Recipe[]>()

  for (const recipe of recipes) {
    const d = new Date(recipe.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(recipe)
  }

  const result: GroupedRecipes[] = []
  const sortedKeys = Array.from(groups.keys()).sort().reverse()
  for (const key of sortedKeys) {
    const recs = groups.get(key)!
    const d = new Date(recs[0].created_at)
    const label = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
    result.push({ key, label, recipes: recs })
  }
  return result
}

// Category emoji map
const CAT_EMOJI: Record<string, string> = {
  'ארוחת בוקר': '🌅', 'ארוחת צהריים': '🍽️', 'ארוחת ערב': '🌙',
  'קינוח': '🍰', 'חטיף': '🥨', 'מרק': '🍲',
  'סלט': '🥗', 'לחם ואפייה': '🍞', 'שתייה': '🥤',
}

export default function TimelinePage() {
  const supabase = useMemo(() => createClient(), [])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('recipes')
        .select('*, profiles!created_by(id, display_name, avatar_url)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (data) setRecipes(data as Recipe[])
      setLoading(false)
    }
    load()
  }, [supabase])

  const grouped = useMemo(() => groupByMonth(recipes), [recipes])

  // Auto-expand first month
  useEffect(() => {
    if (grouped.length > 0 && expandedMonth === null) {
      setExpandedMonth(grouped[0].key)
    }
  }, [grouped, expandedMonth])

  return (
    <div dir="rtl" className="min-h-screen bg-surface pt-20 pb-28">
      <Navbar />
      <PageTransition>
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-3"
            >
              <span className="material-symbols-outlined text-primary text-3xl">timeline</span>
            </motion.div>
            <h1 className="text-2xl font-bold text-on-surface">ציר זמן</h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-on-surface-variant mt-1"
            >
              {recipes.length > 0 ? `${recipes.length} מתכונים לאורך הזמן` : 'כל המתכונים לפי תאריך'}
            </motion.p>
          </motion.div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full animate-shimmer bg-gradient-to-r from-surface-container-high via-surface-container-low to-surface-container-high bg-[length:200%_100%]" />
                    <div className="h-5 w-28 rounded-lg animate-shimmer bg-gradient-to-r from-surface-container-high via-surface-container-low to-surface-container-high bg-[length:200%_100%]" />
                  </div>
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="mr-14 h-20 rounded-2xl animate-shimmer bg-gradient-to-r from-surface-container-high via-surface-container-low to-surface-container-high bg-[length:200%_100%]" />
                  ))}
                </motion.div>
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-16 text-center"
            >
              <span className="material-symbols-outlined text-6xl text-outline/30">restaurant_menu</span>
              <p className="text-lg text-on-surface-variant">עדיין אין מתכונים</p>
            </motion.div>
          ) : (
            <div className="relative">
              {/* Timeline line - animated gradient */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: '100%' }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute right-[21px] top-0 w-0.5 bg-gradient-to-b from-primary via-primary/40 to-outline-variant/20"
              />

              {grouped.map((group, groupIdx) => {
                const isExpanded = expandedMonth === group.key

                return (
                  <motion.div
                    key={group.key}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ delay: groupIdx * 0.08, type: 'spring', stiffness: 200, damping: 25 }}
                    className="mb-6"
                  >
                    {/* Month header - clickable */}
                    <button
                      onClick={() => setExpandedMonth(isExpanded ? null : group.key)}
                      className="relative flex items-center gap-3 mb-3 w-full group"
                    >
                      {/* Dot on timeline */}
                      <motion.div
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className="relative z-10 h-11 w-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25 shrink-0"
                      >
                        <span className="material-symbols-outlined text-on-primary text-lg">
                          {isExpanded ? 'expand_less' : 'calendar_month'}
                        </span>
                      </motion.div>

                      <div className="flex items-center gap-2 flex-1">
                        <h2 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                          {group.label}
                        </h2>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                          {group.recipes.length}
                        </span>
                      </div>

                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="material-symbols-outlined text-on-surface-variant text-lg"
                      >
                        expand_more
                      </motion.span>
                    </button>

                    {/* Recipes in this month - animated expand/collapse */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: 'easeInOut' }}
                          className="overflow-hidden pr-[54px]"
                        >
                          <div className="space-y-2 pb-2">
                            {group.recipes.map((recipe, i) => {
                              const rel = relativeDay(recipe.created_at)
                              return (
                                <motion.div
                                  key={recipe.id}
                                  initial={{ opacity: 0, x: 30, scale: 0.95 }}
                                  animate={{ opacity: 1, x: 0, scale: 1 }}
                                  transition={{
                                    delay: i * 0.05,
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 25,
                                  }}
                                  onHoverStart={() => setHoveredId(recipe.id)}
                                  onHoverEnd={() => setHoveredId(null)}
                                >
                                  <Link
                                    href={`/recipe/${recipe.id}`}
                                    className="block rounded-2xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                                  >
                                    <div className="flex items-center gap-3 p-3">
                                      {/* Recipe image */}
                                      <motion.div
                                        animate={{ scale: hoveredId === recipe.id ? 1.05 : 1 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                        className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-surface-container-high"
                                      >
                                        {recipe.image_url ? (
                                          <Image
                                            src={recipe.image_url}
                                            alt={recipe.title}
                                            fill
                                            loading="lazy"
                                            className="object-cover"
                                            sizes="56px"
                                          />
                                        ) : (
                                          <div className="flex items-center justify-center h-full">
                                            <span className="material-symbols-outlined text-outline/40 text-xl">restaurant</span>
                                          </div>
                                        )}
                                      </motion.div>

                                      {/* Info */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-on-surface truncate">{recipe.title}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          {recipe.profiles?.avatar_url ? (
                                            <img src={recipe.profiles.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                                          ) : (
                                            <div className="h-4 w-4 rounded-full bg-surface-container-high flex items-center justify-center">
                                              <span className="text-[8px] font-bold text-on-surface-variant">
                                                {recipe.profiles?.display_name?.charAt(0)}
                                              </span>
                                            </div>
                                          )}
                                          <p className="text-xs text-on-surface-variant truncate">
                                            {recipe.profiles?.display_name}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[11px] text-outline">
                                            {formatHebrewDate(recipe.created_at)}
                                          </span>
                                          {rel && (
                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                                              {rel}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Category */}
                                      {recipe.category && (
                                        <div className="shrink-0 flex flex-col items-center gap-0.5">
                                          <span className="text-lg">{CAT_EMOJI[recipe.category] || '🍴'}</span>
                                          <span className="text-[9px] text-outline">{recipe.category}</span>
                                        </div>
                                      )}
                                    </div>
                                  </Link>
                                </motion.div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}

              {/* Bottom cap */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="relative flex items-center gap-3"
              >
                <div className="relative z-10 h-11 w-11 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-outline text-lg">flag</span>
                </div>
                <p className="text-sm text-outline">ההתחלה של הכל</p>
              </motion.div>
            </div>
          )}
        </div>
      </PageTransition>
      <BottomNav />
    </div>
  )
}
