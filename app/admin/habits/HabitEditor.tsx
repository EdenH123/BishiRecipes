'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CATEGORIES, STATS, FREQUENCY_TYPES, DIFFICULTIES,
  CATEGORY_META, STAT_META, CATEGORY_STAT_MAP, DIFFICULTY_VALUES,
  type Category, type Stat, type FrequencyType, type Difficulty, type NewHabit, type HabitDefinition,
} from '@/lib/habit-rpg/types'

interface Props {
  habit?: HabitDefinition | null  // null = create mode
  onSave: (data: NewHabit) => Promise<void>
  onClose: () => void
}

const HABIT_EMOJIS = ['⚔️', '🏋️', '📚', '🧘', '🚿', '🥗', '💪', '🏃', '📖', '🧠', '❤️', '✨', '🎯', '🔥', '💤', '🥤', '🎨', '🎵', '✍️', '🌅']

export default function HabitEditor({ habit, onSave, onClose }: Props) {
  const [title, setTitle] = useState(habit?.title ?? '')
  const [emoji, setEmoji] = useState(habit?.emoji ?? '⚔️')
  const [category, setCategory] = useState<Category>(habit?.category ?? 'workout')
  const [statPrimary, setStatPrimary] = useState<Stat>(habit?.stat_primary ?? CATEGORY_STAT_MAP[category])
  const [statSecondary, setStatSecondary] = useState<Stat | ''>(habit?.stat_secondary ?? '')
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(habit?.frequency_type ?? 'daily')
  const [frequencyValue, setFrequencyValue] = useState(habit?.frequency_value ?? 3)
  const [difficulty, setDifficulty] = useState<Difficulty>(habit?.difficulty ?? 'medium')
  const [saving, setSaving] = useState(false)

  const isEdit = !!habit
  const diffValues = DIFFICULTY_VALUES[difficulty]

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        emoji,
        category,
        stat_primary: statPrimary,
        stat_secondary: statSecondary || null,
        frequency_type: frequencyType,
        frequency_value: frequencyType === 'x_per_week' ? frequencyValue : 1,
        difficulty,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#1a1033] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5"
      >
        {/* Handle */}
        <div className="flex justify-center mb-3 sm:hidden"><div className="w-10 h-1 bg-white/20 rounded-full" /></div>

        <h2 className="text-lg font-bold text-white mb-4">{isEdit ? 'Edit Habit' : 'New Habit'}</h2>

        {/* Emoji picker */}
        <div className="mb-4">
          <p className="text-xs text-white/50 mb-2">Icon</p>
          <div className="flex flex-wrap gap-1.5">
            {HABIT_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${emoji === e ? 'bg-indigo-600 scale-110' : 'bg-white/5 hover:bg-white/10'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <p className="text-xs text-white/50 mb-1">Title</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Morning run"
            maxLength={50}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500" />
        </div>

        {/* Category */}
        <div className="mb-4">
          <p className="text-xs text-white/50 mb-2">Category</p>
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORIES.map(cat => {
              const meta = CATEGORY_META[cat]
              return (
                <button key={cat} onClick={() => { setCategory(cat); setStatPrimary(CATEGORY_STAT_MAP[cat]) }}
                  className={`rounded-xl py-2 text-xs font-bold transition-all ${category === cat ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'}`}>
                  {meta.emoji} {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Primary stat (auto-set from category, can override) */}
        <div className="mb-4">
          <p className="text-xs text-white/50 mb-2">Primary Stat</p>
          <div className="flex gap-2">
            {STATS.map(stat => (
              <button key={stat} onClick={() => setStatPrimary(stat)}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${statPrimary === stat ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'}`}>
                {STAT_META[stat].icon} {STAT_META[stat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div className="mb-4">
          <p className="text-xs text-white/50 mb-2">Frequency</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { key: 'daily' as FrequencyType, label: 'Daily' },
              { key: 'weekly' as FrequencyType, label: 'Weekly' },
              { key: 'x_per_week' as FrequencyType, label: 'X per week' },
              { key: 'monthly' as FrequencyType, label: 'Monthly' },
            ]).map(f => (
              <button key={f.key} onClick={() => setFrequencyType(f.key)}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${frequencyType === f.key ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'}`}>
                {f.label}
              </button>
            ))}
          </div>
          {frequencyType === 'x_per_week' && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-white/50">Times per week:</p>
              <div className="flex gap-1">
                {[2, 3, 4, 5, 6].map(n => (
                  <button key={n} onClick={() => setFrequencyValue(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${frequencyValue === n ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Difficulty */}
        <div className="mb-6">
          <p className="text-xs text-white/50 mb-2">Difficulty</p>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => {
              const vals = DIFFICULTY_VALUES[d]
              return (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`flex-1 rounded-xl py-3 text-center transition-all ${difficulty === d ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'}`}>
                  <p className="text-sm font-bold capitalize">{d}</p>
                  <p className="text-[9px] mt-0.5 opacity-70">{vals.xp} XP · {vals.coins} 🪙</p>
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-red-400/50 mt-1 text-center">Miss penalty: -{diffValues.hpPenalty} HP</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 font-bold text-sm">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform">
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
