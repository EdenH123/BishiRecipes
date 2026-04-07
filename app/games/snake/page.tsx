'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const CELL = 20
const FOOD_EMOJIS = ['🍕', '🍔', '🌮', '🍩', '🧁', '🍪', '🥐', '🍟', '🌭', '🍫', '🥙', '🍗', '🍣', '🥑']

type Dir = 'up' | 'down' | 'left' | 'right'
type Point = { x: number; y: number }

export default function SnakeGame() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)

  const snake = useRef<Point[]>([])
  const dir = useRef<Dir>('left')
  const nextDir = useRef<Dir>('left')
  const food = useRef<Point>({ x: 5, y: 5 })
  const foodEmoji = useRef('🍕')
  const scoreRef = useRef(0)
  const gameStateRef = useRef<'idle' | 'playing' | 'over'>('idle')
  const tickCount = useRef(0)
  const speed = useRef(8) // frames per move

  useEffect(() => {
    const saved = localStorage.getItem('snake_high_score')
    if (saved) setHighScore(parseInt(saved))
  }, [])

  const cols = useRef(0)
  const rows = useRef(0)

  function spawnFood() {
    let pos: Point
    do {
      pos = {
        x: Math.floor(Math.random() * cols.current),
        y: Math.floor(Math.random() * rows.current),
      }
    } while (snake.current.some(s => s.x === pos.x && s.y === pos.y))
    food.current = pos
    foodEmoji.current = FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)]
  }

  function resetGame() {
    const cx = Math.floor(cols.current / 2)
    const cy = Math.floor(rows.current / 2)
    snake.current = [
      { x: cx, y: cy },
      { x: cx + 1, y: cy },
      { x: cx + 2, y: cy },
    ]
    dir.current = 'left'
    nextDir.current = 'left'
    scoreRef.current = 0
    setScore(0)
    tickCount.current = 0
    speed.current = 8
    spawnFood()
  }

  function startGame() {
    resetGame()
    gameStateRef.current = 'playing'
    setGameState('playing')
  }

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    const w = Math.min(window.innerWidth - 16, 400)
    const h = Math.min(window.innerHeight - 200, 500)
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    cols.current = Math.floor(w / CELL)
    rows.current = Math.floor(h / CELL)

    function draw() {
      // Background
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, w, h)

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      for (let x = 0; x < w; x += CELL) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
      }
      for (let y = 0; y < h; y += CELL) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }

      // Food
      ctx.font = `${CELL - 2}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(foodEmoji.current, food.current.x * CELL + CELL / 2, food.current.y * CELL + CELL / 2)

      // Snake
      snake.current.forEach((seg, i) => {
        const isHead = i === 0
        ctx.fillStyle = isHead ? '#4ade80' : `hsl(142, 70%, ${55 - i * 1.5}%)`
        const r = isHead ? 5 : 3
        const x = seg.x * CELL + 1
        const y = seg.y * CELL + 1
        const s = CELL - 2
        ctx.beginPath()
        ctx.roundRect(x, y, s, s, r)
        ctx.fill()

        if (isHead) {
          // Eyes
          ctx.fillStyle = 'white'
          ctx.beginPath()
          ctx.arc(x + s * 0.3, y + s * 0.35, 2.5, 0, Math.PI * 2)
          ctx.arc(x + s * 0.7, y + s * 0.35, 2.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#1a1a2e'
          ctx.beginPath()
          ctx.arc(x + s * 0.3, y + s * 0.35, 1, 0, Math.PI * 2)
          ctx.arc(x + s * 0.7, y + s * 0.35, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // Score
      ctx.save()
      ctx.font = 'bold 18px Rubik, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText(String(scoreRef.current), w - 10, 25)
      ctx.restore()
    }

    function tick() {
      dir.current = nextDir.current
      const head = snake.current[0]
      let nx = head.x
      let ny = head.y

      if (dir.current === 'left') nx--
      if (dir.current === 'right') nx++
      if (dir.current === 'up') ny--
      if (dir.current === 'down') ny++

      // Wall collision — wrap around
      if (nx < 0) nx = cols.current - 1
      if (nx >= cols.current) nx = 0
      if (ny < 0) ny = rows.current - 1
      if (ny >= rows.current) ny = 0

      // Self collision
      if (snake.current.some(s => s.x === nx && s.y === ny)) {
        gameStateRef.current = 'over'
        setGameState('over')
        if (scoreRef.current > highScore) {
          setHighScore(scoreRef.current)
          localStorage.setItem('snake_high_score', String(scoreRef.current))
        }
        return
      }

      snake.current.unshift({ x: nx, y: ny })

      // Eat food
      if (nx === food.current.x && ny === food.current.y) {
        scoreRef.current++
        setScore(scoreRef.current)
        spawnFood()
        if (scoreRef.current % 5 === 0 && speed.current > 4) speed.current--
      } else {
        snake.current.pop()
      }
    }

    function loop() {
      if (gameStateRef.current === 'playing') {
        tickCount.current++
        if (tickCount.current % speed.current === 0) tick()
      }
      draw()

      if (gameStateRef.current === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(0, 0, w, h)
        ctx.font = 'bold 24px Rubik, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#4ade80'
        ctx.fillText('🐍 נחש הפלאפל', w / 2, h / 2 - 20)
        ctx.font = '14px Rubik, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.fillText('לחצו כדי להתחיל', w / 2, h / 2 + 20)
      }

      if (gameStateRef.current === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, 0, w, h)
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  // Touch controls
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const handleDir = useCallback((newDir: Dir) => {
    const opp: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
    if (newDir !== opp[dir.current]) nextDir.current = newDir
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (gameStateRef.current === 'idle') { startGame(); return }
      const map: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
      if (map[e.key]) { e.preventDefault(); handleDir(map[e.key]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleDir])

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
      if (gameStateRef.current === 'idle') startGame()
      return
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      handleDir(dx > 0 ? 'right' : 'left')
    } else {
      handleDir(dy > 0 ? 'down' : 'up')
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center font-rubik" dir="rtl">
      <div className="w-full max-w-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐍</span>
          <h1 className="text-lg font-bold text-green-400">נחש הפלאפל</h1>
        </div>
        <button onClick={() => router.push('/games')} className="text-white/50 text-sm active:scale-95">חזרה</button>
      </div>

      <div className="flex gap-6 text-sm text-white/60 mb-3">
        <span>ניקוד: <b className="text-green-400">{score}</b></span>
        <span>שיא: <b className="text-amber-400">{highScore}</b></span>
      </div>

      <canvas
        ref={canvasRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (gameStateRef.current === 'idle') startGame() }}
        className="rounded-xl border-2 border-white/10 touch-none"
      />

      {/* D-pad for mobile */}
      {gameState === 'playing' && (
        <div className="mt-4 grid grid-cols-3 gap-1 w-36">
          <div />
          <button onTouchStart={() => handleDir('up')} className="bg-white/10 rounded-lg p-3 text-white active:bg-white/20">
            <span className="material-symbols-outlined">expand_less</span>
          </button>
          <div />
          <button onTouchStart={() => handleDir('right')} className="bg-white/10 rounded-lg p-3 text-white active:bg-white/20">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <button onTouchStart={() => handleDir('down')} className="bg-white/10 rounded-lg p-3 text-white active:bg-white/20">
            <span className="material-symbols-outlined">expand_more</span>
          </button>
          <button onTouchStart={() => handleDir('left')} className="bg-white/10 rounded-lg p-3 text-white active:bg-white/20">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        </div>
      )}

      {gameState === 'over' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center">
          <p className="text-red-400 font-bold text-lg mb-2">Game Over! ניקוד: {score}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={startGame} className="bg-green-500 text-white px-6 py-2.5 rounded-full font-bold active:scale-95">
              שחקו שוב
            </button>
            <button onClick={() => router.push('/games')} className="bg-white/10 text-white px-6 py-2.5 rounded-full font-bold active:scale-95">
              חזרה
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
