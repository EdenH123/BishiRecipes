'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import type { Recipe } from '@/lib/types'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import PageTransition from '@/components/PageTransition'
import { motion } from 'framer-motion'

interface GroupedRecipes {
  label: string
  recipes: Recipe[]
}

function formatHebrewDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function groupByMonth(recipes: Recipe[]): GroupedRecipes[] {
  const groups = new Map<string, Recipe[]>()

  for (const recipe of recipes) {
    const d = new Date(recipe.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    const label = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(recipe)
    // Store the label on the first recipe's group
    if (!groups.get(key)!.length) groups.set(key, [])
  }

  // Convert to array with labels
  const result: GroupedRecipes[] = []
  const sortedKeys = Array.from(groups.keys()).sort().reverse()
  for (const key of sortedKeys) {
    const recipes = groups.get(key)!
    const d = new Date(recipes[0].created_at)
    const label = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
    result.push({ label, recipes })
  }
  return result
}

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, type: 'spring' as const, stiffness: 300, damping: 25 },
  }),
}

export default function TimelinePage() {
  const supabase = useMemo(() => createClient(), [])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div dir="rtl" className="min-h-screen bg-surface pt-20 pb-28">
      <Navbar />
      <PageTransition>
        <div className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-2xl font-bold text-on-surface text-center mb-8">
            <span className="material-symbols-outlined text-primary align-middle ml-2">timeline</span>
            ציר זמן
          </h1>

          {loading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-5 w-32 rounded animate-shimmer bg-gradient-to-r from-surface-container-high via-surface-container-low to-surface-container-high bg-[length:200%_100%]" />
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="h-16 rounded-xl animate-shimmer bg-gradient-to-r from-surface-container-high via-surface-container-low to-surface-container-high bg-[length:200%_100%]" />
                  ))}
                </div>
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-outline/30">restaurant_menu</span>
              <p className="text-lg text-on-surface-variant">עדיין אין מתכונים</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute right-[19px] top-0 bottom-0 w-0.5 bg-outline-variant/40" />

              {grouped.map((group) => (
                <div key={group.label} className="mb-8">
                  {/* Month label */}
                  <div className="relative flex items-center gap-3 mb-4">
                    <div className="relative z-10 h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                      <span className="material-symbols-outlined text-on-primary text-lg">calendar_month</span>
                    </div>
                    <h2 className="text-base font-bold text-on-surface">{group.label}</h2>
                    <span className="text-xs text-outline">({group.recipes.length})</span>
                  </div>

                  {/* Recipes in this month */}
                  <div className="pr-[50px] space-y-2">
                    {group.recipes.map((recipe, i) => (
                      <motion.div
                        key={recipe.id}
                        custom={i}
                        variants={itemVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-20px' }}
                      >
                        <Link
                          href={`/recipe/${recipe.id}`}
                          className="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                          {/* Recipe image */}
                          <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-surface-container-high">
                            {recipe.image_url ? (
                              <Image
                                src={recipe.image_url}
                                alt={recipe.title}
                                fill
                                loading="lazy"
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <span className="material-symbols-outlined text-outline/40 text-lg">restaurant</span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate">{recipe.title}</p>
                            <p className="text-xs text-on-surface-variant">
                              {recipe.profiles?.display_name}
                              {' · '}
                              {formatHebrewDate(recipe.created_at)}
                            </p>
                          </div>

                          {/* Category badge */}
                          {recipe.category && (
                            <span className="shrink-0 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              {recipe.category}
                            </span>
                          )}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
      <BottomNav />
    </div>
  )
}
