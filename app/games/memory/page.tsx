'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

const FOOD_PAIRS = ['🍕', '🍔', '🌮', '🍩', '🧁', '🍪', '🍰', '🥐', '🍟', '🌭', '🥯', '🍫', '🥙', '🧇', '🍗', '🍣', '🥑', '🍜']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getStarRating(moves: number, pairCount: number): number {
  const ratio = moves / pairCount
  if (ratio <= 1.5) return 3
  if (ratio <= 2.5) return 2
  return 1
}

function getBestTimeKey(size: number): string {
  return `memory_best_time_${size}`
}

function getBestTime(size: number): number | null {
  if (typeof window === 'undefined') return null
  const val = localStorage.getItem(getBestTimeKey(size))
  return val ? parseInt(val, 10) : null
}

function setBestTimeStorage(size: number, time: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(getBestTimeKey(size), String(time))
}

interface ConfettiParticle {
  id: number
  x: number
  y: number
  color: string
  size: number
  rotation: number
  velocityX: number
  velocityY: number
  delay: number
}

function generateConfetti(count: number): ConfettiParticle[] {
  const colors = ['#ff6b9d', '#c06cf3', '#ffcb47', '#5ce0d8', '#ff8a5c', '#a8e06c', '#6cb4ee']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    velocityX: (Math.random() - 0.5) * 40,
    velocityY: 60 + Math.random() * 40,
    delay: Math.random() * 0.8,
  }))
}

export default function MemoryGame() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [gridSize, setGridSize] = useState(4)
  const [cards, setCards] = useState<string[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const [gameWon, setGameWon] = useState(false)
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [timer, setTimer] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [locked, setLocked] = useState(false)
  const [combo, setCombo] = useState(0)
  const [comboDisplay, setComboDisplay] = useState(0)
  const [points, setPoints] = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([])
  const [recentlyMatched, setRecentlyMatched] = useState<Set<number>>(new Set())
  const [bestTimeForSize, setBestTimeForSize] = useState<number | null>(null)

  const startGame = useCallback((size: number) => {
    const pairCount = (size * size) / 2
    const selected = FOOD_PAIRS.slice(0, pairCount)
    const deck = shuffle([...selected, ...selected])
    setCards(deck)
    setFlipped([])
    setMatched(new Set())
    setMoves(0)
    setGameWon(false)
    setTimer(0)
    setTimerActive(true)
    setGridSize(size)
    setLocked(false)
    setCombo(0)
    setComboDisplay(0)
    setPoints(0)
    setNewRecord(false)
    setConfetti([])
    setRecentlyMatched(new Set())
    setBestTimeForSize(getBestTime(size))
  }, [])

  useEffect(() => { startGame(4) }, [startGame])

  // Timer
  useEffect(() => {
    if (!timerActive) return
    const id = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [timerActive])

  // Check for win
  useEffect(() => {
    if (cards.length > 0 && matched.size === cards.length) {
      setGameWon(true)
      setTimerActive(false)
      setConfetti(generateConfetti(60))
      if (!bestScore || moves < bestScore) setBestScore(moves)

      const prevBest = getBestTime(gridSize)
      if (prevBest === null || timer < prevBest) {
        setBestTimeStorage(gridSize, timer)
        setNewRecord(true)
        setBestTimeForSize(timer)
      }
    }
  }, [matched, cards, moves, bestScore, gridSize, timer])

  function handleFlip(index: number) {
    if (locked || flipped.includes(index) || matched.has(index)) return

    const newFlipped = [...flipped, index]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setLocked(true)
      setMoves(m => m + 1)
      const [a, b] = newFlipped
      if (cards[a] === cards[b]) {
        const newCombo = combo + 1
        setCombo(newCombo)
        setComboDisplay(newCombo)
        const comboMultiplier = Math.min(newCombo, 5)
        setPoints(p => p + 100 * comboMultiplier)

        setTimeout(() => {
          setMatched(prev => {
            const next = new Set(prev)
            next.add(a)
            next.add(b)
            return next
          })
          setRecentlyMatched(new Set([a, b]))
          setTimeout(() => setRecentlyMatched(new Set()), 1200)
          setFlipped([])
          setLocked(false)
        }, 500)
      } else {
        setCombo(0)
        setTimeout(() => {
          setComboDisplay(0)
        }, 300)
        setTimeout(() => {
          setFlipped([])
          setLocked(false)
        }, 700)
      }
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const stars = gameWon ? getStarRating(moves, cards.length / 2) : 0

  return (
    <div className="min-h-screen font-rubik relative overflow-hidden" dir="rtl" style={{
      background: 'linear-gradient(135deg, #1a0533 0%, #2d1052 30%, #4a1259 60%, #6b1d5e 100%)',
    }}>
      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes greenGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(74, 222, 128, 0.4), 0 0 20px rgba(74, 222, 128, 0.2); }
          50% { box-shadow: 0 0 16px rgba(74, 222, 128, 0.7), 0 0 36px rgba(74, 222, 128, 0.4); }
        }
        .card-matched-glow {
          animation: greenGlow 1.2s ease-in-out infinite;
        }
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .card-inner.is-flipped {
          transform: rotateY(180deg);
        }
        .card-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
        }
        .card-front {
          transform: rotateY(180deg);
          background: white;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .card-back {
          background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
          border: 2px solid rgba(255,255,255,0.2);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .card-matched-front {
          transform: rotateY(180deg);
          background: rgba(74, 222, 128, 0.15);
          border: 2px solid rgba(74, 222, 128, 0.6);
        }
        @keyframes comboPopIn {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
        .combo-pop {
          animation: comboPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes confettiFall {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Confetti */}
      <AnimatePresence>
        {confetti.length > 0 && confetti.map(p => (
          <motion.div
            key={p.id}
            initial={{ x: `${p.x}vw`, y: `${p.y}vh`, rotate: 0, opacity: 1 }}
            animate={{
              x: `${p.x + p.velocityX}vw`,
              y: `${p.y + p.velocityY}vh`,
              rotate: p.rotation + 360,
              opacity: 0,
            }}
            transition={{ duration: 2.5, delay: p.delay, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.size > 10 ? '50%' : '2px',
              zIndex: 50,
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md shadow-sm" style={{
        background: 'rgba(26, 5, 51, 0.85)',
      }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🃏</span>
            <h1 className="text-lg font-bold text-white">זיכרון מצרכים</h1>
          </div>
          <button
            onClick={() => router.push('/games')}
            className="text-white/70 text-sm active:scale-95"
          >
            חזרה
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Stats bar */}
        <div className="flex justify-between items-center mb-3 text-white/80 text-sm">
          <span>מהלכים: <b className="text-white">{moves}</b></span>
          <span>זמן: <b className="text-white">{formatTime(timer)}</b></span>
          <span>נקודות: <b className="text-white">{points}</b></span>
          <span>נמצאו: <b className="text-white">{matched.size / 2}/{cards.length / 2}</b></span>
        </div>

        {/* Combo display */}
        <div className="h-8 flex items-center justify-center mb-2">
          <AnimatePresence mode="wait">
            {comboDisplay >= 2 && (
              <motion.div
                key={comboDisplay}
                initial={{ scale: 0.5, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="text-center"
              >
                <span className="text-lg font-bold" style={{
                  background: 'linear-gradient(90deg, #ffcb47, #ff6b9d, #c06cf3)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {'🔥'.repeat(Math.min(comboDisplay, 5))} קומבו x{comboDisplay}!
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Best time display */}
        {bestTimeForSize !== null && !gameWon && (
          <div className="text-center text-white/50 text-xs mb-2">
            שיא: {formatTime(bestTimeForSize)}
          </div>
        )}

        {/* Difficulty buttons */}
        <div className="flex gap-2 mb-4 justify-center">
          {[
            { size: 4, label: '4×4' },
            { size: 6, label: '6×6' },
          ].map(d => (
            <button
              key={d.size}
              onClick={() => startGame(d.size)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${
                gridSize === d.size
                  ? 'bg-white text-purple-900 shadow-lg shadow-white/20'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div
          className="grid gap-2 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            maxWidth: gridSize === 4 ? 320 : 380,
            perspective: '1000px',
          }}
        >
          {cards.map((card, i) => {
            const isFlipped = flipped.includes(i) || matched.has(i)
            const isMatched = matched.has(i)
            const isRecentlyMatched = recentlyMatched.has(i)
            const cardSize = gridSize === 6 ? 'text-xl' : 'text-3xl'

            return (
              <motion.button
                key={i}
                onClick={() => handleFlip(i)}
                whileTap={!locked ? { scale: 0.95 } : undefined}
                className={`aspect-square rounded-xl ${isRecentlyMatched ? 'card-matched-glow' : ''}`}
                style={{ perspective: '600px' }}
              >
                <div className={`card-inner ${isFlipped ? 'is-flipped' : ''}`}>
                  {/* Back face */}
                  <div className="card-face card-back">
                    <span className="text-white/60 text-2xl font-bold select-none">?</span>
                  </div>
                  {/* Front face */}
                  <div className={`card-face ${isMatched ? 'card-matched-front card-matched-glow' : 'card-front'}`}>
                    <span className={`${cardSize} select-none`}>{card}</span>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Win overlay */}
        <AnimatePresence>
          {gameWon && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="mt-6 backdrop-blur-md rounded-2xl p-6 text-center border border-white/10"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(219,39,119,0.3))',
              }}
            >
              {/* Stars */}
              <div className="flex justify-center gap-1 mb-3">
                {[1, 2, 3].map(s => (
                  <motion.span
                    key={s}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2 + s * 0.15, type: 'spring', stiffness: 300 }}
                    className="text-3xl"
                  >
                    {s <= stars ? '⭐' : '☆'}
                  </motion.span>
                ))}
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">כל הכבוד!</h2>

              {newRecord && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                  className="mb-2"
                >
                  <span className="text-lg font-bold px-4 py-1 rounded-full inline-block" style={{
                    background: 'linear-gradient(90deg, #ffcb47, #ff6b9d)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    שיא חדש! 🏆
                  </span>
                </motion.div>
              )}

              <p className="text-white/80 mb-1">סיימתם ב-{moves} מהלכים</p>
              <p className="text-white/80 mb-1">זמן: {formatTime(timer)}</p>
              <p className="text-white/80 mb-4">נקודות: {points}</p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => startGame(gridSize)}
                  className="px-6 py-2.5 rounded-full font-bold active:scale-95 transition-all text-purple-900"
                  style={{
                    background: 'linear-gradient(135deg, #fff, #f0e6ff)',
                    boxShadow: '0 4px 20px rgba(255,255,255,0.25)',
                  }}
                >
                  שחקו שוב
                </button>
                <button
                  onClick={() => router.push('/games')}
                  className="bg-white/15 text-white px-6 py-2.5 rounded-full font-bold active:scale-95 transition-all hover:bg-white/25 border border-white/10"
                >
                  חזרה
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
