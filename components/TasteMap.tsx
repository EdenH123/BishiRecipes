'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { type Recipe, CATEGORIES } from '@/lib/types'
import { motion } from 'framer-motion'

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; barColor: string }> = {
  'ארוחת בוקר': { emoji: '🌅', color: 'bg-amber-100 text-amber-900 border-amber-300', barColor: 'bg-amber-400' },
  'ארוחת צהריים': { emoji: '🍽️', color: 'bg-orange-100 text-orange-900 border-orange-300', barColor: 'bg-orange-400' },
  'ארוחת ערב': { emoji: '🌙', color: 'bg-indigo-100 text-indigo-900 border-indigo-300', barColor: 'bg-indigo-400' },
  'קינוח': { emoji: '🍰', color: 'bg-pink-100 text-pink-900 border-pink-300', barColor: 'bg-pink-400' },
  'חטיף': { emoji: '🥨', color: 'bg-yellow-100 text-yellow-900 border-yellow-300', barColor: 'bg-yellow-400' },
  'מרק': { emoji: '🍲', color: 'bg-red-100 text-red-900 border-red-300', barColor: 'bg-red-400' },
  'סלט': { emoji: '🥗', color: 'bg-green-100 text-green-900 border-green-300', barColor: 'bg-green-400' },
  'לחם ואפייה': { emoji: '🍞', color: 'bg-stone-100 text-stone-900 border-stone-300', barColor: 'bg-stone-400' },
  'שתייה': { emoji: '🥤', color: 'bg-sky-100 text-sky-900 border-sky-300', barColor: 'bg-sky-400' },
}

const DEFAULT_CONFIG = { emoji: '🍴', color: 'bg-gray-100 text-gray-900 border-gray-300', barColor: 'bg-gray-400' }

interface CategoryCount {
  name: string
  count: number
  percentage: number
  config: { emoji: string; color: string; barColor: string }
}

export default function TasteMap() {
  const supabase = createClient()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecipes() {
      setLoading(true)
      const { data } = await supabase
        .from('recipes')
        .select('id, category')
      if (data) {
        setRecipes(data as Recipe[])
      }
      setLoading(false)
    }
    fetchRecipes()
  }, [])

  const categoryCounts = useMemo(() => {
    const countMap = new Map<string, number>()

    for (const recipe of recipes) {
      const cat = recipe.category || 'ללא קטגוריה'
      countMap.set(cat, (countMap.get(cat) || 0) + 1)
    }

    const total = recipes.length || 1
    const result: CategoryCount[] = Array.from(countMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
        config: CATEGORY_CONFIG[name] || DEFAULT_CONFIG,
      }))
      .sort((a, b) => b.count - a.count)

    return result
  }, [recipes])

  const maxCount = categoryCounts.length > 0 ? categoryCounts[0].count : 1

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary-container border-t-transparent" />
      </div>
    )
  }

  if (recipes.length === 0) {
    return (
      <p className="py-12 text-center text-on-surface-variant">
        אין מתכונים עדיין - הוסיפו מתכונים כדי לראות את מפת הטעמים! 🍽️
      </p>
    )
  }

  return (
    <div className="space-y-10">
      {/* Bubble / Card Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categoryCounts.map((cat, index) => {
          // Scale card size based on proportion — minimum 1, max ~1.15
          const scale = 1 + (cat.count / maxCount) * 0.15
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.07, type: 'spring', stiffness: 200 }}
              className={`relative rounded-2xl border p-4 shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-transform hover:scale-105 ${cat.config.color}`}
              style={{ minHeight: `${Math.round(scale * 120)}px` }}
            >
              <span className="text-4xl" style={{ fontSize: `${Math.round(scale * 2.5)}rem` }}>
                {cat.config.emoji}
              </span>
              <span className="font-bold font-rubik text-sm leading-tight">{cat.name}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{cat.count}</span>
                <span className="text-xs opacity-70">מתכונים</span>
              </div>
              <span className="text-xs font-medium opacity-60">{cat.percentage}%</span>
            </motion.div>
          )
        })}
      </div>

      {/* Bar Chart */}
      <div>
        <h3 className="text-lg font-bold text-on-surface mb-4 font-rubik">השוואה מפורטת</h3>
        <div className="space-y-3">
          {categoryCounts.map((cat, index) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              className="flex items-center gap-3"
            >
              <span className="text-xl w-8 text-center shrink-0">{cat.config.emoji}</span>
              <span className="text-sm font-medium w-24 shrink-0 text-on-surface font-rubik truncate">{cat.name}</span>
              <div className="flex-1 bg-surface-container-low rounded-full h-6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(cat.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.05, ease: 'easeOut' }}
                  className={`h-full rounded-full ${cat.config.barColor} flex items-center justify-end px-2`}
                >
                  <span className="text-xs font-bold text-white drop-shadow-sm">
                    {cat.count}
                  </span>
                </motion.div>
              </div>
              <span className="text-xs text-on-surface-variant w-10 text-left shrink-0">{cat.percentage}%</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
