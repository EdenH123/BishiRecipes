'use client'

import { useUserStats } from '@/lib/hooks/useUserStats'
import { calculateXP, getLevel, getNextLevel, getLevelProgress } from '@/lib/xp-levels'
import { motion } from 'framer-motion'

interface XPProgressProps {
  userId: string
}

export default function XPProgress({ userId }: XPProgressProps) {
  const { stats, loading } = useUserStats(userId)

  if (loading) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-surface-container-low p-4">
        <div className="flex items-center justify-center py-3">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-secondary-container border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!stats) return null

  const totalXP = calculateXP(stats)
  const currentLevel = getLevel(totalXP)
  const { nextLevel, xpNeeded } = getNextLevel(totalXP)
  const progress = getLevelProgress(totalXP)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto max-w-md rounded-2xl bg-surface-container-low p-4"
    >
      {/* Level info row */}
      <div className="flex items-center gap-3">
        <div className="text-3xl">{currentLevel.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-bold font-rubik text-on-surface">
              {currentLevel.title}
            </h3>
            <span className="text-sm font-medium font-rubik text-primary">
              {totalXP} XP
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-1.5 h-2.5 rounded-full bg-surface-container-lowest overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>

          {/* Next level text */}
          <p className="mt-1 text-xs text-on-surface-variant font-rubik">
            {nextLevel ? (
              <>
                עוד {xpNeeded} XP לרמה הבאה: {nextLevel.icon} {nextLevel.title}
              </>
            ) : (
              'הגעת לרמה הגבוהה ביותר!'
            )}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
