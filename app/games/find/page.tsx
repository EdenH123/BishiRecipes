'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const FALAFEL = '🧆'
const TOTAL_ROUNDS = 10

const EASY_DISTRACTORS = ['🍕', '🍔', '🌮', '🍩', '🧁', '🍪', '🥐', '🍟', '🌭', '🍫', '🥤', '🍰', '🎂', '🍿']
const MEDIUM_DISTRACTORS = ['🥙', '🧅', '🥔', '🫓', '🥯', '🍘', '🥮', '🫘']
const HARD_DISTRACTORS = ['🧶', '🫕', '🥘', '🧄']

const ROUND_CONFIGS: { cols: number; rows: number; difficulty: 'easy' | 'medium' | 'hard' }[] = [
  { cols: 5, rows: 4, difficulty: 'easy' },
  { cols: 6, rows: 4, difficulty: 'easy' },
  { cols: 6, rows: 5, difficulty: 'easy' },
  { cols: 7, rows: 5, difficulty: 'medium' },
  { cols: 7, rows: 6, difficulty: 'medium' },
  { cols: 8, rows: 6, difficulty: 'medium' },
  { cols: 8, rows: 7, difficulty: 'hard' },
  { cols: 9, rows: 7, difficulty: 'hard' },
  { cols: 9, rows: 8, difficulty: 'hard' },
  { cols: 10, rows: 8, difficulty: 'hard' },
]

interface GridItem {
  emoji: string
  x: number
  y: number
  offsetX: number
  offsetY: number
  rotation: number
  isFalafel: boolean
  fadeIn: number // 0-1 for staggered entrance
}

interface RippleEffect {
  x: number
  y: number
  radius: number
  maxRadius: number
  alpha: number
  color: string
}

interface FloatingText {
  x: number
  y: number
  text: string
  alpha: number
  vy: number
  color: string
}

interface ConfettiParticle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  color: string
  size: number
  rotation: number
  rotSpeed: number
}

type GameState = 'idle' | 'countdown' | 'playing' | 'found' | 'roundSummary' | 'gameover'

function getDistractors(difficulty: 'easy' | 'medium' | 'hard'): string[] {
  if (difficulty === 'easy') return EASY_DISTRACTORS
  if (difficulty === 'medium') return [...EASY_DISTRACTORS, ...MEDIUM_DISTRACTORS]
  return [...EASY_DISTRACTORS, ...MEDIUM_DISTRACTORS, ...HARD_DISTRACTORS]
}

function getHighScores(): number[] {
  try {
    const saved = localStorage.getItem('find_falafel_scores')
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

function saveHighScore(score: number): number[] {
  const scores = getHighScores()
  scores.push(score)
  scores.sort((a, b) => b - a)
  const top3 = scores.slice(0, 3)
  localStorage.setItem('find_falafel_scores', JSON.stringify(top3))
  return top3
}

export default function FindFalafelGame() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  const [gameState, setGameState] = useState<GameState>('idle')
  const [round, setRound] = useState(1)
  const [score, setScore] = useState(0)
  const [roundScore, setRoundScore] = useState(0)
  const [roundTime, setRoundTime] = useState(0)
  const [wrongTaps, setWrongTaps] = useState(0)
  const [combo, setCombo] = useState(0)
  const [countdownNum, setCountdownNum] = useState(3)
  const [highScores, setHighScores] = useState<number[]>([])
  const [scoreKey, setScoreKey] = useState(0)

  const gameStateRef = useRef<GameState>('idle')
  const roundRef = useRef(1)
  const scoreRef = useRef(0)
  const roundStartTime = useRef(0)
  const wrongTapsRef = useRef(0)
  const comboRef = useRef(0)
  const gridItems = useRef<GridItem[]>([])
  const ripples = useRef<RippleEffect[]>([])
  const floatingTexts = useRef<FloatingText[]>([])
  const confetti = useRef<ConfettiParticle[]>([])
  const foundRing = useRef<{ x: number; y: number; radius: number; alpha: number; scale: number } | null>(null)
  const canvasDims = useRef({ w: 0, h: 0, cellW: 0, cellH: 0 })
  const animTime = useRef(0)
  const gridFadeStart = useRef(0)
  const shakeRef = useRef(0)

  useEffect(() => {
    setHighScores(getHighScores())
  }, [])

  function generateGrid(roundIndex: number) {
    const config = ROUND_CONFIGS[roundIndex]
    const distractors = getDistractors(config.difficulty)
    const totalItems = config.cols * config.rows
    const items: GridItem[] = []
    const falafelPos = Math.floor(Math.random() * totalItems)
    const { w, h } = canvasDims.current
    const cellW = w / config.cols
    const cellH = h / config.rows
    canvasDims.current.cellW = cellW
    canvasDims.current.cellH = cellH

    for (let i = 0; i < totalItems; i++) {
      const col = i % config.cols
      const row = Math.floor(i / config.cols)
      items.push({
        emoji: i === falafelPos ? FALAFEL : distractors[Math.floor(Math.random() * distractors.length)],
        x: col * cellW + cellW / 2,
        y: row * cellH + cellH / 2,
        offsetX: (Math.random() - 0.5) * cellW * 0.2,
        offsetY: (Math.random() - 0.5) * cellH * 0.2,
        rotation: (Math.random() - 0.5) * 0.4,
        isFalafel: i === falafelPos,
        fadeIn: 0,
      })
    }
    gridItems.current = items
    gridFadeStart.current = performance.now()
  }

  function startGame() {
    roundRef.current = 1
    scoreRef.current = 0
    comboRef.current = 0
    setRound(1)
    setScore(0)
    setCombo(0)
    startCountdown()
  }

  function startCountdown() {
    gameStateRef.current = 'countdown'
    setGameState('countdown')
    setCountdownNum(3)
    wrongTapsRef.current = 0
    setWrongTaps(0)

    let count = 3
    const iv = setInterval(() => {
      count--
      if (count <= 0) {
        clearInterval(iv)
        startRound()
      } else {
        setCountdownNum(count)
      }
    }, 700)
  }

  function startRound() {
    generateGrid(roundRef.current - 1)
    roundStartTime.current = performance.now()
    wrongTapsRef.current = 0
    setWrongTaps(0)
    gameStateRef.current = 'playing'
    setGameState('playing')
    ripples.current = []
    floatingTexts.current = []
    confetti.current = []
    foundRing.current = null
  }

  function calculateRoundScore(timeSec: number, wrongCount: number, currentCombo: number): number {
    let base = 1000
    base -= Math.floor(timeSec) * 10
    base -= wrongCount * 50
    base = Math.max(base, 100)
    if (currentCombo >= 2) base = Math.floor(base * 1.5)
    if (currentCombo >= 3) base = Math.floor(base * (2 / 1.5)) // net x2
    return base
  }

  function handleFound(item: GridItem) {
    const elapsed = (performance.now() - roundStartTime.current) / 1000
    const newCombo = elapsed < 3 ? comboRef.current + 1 : 0
    comboRef.current = newCombo
    setCombo(newCombo)

    const rs = calculateRoundScore(elapsed, wrongTapsRef.current, newCombo)
    scoreRef.current += rs
    setScore(scoreRef.current)
    setScoreKey(k => k + 1)
    setRoundScore(rs)
    setRoundTime(Math.round(elapsed * 10) / 10)

    // Found ring animation
    foundRing.current = { x: item.x + item.offsetX, y: item.y + item.offsetY, radius: 0, alpha: 1, scale: 0 }

    // Confetti burst
    const cx = item.x + item.offsetX
    const cy = item.y + item.offsetY
    const colors = ['#ffd700', '#ff6b6b', '#4ade80', '#60a5fa', '#f472b6', '#fbbf24']
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.3
      const speed = 2 + Math.random() * 4
      confetti.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      })
    }

    // Floating score text
    floatingTexts.current.push({
      x: cx, y: cy - 20,
      text: `+${rs}`,
      alpha: 1, vy: -1.5,
      color: '#ffd700',
    })

    gameStateRef.current = 'found'
    setGameState('found')

    setTimeout(() => {
      if (roundRef.current >= TOTAL_ROUNDS) {
        endGame()
      } else {
        showRoundSummary()
      }
    }, 1500)
  }

  function showRoundSummary() {
    gameStateRef.current = 'roundSummary'
    setGameState('roundSummary')
  }

  function nextRound() {
    roundRef.current += 1
    setRound(roundRef.current)
    startCountdown()
  }

  function endGame() {
    gameStateRef.current = 'gameover'
    setGameState('gameover')
    const newScores = saveHighScore(scoreRef.current)
    setHighScores(newScores)
  }

  function handleWrongTap(x: number, y: number) {
    wrongTapsRef.current++
    setWrongTaps(wrongTapsRef.current)
    shakeRef.current = 8

    ripples.current.push({
      x, y, radius: 0, maxRadius: 40, alpha: 0.7, color: 'rgba(239, 68, 68,',
    })

    floatingTexts.current.push({
      x, y: y - 10,
      text: '❌',
      alpha: 1, vy: -1,
      color: '#ef4444',
    })
  }

  // Canvas click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.changedTouches[0].clientX
      clientY = e.changedTouches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const scaleX = canvasDims.current.w / rect.width
    const scaleY = canvasDims.current.h / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    const { cellW, cellH } = canvasDims.current
    const hitRadius = Math.min(cellW, cellH) * 0.45

    for (const item of gridItems.current) {
      const ix = item.x + item.offsetX
      const iy = item.y + item.offsetY
      const dist = Math.sqrt((x - ix) ** 2 + (y - iy) ** 2)
      if (dist < hitRadius) {
        if (item.isFalafel) {
          handleFound(item)
        } else {
          handleWrongTap(x, y)
        }
        return
      }
    }
    handleWrongTap(x, y)
  }, [])

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    const w = Math.min(window.innerWidth - 16, 420)
    const h = Math.min(window.innerHeight - 220, 480)
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    canvasDims.current.w = w
    canvasDims.current.h = h

    function drawBackground() {
      const grd = ctx.createLinearGradient(0, 0, 0, h)
      grd.addColorStop(0, '#1a1028')
      grd.addColorStop(1, '#2d1b4e')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, w, h)

      // Subtle pattern dots
      ctx.fillStyle = 'rgba(255,255,255,0.02)'
      for (let px = 0; px < w; px += 20) {
        for (let py = 0; py < h; py += 20) {
          ctx.beginPath()
          ctx.arc(px, py, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    function drawGrid() {
      const now = performance.now()
      const elapsed = now - gridFadeStart.current
      const { cellW, cellH } = canvasDims.current

      // Apply shake
      ctx.save()
      if (shakeRef.current > 0) {
        const sx = (Math.random() - 0.5) * shakeRef.current
        const sy = (Math.random() - 0.5) * shakeRef.current
        ctx.translate(sx, sy)
        shakeRef.current *= 0.85
        if (shakeRef.current < 0.5) shakeRef.current = 0
      }

      const fontSize = Math.min(cellW, cellH) * 0.65
      ctx.font = `${fontSize}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      gridItems.current.forEach((item, i) => {
        // Staggered fade-in
        const staggerDelay = i * 15
        const fadeProgress = Math.min(1, Math.max(0, (elapsed - staggerDelay) / 300))
        item.fadeIn = fadeProgress

        ctx.save()
        ctx.globalAlpha = fadeProgress
        const scale = 0.5 + fadeProgress * 0.5

        const ix = item.x + item.offsetX
        const iy = item.y + item.offsetY

        ctx.translate(ix, iy)
        ctx.rotate(item.rotation)
        ctx.scale(scale, scale)
        ctx.fillText(item.emoji, 0, 0)
        ctx.restore()
      })

      ctx.restore() // shake restore
    }

    function drawRipples() {
      ripples.current = ripples.current.filter(r => {
        r.radius += 3
        r.alpha -= 0.03
        if (r.alpha <= 0) return false
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `${r.color} ${r.alpha})`
        ctx.lineWidth = 3
        ctx.stroke()
        return true
      })
    }

    function drawFloatingTexts() {
      floatingTexts.current = floatingTexts.current.filter(ft => {
        ft.y += ft.vy
        ft.alpha -= 0.015
        if (ft.alpha <= 0) return false
        ctx.save()
        ctx.globalAlpha = ft.alpha
        ctx.font = 'bold 20px Rubik, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = ft.color
        ctx.fillText(ft.text, ft.x, ft.y)
        ctx.restore()
        return true
      })
    }

    function drawConfetti() {
      confetti.current = confetti.current.filter(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.1
        p.vx *= 0.98
        p.alpha -= 0.012
        p.rotation += p.rotSpeed
        if (p.alpha <= 0) return false
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
        return true
      })
    }

    function drawFoundRing() {
      const ring = foundRing.current
      if (!ring) return
      ring.radius += 1.5
      ring.scale = Math.min(1, ring.scale + 0.05)
      if (ring.radius > 50) ring.alpha -= 0.02

      if (ring.alpha <= 0) { foundRing.current = null; return }

      // Golden ring pulse
      ctx.save()
      ctx.globalAlpha = ring.alpha
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, ring.radius * ring.scale, 0, Math.PI * 2)
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 4
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = 15
      ctx.stroke()

      // Inner glow
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, ring.radius * ring.scale * 0.8, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }

    function drawTimer() {
      if (gameStateRef.current !== 'playing') return
      const elapsed = (performance.now() - roundStartTime.current) / 1000
      const timeStr = elapsed.toFixed(1) + 's'
      ctx.save()
      ctx.font = 'bold 16px Rubik, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText(timeStr, 10, 22)
      ctx.restore()
    }

    function drawIdleScreen() {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.font = 'bold 28px Rubik, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fbbf24'
      ctx.fillText('🧆 מצא את הפלאפל', w / 2, h / 2 - 40)

      ctx.font = '15px Rubik, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText('!מצאו את הפלאפל המסתתר בין האוכל', w / 2, h / 2)

      ctx.font = '14px Rubik, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fillText('לחצו כדי להתחיל', w / 2, h / 2 + 35)
      ctx.restore()
    }

    function loop() {
      animTime.current++
      drawBackground()

      if (gameStateRef.current === 'idle') {
        drawIdleScreen()
      }

      if (gameStateRef.current === 'playing' || gameStateRef.current === 'found') {
        drawGrid()
        drawRipples()
        drawFloatingTexts()
        drawConfetti()
        drawFoundRing()
        drawTimer()
      }

      if (gameStateRef.current === 'countdown') {
        drawBackground()
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  const starRating = score >= 8000 ? 3 : score >= 5000 ? 2 : 1
  const stars = '⭐'.repeat(starRating)

  return (
    <div className="min-h-screen bg-[#1a1028] flex flex-col items-center font-rubik" dir="rtl">
      {/* Header */}
      <div className="w-full max-w-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧆</span>
          <h1 className="text-lg font-bold text-amber-400">מצא את הפלאפל</h1>
        </div>
        <button onClick={() => router.push('/games')} className="text-white/50 text-sm active:scale-95">
          <span className="material-symbols-outlined text-xl align-middle">arrow_forward</span> חזרה
        </button>
      </div>

      {/* Score bar */}
      {(gameState === 'playing' || gameState === 'found' || gameState === 'countdown' || gameState === 'roundSummary') && (
        <div className="flex gap-5 text-sm text-white/60 mb-2">
          <span>
            סיבוב: <b className="text-amber-300">{round}/{TOTAL_ROUNDS}</b>
          </span>
          <span>
            ניקוד:{' '}
            <AnimatePresence mode="wait">
              <motion.b
                key={scoreKey}
                initial={{ scale: 1.6, color: '#fbbf24' }}
                animate={{ scale: 1, color: '#fbbf24' }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="inline-block text-amber-400"
              >
                {score}
              </motion.b>
            </AnimatePresence>
          </span>
          {wrongTaps > 0 && (
            <span className="text-red-400">❌ x{wrongTaps}</span>
          )}
          {combo >= 2 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-orange-400 font-bold"
            >
              🔥 x{Math.min(combo, 3)}
            </motion.span>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onTouchEnd={(e) => { e.preventDefault(); handleCanvasClick(e) }}
          className="rounded-xl border-2 border-white/10 touch-none"
        />

        {/* Countdown overlay */}
        <AnimatePresence>
          {gameState === 'countdown' && (
            <motion.div
              key="countdown"
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={countdownNum}
                  initial={{ scale: 2.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="text-7xl font-bold text-amber-400"
                >
                  {countdownNum}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Idle screen button */}
      {gameState === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="mt-6 text-center"
        >
          <button
            onClick={startGame}
            className="bg-amber-500 hover:bg-amber-400 text-white px-8 py-3 rounded-full font-bold text-lg active:scale-95 transition-all shadow-lg shadow-amber-500/30"
          >
            🧆 !יאללה
          </button>
        </motion.div>
      )}

      {/* Found celebration */}
      <AnimatePresence>
        {gameState === 'found' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mt-4 text-center"
          >
            <p className="text-2xl font-bold text-amber-400">!🎉 מצאתם</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round summary */}
      <AnimatePresence>
        {gameState === 'roundSummary' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mt-4 text-center"
          >
            <div className="bg-white/5 backdrop-blur rounded-2xl px-6 py-4 border border-white/10 inline-block">
              <p className="text-amber-400 font-bold text-lg mb-3">סיכום סיבוב {round}</p>
              <div className="flex flex-col gap-1 text-sm text-white/70 mb-3">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  ⏱ זמן: <b className="text-white">{roundTime} שניות</b>
                </motion.div>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  ❌ טעויות: <b className="text-white">{wrongTaps}</b>
                </motion.div>
                {combo >= 2 && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    🔥 קומבו: <b className="text-orange-400">x{Math.min(combo, 3)}</b>
                  </motion.div>
                )}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 15 }}
                  className="text-lg mt-1"
                >
                  ניקוד: <b className="text-amber-400 text-xl">{roundScore}</b>
                </motion.div>
              </div>
              <button
                onClick={nextRound}
                className="bg-amber-500 hover:bg-amber-400 text-white px-6 py-2.5 rounded-full font-bold active:scale-95 transition-all"
              >
                סיבוב הבא ←
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over */}
      <AnimatePresence>
        {gameState === 'gameover' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mt-4 text-center"
          >
            <div className="bg-white/5 backdrop-blur rounded-2xl px-6 py-5 border border-white/10 inline-block">
              <p className="text-3xl mb-2">{stars}</p>
              <p className="text-amber-400 font-bold text-xl mb-1">!סיום המשחק</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 15 }}
                className="text-white text-2xl font-bold mb-3"
              >
                {score} נקודות
              </motion.p>

              {highScores.length > 0 && (
                <div className="mb-4 bg-white/5 rounded-xl px-4 py-2">
                  <p className="text-amber-400 text-sm font-bold mb-1">🏆 שיאים</p>
                  {highScores.map((hs, i) => (
                    <div key={i} className="text-white/70 text-sm flex items-center gap-2 justify-center">
                      <span className="text-amber-300">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      <span className={hs === score ? 'text-amber-400 font-bold' : ''}>{hs}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={startGame}
                  className="bg-amber-500 hover:bg-amber-400 text-white px-6 py-2.5 rounded-full font-bold active:scale-95 transition-all"
                >
                  שחקו שוב
                </button>
                <button
                  onClick={() => router.push('/games')}
                  className="bg-white/10 text-white px-6 py-2.5 rounded-full font-bold active:scale-95"
                >
                  חזרה
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
