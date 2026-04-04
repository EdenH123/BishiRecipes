'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/types'
import { motion } from 'framer-motion'

const CATEGORY_CONFIG: Record<string, { emoji: string; gradient: string; ring: string; bar: string }> = {
  'ארוחת בוקר': { emoji: '🌅', gradient: 'from-amber-400 to-orange-500', ring: '#f59e0b', bar: '#f59e0b' },
  'ארוחת צהריים': { emoji: '🍽️', gradient: 'from-orange-400 to-red-500', ring: '#f97316', bar: '#f97316' },
  'ארוחת ערב': { emoji: '🌙', gradient: 'from-indigo-400 to-purple-500', ring: '#6366f1', bar: '#6366f1' },
  'קינוח': { emoji: '🍰', gradient: 'from-pink-400 to-rose-500', ring: '#ec4899', bar: '#ec4899' },
  'חטיף': { emoji: '🥨', gradient: 'from-yellow-400 to-amber-500', ring: '#eab308', bar: '#eab308' },
  'מרק': { emoji: '🍲', gradient: 'from-red-400 to-orange-500', ring: '#ef4444', bar: '#ef4444' },
  'סלט': { emoji: '🥗', gradient: 'from-green-400 to-emerald-500', ring: '#22c55e', bar: '#22c55e' },
  'לחם ואפייה': { emoji: '🍞', gradient: 'from-stone-400 to-amber-600', ring: '#a8a29e', bar: '#a8a29e' },
  'שתייה': { emoji: '🥤', gradient: 'from-sky-400 to-blue-500', ring: '#0ea5e9', bar: '#0ea5e9' },
}

const DEFAULT_CONFIG = { emoji: '🍴', gradient: 'from-gray-400 to-gray-500', ring: '#9ca3af', bar: '#9ca3af' }

interface CategoryStat {
  name: string
  count: number
  percentage: number
  config: { emoji: string; gradient: string; ring: string; bar: string }
  topChef: string | null
}

export default function TasteMap() {
  const supabase = createClient()
  const [categoryData, setCategoryData] = useState<CategoryStat[]>([])
  const [totalRecipes, setTotalRecipes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // Fetch recipes with creator info
      const { data: recipes } = await supabase
        .from('recipes')
        .select('category, profiles!created_by(display_name)')

      if (!recipes || recipes.length === 0) {
        setLoading(false)
        return
      }

      setTotalRecipes(recipes.length)

      // Count by category and track top chef per category
      const countMap = new Map<string, number>()
      const chefMap = new Map<string, Map<string, number>>()

      for (const recipe of recipes) {
        const cat = recipe.category || 'ללא קטגוריה'
        countMap.set(cat, (countMap.get(cat) || 0) + 1)

        const chefName = (recipe.profiles as any)?.display_name
        if (chefName) {
          if (!chefMap.has(cat)) chefMap.set(cat, new Map())
          const catChefs = chefMap.get(cat)!
          catChefs.set(chefName, (catChefs.get(chefName) || 0) + 1)
        }
      }

      const total = recipes.length
      const result: CategoryStat[] = Array.from(countMap.entries())
        .map(([name, count]) => {
          // Find top chef for this category
          let topChef: string | null = null
          const catChefs = chefMap.get(name)
          if (catChefs) {
            let maxCount = 0
            Array.from(catChefs.entries()).forEach(([chef, chefCount]) => {
              if (chefCount > maxCount) {
                maxCount = chefCount
                topChef = chef
              }
            })
          }

          return {
            name,
            count,
            percentage: Math.round((count / total) * 100),
            config: CATEGORY_CONFIG[name] || DEFAULT_CONFIG,
            topChef,
          }
        })
        .sort((a, b) => b.count - a.count)

      setCategoryData(result)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary-container border-t-transparent" />
      </div>
    )
  }

  if (categoryData.length === 0) {
    return (
      <p className="py-12 text-center text-on-surface-variant font-rubik">
        אין מתכונים עדיין — הוסיפו מתכונים כדי לראות את מפת הטעמים! 🍽️
      </p>
    )
  }

  const maxCount = categoryData[0].count

  // Donut chart calculations
  const donutSize = 220
  const strokeWidth = 32
  const radius = (donutSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let cumulativePercent = 0

  return (
    <div className="space-y-10">
      {/* Donut Chart */}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: donutSize, height: donutSize }}>
          <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`}>
            {categoryData.map((cat, index) => {
              const percent = cat.count / totalRecipes
              const dashLength = circumference * percent
              const dashGap = circumference - dashLength
              const offset = circumference * cumulativePercent
              cumulativePercent += percent

              return (
                <motion.circle
                  key={cat.name}
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={radius}
                  fill="none"
                  stroke={cat.config.ring}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${dashGap}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
              )
            })}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-on-surface">{totalRecipes}</span>
            <span className="text-xs text-on-surface-variant font-rubik">מתכונים</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {categoryData.map((cat) => (
            <div key={cat.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.config.ring }}
              />
              <span className="text-on-surface-variant font-rubik">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Cards — Top 3 highlighted */}
      <div>
        <h3 className="text-lg font-bold text-on-surface mb-4 font-rubik flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">leaderboard</span>
          דירוג קטגוריות
        </h3>

        {/* Podium — top 3 */}
        {categoryData.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 0, 2].map((rank) => {
              const cat = categoryData[rank]
              if (!cat) return null
              const medals = ['🥇', '🥈', '🥉']
              const heights = ['h-32', 'h-28', 'h-24']
              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + rank * 0.1 }}
                  className={`flex flex-col items-center justify-end ${heights[rank]}`}
                >
                  <span className="text-2xl mb-1">{medals[rank]}</span>
                  <div className={`w-full rounded-t-xl bg-gradient-to-b ${cat.config.gradient} p-3 text-center text-white`}
                    style={{ height: rank === 0 ? '100%' : rank === 1 ? '85%' : '70%' }}
                  >
                    <span className="text-2xl block">{cat.config.emoji}</span>
                    <span className="text-xs font-bold block mt-1 leading-tight">{cat.name}</span>
                    <span className="text-lg font-bold block">{cat.count}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Full list with bars */}
        <div className="space-y-3">
          {categoryData.map((cat, index) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
              className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cat.config.gradient}`}
                >
                  <span className="text-xl">{cat.config.emoji}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-on-surface font-rubik">{cat.name}</span>
                    <span className="text-sm font-bold text-on-surface">{cat.count} <span className="text-xs font-normal text-on-surface-variant">({cat.percentage}%)</span></span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-1.5 h-2 rounded-full bg-surface-container-low overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(cat.count / maxCount) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.5 + index * 0.05, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.config.bar }}
                    />
                  </div>

                  {/* Top chef for this category */}
                  {cat.topChef && (
                    <p className="mt-1 text-[11px] text-on-surface-variant font-rubik">
                      👨‍🍳 השף המוביל: <span className="font-medium text-on-surface">{cat.topChef}</span>
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Fun stats */}
      <div>
        <h3 className="text-lg font-bold text-on-surface mb-4 font-rubik flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">insights</span>
          תובנות מעניינות
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <InsightCard
            icon="🏆"
            label="הקטגוריה הפופולרית"
            value={`${categoryData[0].config.emoji} ${categoryData[0].name}`}
            delay={0.6}
          />
          <InsightCard
            icon="🌱"
            label="הקטגוריה הנדירה"
            value={`${categoryData[categoryData.length - 1].config.emoji} ${categoryData[categoryData.length - 1].name}`}
            delay={0.7}
          />
          <InsightCard
            icon="📊"
            label="ממוצע לקטגוריה"
            value={`${Math.round(totalRecipes / categoryData.length)} מתכונים`}
            delay={0.8}
          />
          <InsightCard
            icon="🎨"
            label="קטגוריות פעילות"
            value={`${categoryData.length} מתוך ${CATEGORIES.length}`}
            delay={0.9}
          />
        </div>
      </div>
    </div>
  )
}

function InsightCard({ icon, label, value, delay }: { icon: string; label: string; value: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-3 shadow-sm"
    >
      <span className="text-xl">{icon}</span>
      <p className="mt-1 text-[11px] text-on-surface-variant font-rubik">{label}</p>
      <p className="text-sm font-bold text-on-surface font-rubik mt-0.5">{value}</p>
    </motion.div>
  )
}
