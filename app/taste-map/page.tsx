'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import TasteMap from '@/components/TasteMap'
import { motion } from 'framer-motion'

export default function TasteMapPage() {
  const supabase = createClient()
  const [totalRecipes, setTotalRecipes] = useState(0)
  const [animatedCount, setAnimatedCount] = useState(0)

  useEffect(() => {
    async function fetchTotal() {
      const { count } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
      if (count !== null) {
        setTotalRecipes(count)
      }
    }
    fetchTotal()
  }, [])

  // Animated counter
  useEffect(() => {
    if (totalRecipes === 0) return
    const target = totalRecipes
    const duration = 800
    const step = Math.max(1, Math.floor(target / (duration / 16)))
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) {
        current = target
        clearInterval(timer)
      }
      setAnimatedCount(current)
    }, 16)
    return () => clearInterval(timer)
  }, [totalRecipes])

  return (
    <motion.div
      dir="rtl"
      className="min-h-screen bg-surface pt-20 pb-28"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-on-surface font-rubik">
            🗺️ מפת הטעמים של המשפחה
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 font-rubik">
            איזה טעמים הכי אוהבים אצלנו?
          </p>
        </div>

        {/* Total recipes stat */}
        {totalRecipes > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mx-auto mb-8 flex items-center justify-center gap-3 rounded-2xl bg-primary/10 border border-primary/20 px-6 py-4 max-w-xs"
          >
            <span className="text-3xl">🍳</span>
            <div className="text-center">
              <span className="text-3xl font-bold text-primary">{animatedCount}</span>
              <p className="text-sm text-on-surface-variant font-rubik">מתכונים במשפחה</p>
            </div>
          </motion.div>
        )}

        {/* Taste Map */}
        <TasteMap />
      </div>

      <BottomNav />
    </motion.div>
  )
}
