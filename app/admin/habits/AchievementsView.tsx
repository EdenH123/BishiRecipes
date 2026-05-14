'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ACHIEVEMENTS } from '@/lib/habit-rpg/achievements'
import * as db from '@/lib/habit-rpg/db'

interface Props {
  userId: string
  unlockedIds: Set<string>
}

export default function AchievementsView({ userId, unlockedIds }: Props) {
  const visible = ACHIEVEMENTS.filter(a => !a.hidden || unlockedIds.has(a.id))
  const total = ACHIEVEMENTS.length
  const unlocked = unlockedIds.size

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
        <p className="text-white/40 text-xs">Achievements Unlocked</p>
        <p className="text-2xl font-bold text-white mt-1">{unlocked}/{total}</p>
        <div className="h-2 mt-2 rounded-full bg-white/10 overflow-hidden max-w-[200px] mx-auto">
          <motion.div className="h-full bg-yellow-500 rounded-full"
            animate={{ width: `${(unlocked / total) * 100}%` }}
            transition={{ type: 'spring', damping: 15 }} />
        </div>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-2 gap-2">
        {visible.map((ach, i) => {
          const done = unlockedIds.has(ach.id)
          return (
            <motion.div key={ach.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl p-3 border transition-all ${
                done
                  ? 'bg-yellow-900/20 border-yellow-500/20'
                  : 'bg-white/3 border-white/5 opacity-40'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{done ? ach.emoji : '🔒'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${done ? 'text-yellow-200' : 'text-white/40'}`}>{ach.name}</p>
                </div>
              </div>
              <p className="text-[10px] text-white/30">{ach.description}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Hidden count */}
      {ACHIEVEMENTS.filter(a => a.hidden && !unlockedIds.has(a.id)).length > 0 && (
        <p className="text-center text-white/20 text-[10px]">
          + {ACHIEVEMENTS.filter(a => a.hidden && !unlockedIds.has(a.id)).length} hidden achievements
        </p>
      )}
    </div>
  )
}
