'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useHabitEngine } from '@/lib/habit-rpg/useHabitEngine'
import { STAT_META } from '@/lib/habit-rpg/types'
import type { HabitDefinition } from '@/lib/habit-rpg/types'
import HabitEditor from './HabitEditor'

type Tab = 'today' | 'stats' | 'settings'

export default function HabitApp() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [authorized, setAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const engine = useHabitEngine()
  const [tab, setTab] = useState<Tab>('today')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitDefinition | null>(null)

  // Admin gate
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { router.push('/'); return }
      setAuthorized(true)
      setAuthLoading(false)
    }
    check()
  }, [supabase, router])

  if (authLoading || !authorized || engine.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <span className="text-4xl block mb-3 animate-pulse">⚔️</span>
          <p className="text-white/40 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // ── Onboarding ──
  if (engine.needsOnboarding) {
    return <Onboarding onCreate={engine.createNewCharacter} onBack={() => router.push('/')} />
  }

  const char = engine.character!

  return (
    <div className="min-h-screen font-rubik select-none" dir="ltr"
      style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1033 40%, #0f172a 100%)' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-[#0a0a1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => router.push('/')} className="text-white/40 active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="text-center flex-1">
            <p className="text-white text-sm font-bold">{char.name}</p>
            <p className="text-white/40 text-[10px]">
              Lv.{engine.levelInfo.level} {engine.levelInfo.title}
              {char.ascension_level > 0 && ` · ✦${char.ascension_level}`}
            </p>
            {/* XP progress bar */}
            {engine.levelInfo.xpForNext > 0 && (
              <div className="h-1 mt-1 rounded-full bg-white/10 overflow-hidden max-w-[120px] mx-auto">
                <motion.div className="h-full bg-indigo-500 rounded-full"
                  animate={{ width: `${(engine.levelInfo.xpIntoLevel / engine.levelInfo.xpForNext) * 100}%` }}
                  transition={{ type: 'spring', damping: 15 }} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-red-400">❤️ {char.hp}</span>
            <span className="text-yellow-400">🪙 {char.coins}</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-28">
        {/* ── Stats bar ── */}
        <div className="grid grid-cols-4 gap-2 py-4">
          {(['strength', 'wisdom', 'vitality', 'spirit'] as const).map(stat => {
            const meta = STAT_META[stat]
            const val = char[`stat_${stat}` as keyof typeof char] as number
            return (
              <div key={stat} className="text-center">
                <span className="text-lg">{meta.icon}</span>
                <p className="text-white text-sm font-bold mt-0.5">{val}</p>
                <p className="text-white/30 text-[9px]">{meta.label}</p>
              </div>
            )
          })}
        </div>

        {/* ── Streak + HP ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-red-400">HP {char.hp}/100</span>
              {char.recovery_multiplier_active && <span className="text-green-400 font-bold">x2 COMEBACK</span>}
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${char.hp > 50 ? 'bg-green-500' : char.hp > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                animate={{ width: `${char.hp}%` }}
                transition={{ type: 'spring', damping: 15 }}
              />
            </div>
          </div>
          <div className="text-center shrink-0">
            <p className="text-white/50 text-[9px]">Streak</p>
            <p className="text-orange-400 font-bold text-lg">{char.streak}🔥</p>
          </div>
        </div>

        {/* Perfect Day banner */}
        <AnimatePresence>
          {engine.isPerfectDay && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="mb-4 bg-green-900/20 border border-green-500/20 rounded-2xl p-3 text-center">
              <span className="text-2xl">🌟</span>
              <p className="text-green-300 text-sm font-bold mt-1">Perfect Day!</p>
              <p className="text-green-400/50 text-[10px]">+20 XP · +10 coins · +10 HP</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level-up celebration */}
        <AnimatePresence>
          {engine.justLeveledUp && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={engine.clearLevelUp}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer">
              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} className="text-center">
                <span className="text-7xl block mb-4">⚔️</span>
                <p className="text-3xl font-bold text-yellow-300 mb-2">Level Up!</p>
                <p className="text-white/60 text-lg">Level {engine.levelInfo.level} — {engine.levelInfo.title}</p>
                <p className="text-white/30 text-xs mt-4">Tap to continue</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
          {([
            { key: 'today' as Tab, label: 'Today', icon: '⚔️' },
            { key: 'stats' as Tab, label: 'Stats', icon: '📊' },
            { key: 'settings' as Tab, label: 'Settings', icon: '⚙️' },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.key ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {tab === 'today' && (
            <motion.div key="today" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {engine.habits.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-5xl block mb-3">🗡️</span>
                  <p className="text-white/40 text-sm mb-4">No habits yet. Add your first quest!</p>
                  <button onClick={() => { setEditingHabit(null); setEditorOpen(true) }}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform">
                    + Add Habit
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {engine.habits.map(habit => {
                    const completed = engine.todayCompletions.has(habit.id)
                    return (
                      <div key={habit.id} className="flex gap-1.5">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => completed ? engine.undoCompletion(habit.id) : engine.completeHabit(habit.id)}
                          className={`flex-1 flex items-center gap-3 rounded-2xl p-4 text-left transition-all ${
                            completed
                              ? 'bg-green-900/20 border border-green-500/20'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-2xl">{habit.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${completed ? 'text-green-300 line-through' : 'text-white'}`}>
                              {habit.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-white/30">
                                {STAT_META[habit.stat_primary].icon} {habit.difficulty} · {habit.frequency_type === 'x_per_week' ? `${engine.weeklyProgress.get(habit.id) || 0}/${habit.frequency_value} this week` : habit.frequency_type}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xl ${completed ? 'text-green-400' : 'text-white/20'}`}>
                            {completed ? '✓' : '○'}
                          </span>
                        </motion.button>
                        {/* Edit/delete */}
                        <div className="flex flex-col gap-1 justify-center">
                          <button onClick={() => { setEditingHabit(habit); setEditorOpen(true) }}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 text-xs">✏️</button>
                          <button onClick={() => { if (confirm('Delete this habit?')) engine.deleteHabit(habit.id) }}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-red-400 text-xs">🗑️</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12">
              <span className="text-5xl block mb-3">📊</span>
              <p className="text-white/30 text-sm">Stats view coming in M4</p>
            </motion.div>
          )}

          {tab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12">
              <span className="text-5xl block mb-3">⚙️</span>
              <p className="text-white/30 text-sm">Settings coming in M2</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating add button */}
      {tab === 'today' && engine.habits.length > 0 && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { setEditingHabit(null); setEditorOpen(true) }}
          className="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-900/50 text-2xl"
        >
          +
        </motion.button>
      )}

      {/* Editor modal */}
      <AnimatePresence>
        {editorOpen && (
          <HabitEditor
            habit={editingHabit}
            onSave={async (data) => {
              if (editingHabit) {
                await engine.editHabit(editingHabit.id, data)
              } else {
                await engine.addHabit(data)
              }
            }}
            onClose={() => setEditorOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Onboarding Component ──

function Onboarding({ onCreate, onBack }: { onCreate: (name: string) => Promise<void>; onBack: () => void }) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    setCreating(true)
    await onCreate(name.trim() || 'Hero')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1033 50%, #0a0a1a 100%)' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm w-full text-center">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
          className="text-7xl block mb-6">⚔️</motion.span>

        <h1 className="text-3xl font-bold text-white mb-2">Habit RPG</h1>
        <p className="text-white/40 text-sm mb-8">Build habits. Grow your character.</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <p className="text-white/60 text-xs mb-3">Name your character</p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Hero"
            maxLength={20}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center text-white text-lg font-bold placeholder:text-white/20 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCreate}
          disabled={creating}
          className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold text-lg hover:bg-indigo-500 disabled:opacity-50 transition-all"
        >
          {creating ? 'Creating...' : 'Begin Quest'}
        </motion.button>

        <button onClick={onBack} className="text-white/30 text-xs mt-4 block mx-auto hover:text-white/60 transition-colors">
          ← Back to app
        </button>
      </motion.div>
    </div>
  )
}
