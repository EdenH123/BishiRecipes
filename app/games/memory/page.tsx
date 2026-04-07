'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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

export default function MemoryGame() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [gridSize, setGridSize] = useState(4) // 4x4 = 8 pairs
  const [cards, setCards] = useState<string[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const [gameWon, setGameWon] = useState(false)
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [timer, setTimer] = useState(0)
  const [timerActive, setTimerActive] = useState(false)

  function startGame(size: number) {
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
  }

  useEffect(() => { startGame(4) }, [])

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
      if (!bestScore || moves < bestScore) setBestScore(moves)
    }
  }, [matched, cards])

  function handleFlip(index: number) {
    if (flipped.length === 2 || flipped.includes(index) || matched.has(index)) return

    const newFlipped = [...flipped, index]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      const [a, b] = newFlipped
      if (cards[a] === cards[b]) {
        setTimeout(() => {
          setMatched(prev => {
            const next = new Set(prev)
            next.add(a)
            next.add(b)
            return next
          })
          setFlipped([])
        }, 400)
      } else {
        setTimeout(() => setFlipped([]), 700)
      }
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-pink-900 font-rubik" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-purple-900/80 backdrop-blur-md shadow-sm">
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
        <div className="flex justify-between items-center mb-4 text-white/80 text-sm">
          <span>מהלכים: <b className="text-white">{moves}</b></span>
          <span>זמן: <b className="text-white">{formatTime(timer)}</b></span>
          <span>נמצאו: <b className="text-white">{matched.size / 2}/{cards.length / 2}</b></span>
        </div>

        {/* Difficulty buttons */}
        <div className="flex gap-2 mb-4 justify-center">
          {[
            { size: 4, label: '4×4' },
            { size: 6, label: '6×6' },
          ].map(d => (
            <button
              key={d.size}
              onClick={() => startGame(d.size)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                gridSize === d.size ? 'bg-white text-purple-900' : 'bg-white/20 text-white'
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
          }}
        >
          {cards.map((card, i) => {
            const isFlipped = flipped.includes(i) || matched.has(i)
            return (
              <motion.button
                key={i}
                onClick={() => handleFlip(i)}
                whileTap={{ scale: 0.95 }}
                className={`aspect-square rounded-xl text-2xl flex items-center justify-center font-bold transition-all duration-300 ${
                  matched.has(i)
                    ? 'bg-green-500/30 border-2 border-green-400'
                    : isFlipped
                    ? 'bg-white shadow-lg'
                    : 'bg-white/15 border-2 border-white/20 hover:border-white/40'
                }`}
              >
                {isFlipped ? (
                  <motion.span
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className={gridSize === 6 ? 'text-xl' : 'text-3xl'}
                  >
                    {card}
                  </motion.span>
                ) : (
                  <span className="text-white/30 text-xl">?</span>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Win overlay */}
        {gameWon && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-2">🎉 כל הכבוד!</h2>
            <p className="text-white/80 mb-1">סיימתם ב-{moves} מהלכים</p>
            <p className="text-white/80 mb-4">זמן: {formatTime(timer)}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => startGame(gridSize)}
                className="bg-white text-purple-900 px-6 py-2.5 rounded-full font-bold active:scale-95"
              >
                שחקו שוב
              </button>
              <button
                onClick={() => router.push('/games')}
                className="bg-white/20 text-white px-6 py-2.5 rounded-full font-bold active:scale-95"
              >
                חזרה
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
