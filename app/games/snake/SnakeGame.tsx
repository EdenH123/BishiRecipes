'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const CELL = 20
const FOOD_EMOJIS = ['🍕', '🍔', '🌮', '🍩', '🧁', '🍪', '🥐', '🍟', '🌭', '🍫', '🥙', '🍗', '🍣', '🥑', '🍰', '🍓', '🍇', '🍉', '🥩', '🧆', '🥗', '🍜', '🍱', '🥘', '🫓']
const GOLDEN_EMOJI = '🌟'

type Dir = 'up' | 'down' | 'left' | 'right'
type Point = { x: number; y: number }
type FoodType = 'regular' | 'golden'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

interface DeathSegment {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  color: string
  rotation: number
  rotSpeed: number
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function getHighScores(): number[] {
  try {
    const saved = localStorage.getItem('snake_high_scores')
    if (saved) return JSON.parse(saved)
  } catch {}
  // Migrate old single high score
  try {
    const old = localStorage.getItem('snake_high_score')
    if (old) {
      const scores = [parseInt(old)]
      localStorage.setItem('snake_high_scores', JSON.stringify(scores))
      return scores
    }
  } catch {}
  return []
}

function saveHighScore(score: number): number[] {
  const scores = getHighScores()
  scores.push(score)
  scores.sort((a, b) => b - a)
  const top3 = scores.slice(0, 3)
  localStorage.setItem('snake_high_scores', JSON.stringify(top3))
  return top3
}

export default function SnakeGame() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle')
  const [score, setScore] = useState(0)
  const [highScores, setHighScores] = useState<number[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [scoreKey, setScoreKey] = useState(0) // triggers bounce animation
  const [shakeClass, setShakeClass] = useState(false)

  const snake = useRef<Point[]>([])
  const prevSnake = useRef<Point[]>([]) // previous tick positions for lerp
  const dir = useRef<Dir>('left')
  const nextDir = useRef<Dir>('left')
  const food = useRef<Point>({ x: 5, y: 5 })
  const foodEmoji = useRef('🍕')
  const foodType = useRef<FoodType>('regular')
  const scoreRef = useRef(0)
  const gameStateRef = useRef<'idle' | 'playing' | 'over'>('idle')
  const pausedRef = useRef(false)
  const tickCount = useRef(0)
  const speed = useRef(8) // frames per move
  const tickProgress = useRef(0) // 0..1 interpolation between ticks
  const particles = useRef<Particle[]>([])
  const deathSegments = useRef<DeathSegment[]>([])
  const deathTimer = useRef(0)
  const gridPhase = useRef(0)
  const dpadPressed = useRef<Record<string, boolean>>({})

  useEffect(() => {
    setHighScores(getHighScores())
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
    // 10% chance of golden food
    if (Math.random() < 0.1) {
      foodType.current = 'golden'
      foodEmoji.current = GOLDEN_EMOJI
    } else {
      foodType.current = 'regular'
      foodEmoji.current = FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)]
    }
  }

  function spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 1 + Math.random() * 3
      particles.current.push({
        x: x * CELL + CELL / 2,
        y: y * CELL + CELL / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 20 + Math.random() * 15,
        color,
        size: 2 + Math.random() * 3,
      })
    }
  }

  function resetGame() {
    const cx = Math.floor(cols.current / 2)
    const cy = Math.floor(rows.current / 2)
    snake.current = [
      { x: cx, y: cy },
      { x: cx + 1, y: cy },
      { x: cx + 2, y: cy },
    ]
    prevSnake.current = snake.current.map(s => ({ ...s }))
    dir.current = 'left'
    nextDir.current = 'left'
    scoreRef.current = 0
    setScore(0)
    setScoreKey(k => k + 1)
    tickCount.current = 0
    tickProgress.current = 0
    speed.current = 8
    particles.current = []
    deathSegments.current = []
    deathTimer.current = 0
    pausedRef.current = false
    setIsPaused(false)
    spawnFood()
  }

  function startGame() {
    resetGame()
    gameStateRef.current = 'playing'
    setGameState('playing')
  }

  function togglePause() {
    if (gameStateRef.current !== 'playing') return
    pausedRef.current = !pausedRef.current
    setIsPaused(pausedRef.current)
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

    function drawBackground() {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, w, h)

      gridPhase.current += 0.005
      const glowIntensity = 0.03 + 0.015 * Math.sin(gridPhase.current)

      // Animated grid with glow
      ctx.strokeStyle = `rgba(74, 222, 128, ${glowIntensity})`
      ctx.lineWidth = 0.5
      for (let x = 0; x <= w; x += CELL) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y <= h; y += CELL) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Wall borders
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, cols.current * CELL - 2, rows.current * CELL - 2)
      // Inner glow on walls
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)'
      ctx.lineWidth = 4
      ctx.strokeRect(3, 3, cols.current * CELL - 6, rows.current * CELL - 6)

      // Subtle glow at center
      const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6)
      grd.addColorStop(0, `rgba(74, 222, 128, ${0.03 + 0.01 * Math.sin(gridPhase.current * 2)})`)
      grd.addColorStop(1, 'rgba(74, 222, 128, 0)')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, w, h)
    }

    function drawFood() {
      const fx = food.current.x * CELL + CELL / 2
      const fy = food.current.y * CELL + CELL / 2

      // Pulsing glow behind food
      const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7
      ctx.save()

      if (foodType.current === 'golden') {
        const blink = Math.sin(Date.now() * 0.008) * 0.3 + 0.7
        ctx.globalAlpha = blink
        ctx.shadowColor = '#ffd700'
        ctx.shadowBlur = 14 + 6 * Math.sin(Date.now() * 0.006)
      } else {
        // Regular food glow
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)'
        ctx.shadowBlur = 6 + 3 * pulse
      }

      // Draw food emoji larger for visibility
      ctx.font = `${CELL + 8}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(foodEmoji.current, fx, fy)

      // Draw a subtle circle behind for extra visibility
      ctx.globalAlpha = 0.15 * pulse
      ctx.beginPath()
      ctx.arc(fx, fy, CELL * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = foodType.current === 'golden' ? '#ffd700' : '#4ade80'
      ctx.fill()

      ctx.restore()
      ctx.globalAlpha = 1
    }

    function drawSnake() {
      const t = tickProgress.current
      const len = snake.current.length

      snake.current.forEach((seg, i) => {
        const isHead = i === 0
        // Lerp between previous and current position
        const prev = prevSnake.current[i] || seg
        let lx = lerp(prev.x, seg.x, t)
        let ly = lerp(prev.y, seg.y, t)

        // Handle wrapping lerp (don't lerp across the map)
        if (Math.abs(prev.x - seg.x) > 1) lx = seg.x
        if (Math.abs(prev.y - seg.y) > 1) ly = seg.y

        // Gradient from bright green (head) to dark green (tail)
        const ratio = len > 1 ? i / (len - 1) : 0
        const lightness = lerp(60, 20, ratio)
        const saturation = lerp(80, 60, ratio)
        const segColor = `hsl(142, ${saturation}%, ${lightness}%)`

        const r = isHead ? 6 : lerp(4, 2, ratio)
        const px = lx * CELL + 1
        const py = ly * CELL + 1
        const s = CELL - 2

        // Glow for head
        if (isHead) {
          ctx.save()
          ctx.shadowColor = '#4ade80'
          ctx.shadowBlur = 8
          ctx.fillStyle = segColor
          ctx.beginPath()
          ctx.roundRect(px, py, s, s, r)
          ctx.fill()
          ctx.restore()
        } else {
          ctx.fillStyle = segColor
          ctx.beginPath()
          ctx.roundRect(px, py, s, s, r)
          ctx.fill()
        }

        if (isHead) {
          // Direction-aware eyes
          const d = dir.current
          let eyeX1: number, eyeY1: number, eyeX2: number, eyeY2: number
          let pupilOffX = 0, pupilOffY = 0

          if (d === 'left') {
            eyeX1 = px + s * 0.25; eyeY1 = py + s * 0.3
            eyeX2 = px + s * 0.25; eyeY2 = py + s * 0.7
            pupilOffX = -1; pupilOffY = 0
          } else if (d === 'right') {
            eyeX1 = px + s * 0.75; eyeY1 = py + s * 0.3
            eyeX2 = px + s * 0.75; eyeY2 = py + s * 0.7
            pupilOffX = 1; pupilOffY = 0
          } else if (d === 'up') {
            eyeX1 = px + s * 0.3; eyeY1 = py + s * 0.25
            eyeX2 = px + s * 0.7; eyeY2 = py + s * 0.25
            pupilOffX = 0; pupilOffY = -1
          } else {
            eyeX1 = px + s * 0.3; eyeY1 = py + s * 0.75
            eyeX2 = px + s * 0.7; eyeY2 = py + s * 0.75
            pupilOffX = 0; pupilOffY = 1
          }

          // White of eyes
          ctx.fillStyle = 'white'
          ctx.beginPath()
          ctx.arc(eyeX1, eyeY1, 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(eyeX2, eyeY2, 3, 0, Math.PI * 2)
          ctx.fill()

          // Pupils
          ctx.fillStyle = '#111'
          ctx.beginPath()
          ctx.arc(eyeX1 + pupilOffX, eyeY1 + pupilOffY, 1.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(eyeX2 + pupilOffX, eyeY2 + pupilOffY, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    }

    function drawParticles() {
      particles.current.forEach(p => {
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    function updateParticles() {
      particles.current = particles.current.filter(p => {
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.96
        p.vy *= 0.96
        p.life -= 1 / p.maxLife
        return p.life > 0
      })
    }

    function drawDeathAnimation() {
      deathSegments.current.forEach(seg => {
        ctx.globalAlpha = seg.alpha
        ctx.save()
        ctx.translate(seg.x, seg.y)
        ctx.rotate(seg.rotation)
        ctx.fillStyle = seg.color
        ctx.beginPath()
        ctx.roundRect(-CELL / 2 + 1, -CELL / 2 + 1, CELL - 2, CELL - 2, 3)
        ctx.fill()
        ctx.restore()
      })
      ctx.globalAlpha = 1
    }

    function updateDeathAnimation() {
      if (deathSegments.current.length === 0) return
      deathTimer.current++
      deathSegments.current.forEach(seg => {
        seg.x += seg.vx
        seg.y += seg.vy
        seg.vy += 0.15 // gravity
        seg.vx *= 0.98
        seg.alpha -= 0.015
        seg.rotation += seg.rotSpeed
      })
      deathSegments.current = deathSegments.current.filter(s => s.alpha > 0)
    }

    function drawScore() {
      ctx.save()
      ctx.font = 'bold 18px Rubik, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText(String(scoreRef.current), w - 10, 25)
      ctx.restore()
    }

    function triggerDeath() {
      deathSegments.current = snake.current.map((seg, i) => {
        const ratio = snake.current.length > 1 ? i / (snake.current.length - 1) : 0
        return {
          x: seg.x * CELL + CELL / 2,
          y: seg.y * CELL + CELL / 2,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6 - 2,
          alpha: 1,
          color: `hsl(142, ${lerp(80, 60, ratio)}%, ${lerp(60, 20, ratio)}%)`,
          rotation: 0,
          rotSpeed: (Math.random() - 0.5) * 0.3,
        }
      })
      deathTimer.current = 0
      gameStateRef.current = 'over'
      setGameState('over')
      setShakeClass(true)
      setTimeout(() => setShakeClass(false), 400)
      const newScores = saveHighScore(scoreRef.current)
      setHighScores(newScores)
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

      // Wall collision — game over
      if (nx < 0 || nx >= cols.current || ny < 0 || ny >= rows.current) {
        triggerDeath()
        return
      }

      // Self collision
      if (snake.current.some(s => s.x === nx && s.y === ny)) {
        triggerDeath()
        return
      }

      // Save previous positions for lerp
      prevSnake.current = snake.current.map(s => ({ ...s }))

      snake.current.unshift({ x: nx, y: ny })

      // Eat food
      if (nx === food.current.x && ny === food.current.y) {
        const points = foodType.current === 'golden' ? 3 : 1
        const color = foodType.current === 'golden' ? '#ffd700' : '#4ade80'
        scoreRef.current += points
        setScore(scoreRef.current)
        setScoreKey(k => k + 1)

        // Particle burst at food location
        spawnParticles(nx, ny, color, foodType.current === 'golden' ? 20 : 12)

        spawnFood()
        // Speed increases every 3 food
        if (scoreRef.current % 3 === 0 && speed.current > 4) speed.current--
      } else {
        snake.current.pop()
      }

      // Also update prevSnake to have correct length (new segment gets same prev as current)
      while (prevSnake.current.length < snake.current.length) {
        prevSnake.current.push({ ...snake.current[prevSnake.current.length] })
      }
      if (prevSnake.current.length > snake.current.length) {
        prevSnake.current = prevSnake.current.slice(0, snake.current.length)
      }

      tickProgress.current = 0
    }

    function loop() {
      if (gameStateRef.current === 'playing' && !pausedRef.current) {
        tickCount.current++
        if (tickCount.current % speed.current === 0) {
          tick()
        } else {
          tickProgress.current = (tickCount.current % speed.current) / speed.current
        }
      }

      drawBackground()

      if (gameStateRef.current === 'playing' || gameStateRef.current === 'over') {
        drawFood()
        if (deathSegments.current.length > 0) {
          drawDeathAnimation()
          updateDeathAnimation()
        } else {
          drawSnake()
        }
        updateParticles()
        drawParticles()
        drawScore()
      }

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

      if (pausedRef.current && gameStateRef.current === 'playing') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(0, 0, w, h)
        ctx.font = 'bold 28px Rubik, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#fff'
        ctx.fillText('⏸ השהייה', w / 2, h / 2)
        ctx.font = '14px Rubik, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillText('לחצו על המרכז להמשיך', w / 2, h / 2 + 30)
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
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        if (gameStateRef.current === 'playing') togglePause()
        return
      }
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

  const dpadBtnClass = (direction: string) =>
    `bg-white/10 rounded-xl p-4 text-white text-2xl active:bg-green-500/40 active:scale-90 transition-all duration-100 select-none ${
      dpadPressed.current[direction] ? 'bg-green-500/30 scale-90' : ''
    }`

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center font-rubik" dir="rtl">
      <div className="w-full max-w-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐍</span>
          <h1 className="text-lg font-bold text-green-400">נחש הפלאפל</h1>
        </div>
        <div className="flex items-center gap-3">
          {gameState === 'playing' && (
            <button
              onClick={togglePause}
              className="text-white/50 text-sm active:scale-95 hover:text-white/80 transition-colors"
            >
              {isPaused ? '▶ המשך' : '⏸ השהה'}
            </button>
          )}
          <button onClick={() => router.push('/games')} className="text-white/50 text-sm active:scale-95">חזרה</button>
        </div>
      </div>

      <div className="flex gap-6 text-sm text-white/60 mb-3">
        <span>
          ניקוד:{' '}
          <AnimatePresence mode="wait">
            <motion.b
              key={scoreKey}
              initial={{ scale: 1.6, color: '#fbbf24' }}
              animate={{ scale: 1, color: '#4ade80' }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="inline-block text-green-400"
            >
              {score}
            </motion.b>
          </AnimatePresence>
        </span>
        <span>שיא: <b className="text-amber-400">{highScores[0] || 0}</b></span>
      </div>

      <div className={shakeClass ? 'animate-shake' : ''}>
        <canvas
          ref={canvasRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={() => { if (gameStateRef.current === 'idle') startGame() }}
          className="rounded-xl border-2 border-white/10 touch-none"
        />
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-6px) translateY(2px); }
          20% { transform: translateX(6px) translateY(-2px); }
          30% { transform: translateX(-5px) translateY(1px); }
          40% { transform: translateX(5px) translateY(-1px); }
          50% { transform: translateX(-3px); }
          60% { transform: translateX(3px); }
          70% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
          90% { transform: translateX(-1px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-out;
        }
      `}</style>

      {/* D-pad for mobile */}
      {gameState === 'playing' && (
        <div className="mt-4 grid grid-cols-3 gap-2 w-48">
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDir('up') }}
            className={dpadBtnClass('up')}
          >
            <span className="material-symbols-outlined text-3xl">expand_less</span>
          </button>
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDir('right') }}
            className={dpadBtnClass('right')}
          >
            <span className="material-symbols-outlined text-3xl">chevron_right</span>
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); togglePause() }}
            className="bg-white/5 rounded-xl p-4 text-white/40 text-xs active:bg-white/15 active:scale-95 transition-all duration-100 select-none flex items-center justify-center border border-white/10"
          >
            {isPaused ? '▶' : '⏸'}
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDir('left') }}
            className={dpadBtnClass('left')}
          >
            <span className="material-symbols-outlined text-3xl">chevron_left</span>
          </button>
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDir('down') }}
            className={dpadBtnClass('down')}
          >
            <span className="material-symbols-outlined text-3xl">expand_more</span>
          </button>
          <div />
        </div>
      )}

      {gameState === 'over' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center">
          <p className="text-red-400 font-bold text-lg mb-2">Game Over! ניקוד: {score}</p>

          {highScores.length > 0 && (
            <div className="mb-3 bg-white/5 rounded-xl px-4 py-2 inline-block">
              <p className="text-amber-400 text-sm font-bold mb-1">🏆 שיאים</p>
              {highScores.map((hs, i) => (
                <div key={i} className="text-white/70 text-sm flex items-center gap-2 justify-center">
                  <span className="text-amber-300">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <span className={hs === score ? 'text-green-400 font-bold' : ''}>{hs}</span>
                </div>
              ))}
            </div>
          )}

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
