'use client'

import { ACHIEVEMENTS } from '@/lib/achievements'
import { useUserStats } from '@/lib/hooks/useUserStats'
import { motion } from 'framer-motion'

interface AchievementsProps {
  userId: string
}

export default function Achievements({ userId }: AchievementsProps) {
  const { stats, loading } = useUserStats(userId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary-container border-t-transparent" />
      </div>
    )
  }

  if (!stats) {
    return (
      <p className="py-12 text-center text-gray-400 font-rubik">
        שגיאה בטעינת ההישגים
      </p>
    )
  }

  const unlockedIds = new Set(
    ACHIEVEMENTS.filter((a) => a.check(stats)).map((a) => a.id)
  )
  const unlockedCount = unlockedIds.size
  const totalCount = ACHIEVEMENTS.length

  return (
    <div>
      {/* Progress header */}
      <div className="mb-6 text-center">
        <p className="text-lg font-bold font-rubik">
          {unlockedCount}/{totalCount} הישגים
        </p>
        <div className="mt-2 mx-auto h-2 max-w-xs rounded-full bg-surface-container-low overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Achievements grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {ACHIEVEMENTS.map((achievement, index) => {
          const unlocked = unlockedIds.has(achievement.id)

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className={`relative rounded-xl p-3 transition-shadow ${
                unlocked
                  ? 'bg-surface-container-lowest border border-primary/20 shadow-sm'
                  : 'bg-surface-container-low border border-outline-variant/30 grayscale opacity-50'
              }`}
            >
              {/* Lock overlay for locked achievements */}
              {!unlocked && (
                <div className="absolute top-2 left-2 text-lg">🔒</div>
              )}

              {/* Icon */}
              <div className="text-3xl">{achievement.icon}</div>

              {/* Title */}
              <h3 className="mt-1.5 text-sm font-bold font-rubik">
                {achievement.title}
              </h3>

              {/* Description */}
              <p className="mt-0.5 text-xs text-gray-500 font-rubik">
                {achievement.description}
              </p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
