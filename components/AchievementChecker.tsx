'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { ACHIEVEMENTS, type UserStats } from '@/lib/achievements'
import { useUserStats } from '@/lib/hooks/useUserStats'

const SHOWN_KEY = 'bishi_shown_achievements'

function getShownAchievements(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(SHOWN_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

function markShown(id: string) {
  if (typeof window === 'undefined') return
  try {
    const shown = getShownAchievements()
    shown.add(id)
    localStorage.setItem(SHOWN_KEY, JSON.stringify(Array.from(shown)))
  } catch {}
}

export default function AchievementChecker({ userId }: { userId: string }) {
  const { stats, loading } = useUserStats(userId)
  const [popup, setPopup] = useState<{ id: string; title: string; icon: string; description: string } | null>(null)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (loading || !stats || checkedRef.current) return
    checkedRef.current = true

    const shown = getShownAchievements()
    for (const ach of ACHIEVEMENTS) {
      if (shown.has(ach.id)) continue
      if (ach.check(stats)) {
        markShown(ach.id)
        setPopup({ id: ach.id, title: ach.title, icon: ach.icon, description: ach.description })
        break // show one at a time
      }
    }
  }, [loading, stats])

  // Auto-dismiss after 4s
  useEffect(() => {
    if (!popup) return
    const timer = setTimeout(() => setPopup(null), 4000)
    return () => clearTimeout(timer)
  }, [popup])

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          key={popup.id}
          initial={{ opacity: 0, y: -60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', damping: 20 }}
          onClick={() => setPopup(null)}
          className="fixed top-20 left-4 right-4 z-50 mx-auto max-w-sm cursor-pointer"
        >
          <div className="bg-surface-container-lowest border border-primary/20 rounded-2xl p-4 flex items-center gap-3 shadow-xl">
            <span className="text-3xl">{popup.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-bold">🏆 הישג חדש!</p>
              <p className="text-sm text-on-surface font-bold">{popup.title}</p>
              <p className="text-[10px] text-on-surface-variant">{popup.description}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
