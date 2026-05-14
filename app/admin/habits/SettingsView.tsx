'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { HabitCharacter, HabitDefinition } from '@/lib/habit-rpg/types'
import { CATEGORY_META, STAT_META, DIFFICULTY_VALUES } from '@/lib/habit-rpg/types'
import { getLevelDef, canAscend } from '@/lib/habit-rpg/levels'
import * as db from '@/lib/habit-rpg/db'

interface Props {
  character: HabitCharacter
  habits: HabitDefinition[]
  onEditHabit: (habit: HabitDefinition) => void
  onDeleteHabit: (id: string) => void
  onAscend: () => void
  onReset: () => void
  onRefresh: () => void
}

export default function SettingsView({ character, habits, onEditHabit, onDeleteHabit, onAscend, onReset, onRefresh }: Props) {
  const [showAllHabits, setShowAllHabits] = useState(false)
  const ascendable = canAscend(character.level, character.xp)

  return (
    <div className="space-y-4">
      {/* Character info */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white mb-3">Character</h3>
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <span className="text-white/40">Name</span><span className="text-white text-right">{character.name}</span>
          <span className="text-white/40">Level</span><span className="text-white text-right">{character.level} — {getLevelDef(character.level).title}</span>
          <span className="text-white/40">XP</span><span className="text-white text-right">{character.xp}</span>
          <span className="text-white/40">HP</span><span className="text-white text-right">{character.hp}/100</span>
          <span className="text-white/40">Coins</span><span className="text-yellow-400 text-right">{character.coins}</span>
          <span className="text-white/40">Streak</span><span className="text-orange-400 text-right">{character.streak}🔥 (best: {character.longest_streak})</span>
          <span className="text-white/40">Ascensions</span><span className="text-purple-400 text-right">{character.ascension_level}</span>
          <span className="text-white/40">Freeze tokens</span><span className="text-cyan-400 text-right">{character.freeze_tokens}/3</span>
          <span className="text-white/40">Timezone</span><span className="text-white/60 text-right">{character.timezone}</span>
        </div>
      </div>

      {/* Ascend button */}
      {ascendable && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { if (confirm('Ascend? Your level and XP reset to 1/0. Stats, coins, achievements stay. You gain +10% permanent XP bonus.')) onAscend() }}
          className="w-full bg-purple-600 text-white rounded-2xl py-3 font-bold text-sm shadow-lg shadow-purple-900/30"
        >
          ✦ Ascend to Level {character.ascension_level + 1} (+{(character.ascension_level + 1) * 10}% XP)
        </motion.button>
      )}

      {/* Stats */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white mb-3">Stats</h3>
        <div className="space-y-2">
          {(['strength', 'wisdom', 'vitality', 'spirit'] as const).map(stat => {
            const meta = STAT_META[stat]
            const val = character[`stat_${stat}` as keyof typeof character] as number
            return (
              <div key={stat} className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{meta.icon}</span>
                <span className="text-xs text-white/60 w-16">{meta.label}</span>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(val * 2, 100)}%` }} />
                </div>
                <span className="text-xs text-white font-bold w-8 text-right">{val}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Habit management */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Habits ({habits.length})</h3>
          <button onClick={() => setShowAllHabits(!showAllHabits)}
            className="text-[10px] text-indigo-400">{showAllHabits ? 'Collapse' : 'Manage'}</button>
        </div>
        {showAllHabits && (
          <div className="space-y-1.5">
            {habits.map(h => (
              <div key={h.id} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                <span>{h.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-bold truncate">{h.title}</p>
                  <p className="text-[9px] text-white/30">{CATEGORY_META[h.category].label} · {h.difficulty} · {h.frequency_type}</p>
                </div>
                <button onClick={() => onEditHabit(h)} className="text-white/30 hover:text-white text-xs">✏️</button>
                <button onClick={() => { if (confirm(`Delete "${h.title}"?`)) onDeleteHabit(h.id) }}
                  className="text-white/30 hover:text-red-400 text-xs">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-red-900/10 border border-red-900/20 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-red-400 mb-2">Danger Zone</h3>
        <button onClick={() => {
          if (confirm('Delete ALL habit data? Character, habits, completions — everything. This cannot be undone.')) {
            if (confirm('Are you absolutely sure?')) onReset()
          }
        }} className="w-full py-2 rounded-xl border border-red-700/30 text-red-400/60 text-xs hover:text-red-400 transition-colors">
          🗑️ Delete all Habit RPG data
        </button>
      </div>
    </div>
  )
}
