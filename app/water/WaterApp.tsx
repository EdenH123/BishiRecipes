'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  loadState, saveState, addEntry, removeEntry, getEntriesForDate,
  dateKey, totalMl, hydrationMl, progressPercent, getAllDrinks,
  findDrink, calcStreak,
} from '@/lib/water/storage'
import { CUSTOM_AMOUNTS_ML } from '@/lib/water/constants'
import type { WaterState, DrinkType } from '@/lib/water/types'
import WeeklyChart from './WeeklyChart'
import WaterSettings from './WaterSettings'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'

type View = 'today' | 'week' | 'settings'

export default function WaterApp() {
  const router = useRouter()
  const [state, setState] = useState<WaterState | null>(null)
  const [view, setView] = useState<View>('today')
  const [splash, setSplash] = useState<{ id: number; x: number; ml: number } | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customAmount, setCustomAmount] = useState(250)
  const [customDrinkId, setCustomDrinkId] = useState('water')
  const reachedTodayRef = useRef(false)

  // Load on mount
  useEffect(() => {
    setState(loadState())
  }, [])

  // Save on change
  useEffect(() => {
    if (state) saveState(state)
  }, [state])

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-100 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
      </div>
    )
  }

  const today = dateKey()
  const todayEntries = getEntriesForDate(state, today)
  const todayTotal = totalMl(todayEntries)
  const todayHydration = hydrationMl(state, todayEntries)
  const percent = progressPercent(todayHydration, state.dailyGoalMl)
  const streak = calcStreak(state)
  const drinks = getAllDrinks(state)

  function handleAdd(drink: DrinkType, ml: number, x: number = window.innerWidth / 2) {
    const next = addEntry(state!, { typeId: drink.id, ml, timestamp: Date.now() })
    setState(next)
    // Splash effect
    setSplash({ id: Date.now(), x, ml })
    setTimeout(() => setSplash(null), 800)
    // Vibration
    try { navigator?.vibrate?.(10) } catch {}
    // Celebration if just reached goal
    const newHydration = hydrationMl(next, getEntriesForDate(next, today))
    if (newHydration >= next.dailyGoalMl && !reachedTodayRef.current) {
      reachedTodayRef.current = true
      setShowCelebration(true)
      try { navigator?.vibrate?.([100, 50, 100]) } catch {}
      setTimeout(() => setShowCelebration(false), 3500)
    }
  }

  function handleRemove(entryId: string) {
    setState(removeEntry(state!, entryId))
  }

  function formatTime(ts: number): string {
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-sky-50 via-blue-50 to-indigo-50 font-rubik pt-20 pb-32 select-none">
      <Navbar />

      {/* Confetti / celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{ x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400, opacity: 0, scale: 1.5, rotate: Math.random() * 360 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="absolute text-3xl">💧</motion.div>
            ))}
            <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }}
              className="bg-white rounded-3xl p-6 text-center shadow-2xl">
              <span className="text-5xl block mb-2">🎉</span>
              <p className="text-xl font-bold text-blue-600">כל הכבוד!</p>
              <p className="text-sm text-blue-400 mt-1">הגעת ליעד היומי</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Splash effect on add */}
      <AnimatePresence>
        {splash && (
          <motion.div key={splash.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], y: -60, scale: 1.4 }}
            transition={{ duration: 0.8 }}
            className="fixed top-1/3 z-30 pointer-events-none text-2xl font-bold text-blue-500"
            style={{ left: splash.x - 30 }}
          >+{splash.ml}ml 💧</motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-blue-900">💧 מעקב שתייה</h1>
          {streak > 0 && (
            <p className="text-xs text-blue-600/60 mt-1">🔥 רצף {streak} ימים</p>
          )}
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mb-5 bg-white/60 backdrop-blur rounded-2xl p-1 shadow-sm">
          {([
            { key: 'today' as View, label: 'היום', icon: '💧' },
            { key: 'week' as View, label: 'שבוע', icon: '📊' },
            { key: 'settings' as View, label: 'הגדרות', icon: '⚙️' },
          ]).map(t => (
            <button key={t.key} onClick={() => setView(t.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${view === t.key ? 'bg-blue-500 text-white shadow-md' : 'text-blue-700/60'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {view === 'today' && (
            <motion.div key="today" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              {/* Animated cup */}
              <div className="relative flex justify-center mb-6">
                <CupVisual percent={percent} totalMl={todayHydration} goalMl={state.dailyGoalMl} />
              </div>

              {/* Quick add buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {drinks.slice(0, 6).map(drink => (
                  <motion.button
                    key={drink.id}
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => handleAdd(drink, drink.defaultMl, e.clientX)}
                    className="flex flex-col items-center gap-1 rounded-2xl bg-white/80 backdrop-blur p-3 shadow-sm hover:shadow-md transition-shadow border border-blue-100"
                  >
                    <span className="text-2xl">{drink.emoji}</span>
                    <span className="text-xs font-bold text-blue-900">{drink.name}</span>
                    <span className="text-[10px] text-blue-500/60">{drink.defaultMl}ml</span>
                  </motion.button>
                ))}
              </div>

              {/* Custom amount button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setCustomOpen(true)}
                className="w-full mb-4 rounded-2xl bg-blue-100/60 hover:bg-blue-200/60 border border-blue-200 py-2.5 text-sm font-bold text-blue-700 transition-colors"
              >
                ✏️ כמות מותאמת
              </motion.button>

              {/* Today's entries */}
              <div className="bg-white/70 backdrop-blur rounded-2xl p-4 shadow-sm">
                <h2 className="text-sm font-bold text-blue-900 mb-3">היום שתיתי:</h2>
                {todayEntries.length === 0 ? (
                  <p className="text-center text-blue-400/60 py-6 text-sm">עדיין לא שתית כלום היום 🥺</p>
                ) : (
                  <div className="space-y-2">
                    {[...todayEntries].reverse().map(entry => {
                      const drink = findDrink(state, entry.typeId)
                      if (!drink) return null
                      return (
                        <motion.div key={entry.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center gap-3 bg-blue-50/50 rounded-xl px-3 py-2"
                        >
                          <span className="text-xl">{drink.emoji}</span>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-blue-900">{drink.name}</p>
                            <p className="text-[10px] text-blue-500/60">{formatTime(entry.timestamp)}</p>
                          </div>
                          <span className="text-sm font-bold text-blue-700">{entry.ml}ml</span>
                          <button onClick={() => handleRemove(entry.id)} className="text-red-400/40 hover:text-red-500 text-lg">×</button>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-blue-100 flex justify-between text-xs">
                  <span className="text-blue-500/60">סה״כ נוזלים: {todayTotal}ml</span>
                  <span className="text-blue-700 font-bold">הידרציה: {Math.round(todayHydration)}ml</span>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'week' && (
            <motion.div key="week" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <WeeklyChart state={state} />
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <WaterSettings state={state} onChange={setState} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom amount modal */}
      <AnimatePresence>
        {customOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCustomOpen(false)}
            className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center p-4">
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl w-full max-w-md p-5 mb-[-1rem]">
              <div className="flex justify-center mb-3"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
              <h3 className="text-lg font-bold text-blue-900 mb-3 text-center">כמות מותאמת</h3>

              {/* Drink type */}
              <p className="text-xs text-blue-600 mb-2">בחר משקה:</p>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {drinks.map(d => (
                  <button key={d.id} onClick={() => setCustomDrinkId(d.id)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-sm transition-all ${customDrinkId === d.id ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700'}`}>
                    {d.emoji} {d.name}
                  </button>
                ))}
              </div>

              {/* Quick amounts */}
              <p className="text-xs text-blue-600 mb-2">כמות (ml):</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {CUSTOM_AMOUNTS_ML.map(ml => (
                  <button key={ml} onClick={() => setCustomAmount(ml)}
                    className={`py-2 rounded-xl text-sm font-bold transition-all ${customAmount === ml ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700'}`}>
                    {ml}
                  </button>
                ))}
              </div>

              <input type="number" value={customAmount} onChange={e => setCustomAmount(Number(e.target.value) || 0)}
                className="w-full bg-blue-50 rounded-xl px-3 py-3 text-center text-2xl font-bold text-blue-900 mb-4" />

              <button
                onClick={() => {
                  const drink = drinks.find(d => d.id === customDrinkId)
                  if (drink && customAmount > 0) {
                    handleAdd(drink, customAmount)
                    setCustomOpen(false)
                  }
                }}
                className="w-full bg-blue-500 text-white rounded-xl py-3 font-bold hover:bg-blue-600 active:scale-95 transition-all">
                הוסף
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  )
}

// ── Animated cup component ──
function CupVisual({ percent, totalMl, goalMl }: { percent: number; totalMl: number; goalMl: number }) {
  return (
    <div className="relative w-56 h-72">
      {/* Cup shape (SVG with wavy water fill) */}
      <svg viewBox="0 0 200 280" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Cup outline */}
        <defs>
          <clipPath id="cup-clip">
            <path d="M 30 30 L 170 30 L 155 260 Q 100 275 45 260 Z" />
          </clipPath>
          <linearGradient id="water-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Cup background */}
        <path d="M 30 30 L 170 30 L 155 260 Q 100 275 45 260 Z" fill="white" stroke="#3b82f6" strokeWidth="3" />

        {/* Water fill (clipped to cup) */}
        <g clipPath="url(#cup-clip)">
          <motion.rect
            x="0"
            width="200"
            fill="url(#water-gradient)"
            animate={{ y: 280 - (percent / 100) * 250 }}
            transition={{ type: 'spring', damping: 15, stiffness: 80 }}
            height="280"
          />
          {/* Wave on top of water */}
          <motion.path
            d="M 0 0 Q 50 -8 100 0 T 200 0 L 200 20 L 0 20 Z"
            fill="#bae6fd"
            animate={{ y: 280 - (percent / 100) * 250, x: [-20, 20, -20] }}
            transition={{ y: { type: 'spring', damping: 15, stiffness: 80 }, x: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } }}
            opacity="0.6"
          />
        </g>

        {/* Cup highlight */}
        <path d="M 40 30 L 35 240 Q 38 245 42 245" fill="none" stroke="white" strokeWidth="3" opacity="0.7" />

        {/* Measurement marks */}
        <g stroke="#3b82f6" strokeWidth="1.5" opacity="0.3">
          <line x1="155" y1="80" x2="170" y2="80" />
          <line x1="155" y1="130" x2="170" y2="130" />
          <line x1="155" y1="180" x2="170" y2="180" />
        </g>
      </svg>

      {/* Center text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.p
          key={Math.floor(totalMl)}
          initial={{ scale: 1.2, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold text-blue-900 drop-shadow-md"
        >
          {Math.round(percent)}%
        </motion.p>
        <p className="text-sm font-bold text-blue-800/80 drop-shadow">{Math.round(totalMl)} / {goalMl}ml</p>
      </div>
    </div>
  )
}
