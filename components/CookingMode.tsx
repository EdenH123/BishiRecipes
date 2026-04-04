'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CookingModeProps {
  steps: string[]
  title: string
  onClose: () => void
}

export default function CookingMode({ steps, title, onClose }: CookingModeProps) {
  const [current, setCurrent] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerInput, setTimerInput] = useState(5) // minutes

  // Keep screen awake
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null
    async function requestWake() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch {}
    }
    requestWake()
    return () => { wakeLock?.release() }
  }, [])

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return
    const interval = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) {
          setTimerRunning(false)
          // Play alarm sound
          try {
            const audioCtx = new AudioContext()
            for (let i = 0; i < 3; i++) {
              const osc = audioCtx.createOscillator()
              const gain = audioCtx.createGain()
              osc.connect(gain)
              gain.connect(audioCtx.destination)
              osc.frequency.value = 880
              gain.gain.value = 0.3
              osc.start(audioCtx.currentTime + i * 0.3)
              osc.stop(audioCtx.currentTime + i * 0.3 + 0.2)
            }
          } catch {}
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timerRunning, timerSeconds])

  const timerMM = String(Math.floor(timerSeconds / 60)).padStart(2, '0')
  const timerSS = String(timerSeconds % 60).padStart(2, '0')

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        setCurrent((c) => Math.min(c + 1, steps.length - 1))
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        setCurrent((c) => Math.max(c - 1, 0))
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [steps.length, onClose])

  const isFirst = current === 0
  const isLast = current === steps.length - 1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-on-surface text-white"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-lg font-bold truncate max-w-[60%]">{title}</h2>
        <span className="text-sm text-white/60">
          {current + 1} / {steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 px-6 mt-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= current ? 'bg-primary' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div
        className="flex-1 flex items-center justify-center px-8"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          if (x < rect.width / 2) {
            setCurrent((c) => Math.max(c - 1, 0))
          } else {
            setCurrent((c) => Math.min(c + 1, steps.length - 1))
          }
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <span className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold">
              {current + 1}
            </span>
            <p className="mt-6 text-2xl leading-relaxed font-medium">
              {steps[current]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center gap-3 px-6 mb-4">
        {timerSeconds > 0 || timerRunning ? (
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-mono font-bold ${timerSeconds <= 10 && timerSeconds > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {timerMM}:{timerSS}
            </span>
            <button
              onClick={() => setTimerRunning((r) => !r)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined">{timerRunning ? 'pause' : 'play_arrow'}</span>
            </button>
            <button
              onClick={() => { setTimerRunning(false); setTimerSeconds(0) }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined">stop</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white/40">timer</span>
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-1">
              <button
                onClick={() => setTimerInput((v) => Math.max(1, v - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <span className="text-sm font-mono min-w-[2rem] text-center">{timerInput}m</span>
              <button
                onClick={() => setTimerInput((v) => v + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
            <button
              onClick={() => { setTimerSeconds(timerInput * 60); setTimerRunning(true) }}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              התחל טיימר
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 pb-8">
        <button
          onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
          disabled={isFirst}
          className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 font-medium transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          <span className="material-symbols-outlined">arrow_forward</span>
          הקודם
        </button>

        {isLast ? (
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold transition-colors hover:bg-primary/80"
          >
            <span className="material-symbols-outlined">check</span>
            סיימתי!
          </button>
        ) : (
          <button
            onClick={() => setCurrent((c) => Math.min(c + 1, steps.length - 1))}
            className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 font-medium transition-colors hover:bg-white/20"
          >
            הבא
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
      </div>
    </motion.div>
  )
}
