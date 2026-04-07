'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

// --- Constants ---
const GRAVITY = 0.6
const JUMP_FORCE = -11
const DOUBLE_JUMP_FORCE = -9
const GROUND_Y_OFFSET = 60 // from bottom
const FALAFEL_SIZE = 36
const OBSTACLE_WIDTH = 30
const COLLECTIBLE_SIZE = 22
const INITIAL_SPEED = 5
const MAX_SPEED = 14

const GROUND_OBSTACLES = ['🥤', '🍰', '🧁', '🍕', '🌯']
const FLYING_OBSTACLES = ['🐦', '🦅']
const COLLECTIBLES = ['🌟', '🧆']

interface Obstacle {
  x: number
  y: number
  emoji: string
  width: number
  height: number
  flying: boolean
}

interface Collectible {
  x: number
  y: number
  emoji: string
  collected: boolean
  points: number
  glow: boolean
}

interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}

interface CloudLayer {
  x: number; y: number; w: number; speed: number; alpha: number
}

function getHighScores(): number[] {
  try {
    const s = localStorage.getItem('runner_high_scores')
    if (s) return JSON.parse(s)
  } catch {}
  return []
}

function saveHighScore(score: number): number[] {
  const scores = getHighScores()
  scores.push(score)
  scores.sort((a, b) => b - a)
  const top3 = scores.slice(0, 3)
  localStorage.setItem('runner_high_scores', JSON.stringify(top3))
  return top3
}

export default function RunnerGame() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle')
  const [score, setScore] = useState(0)
  const [highScores, setHighScores] = useState<number[]>([])
  const [shakeClass, setShakeClass] = useState(false)

  const gameStateRef = useRef<'idle' | 'playing' | 'over'>('idle')
  const scoreRef = useRef(0)
  const speedRef = useRef(INITIAL_SPEED)
  const frameCount = useRef(0)

  // Falafel state
  const falafelY = useRef(0)
  const falafelVY = useRef(0)
  const jumpsLeft = useRef(2)
  const isDucking = useRef(false)
  const squash = useRef(1) // 1 = normal, <1 = squashed, >1 = stretched
  const groundY = useRef(0)

  // World
  const obstacles = useRef<Obstacle[]>([])
  const collectibles = useRef<Collectible[]>([])
  const particles = useRef<Particle[]>([])
  const clouds = useRef<CloudLayer[]>([])
  const groundOffset = useRef(0)
  const deathFlash = useRef(0)

  useEffect(() => {
    setHighScores(getHighScores())
  }, [])

  function resetGame() {
    scoreRef.current = 0
    setScore(0)
    speedRef.current = INITIAL_SPEED
    frameCount.current = 0
    falafelVY.current = 0
    jumpsLeft.current = 2
    isDucking.current = false
    squash.current = 1
    obstacles.current = []
    collectibles.current = []
    particles.current = []
    deathFlash.current = 0
    groundOffset.current = 0
  }

  function startGame() {
    resetGame()
    gameStateRef.current = 'playing'
    setGameState('playing')
  }

  function jump() {
    if (gameStateRef.current === 'idle') {
      startGame()
      return
    }
    if (gameStateRef.current === 'over') return
    if (jumpsLeft.current > 0) {
      const force = jumpsLeft.current === 2 ? JUMP_FORCE : DOUBLE_JUMP_FORCE
      falafelVY.current = force
      jumpsLeft.current--
      squash.current = 1.3 // stretch on jump
      isDucking.current = false
      // Jump particles
      spawnParticles(80, groundY.current, 6, ['#d4a054', '#c4913e', '#e8c078'])
    }
  }

  function duck(active: boolean) {
    if (gameStateRef.current !== 'playing') return
    isDucking.current = active
  }

  function spawnParticles(x: number, y: number, count: number, colors: string[]) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2.5
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1, maxLife: 15 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
      })
    }
  }

  function die() {
    gameStateRef.current = 'over'
    setGameState('over')
    deathFlash.current = 15
    setShakeClass(true)
    setTimeout(() => setShakeClass(false), 400)
    // Death particles
    spawnParticles(80, falafelY.current, 20, ['#d4a054', '#c4913e', '#8b6914', '#fff'])
    const newScores = saveHighScore(scoreRef.current)
    setHighScores(newScores)
  }

  // --- Controls ---
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        jump()
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault()
        duck(true)
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'ArrowDown') duck(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  })

  // --- Game Loop ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    const w = Math.min(window.innerWidth - 16, 500)
    const h = Math.min(window.innerHeight - 200, 300)
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    groundY.current = h - GROUND_Y_OFFSET
    falafelY.current = groundY.current

    // Init clouds
    if (clouds.current.length === 0) {
      for (let i = 0; i < 6; i++) {
        clouds.current.push({
          x: Math.random() * w,
          y: 20 + Math.random() * 60,
          w: 30 + Math.random() * 50,
          speed: 0.2 + Math.random() * 0.5,
          alpha: 0.05 + Math.random() * 0.08,
        })
      }
    }

    function drawBackground() {
      const grd = ctx.createLinearGradient(0, 0, 0, h)
      grd.addColorStop(0, '#0f0a1a')
      grd.addColorStop(1, '#1a1a2e')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, w, h)

      // Clouds (parallax)
      clouds.current.forEach((c) => {
        ctx.globalAlpha = c.alpha
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.ellipse(c.x, c.y, c.w, c.w * 0.35, 0, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    function drawGround() {
      const gy = groundY.current + FALAFEL_SIZE / 2 + 2
      // Ground line
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(w, gy)
      ctx.stroke()

      // Scrolling dashes
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      const dashW = 20
      const off = groundOffset.current % (dashW * 2)
      for (let x = -off; x < w + dashW; x += dashW * 2) {
        ctx.beginPath()
        ctx.moveTo(x, gy + 8)
        ctx.lineTo(x + dashW, gy + 8)
        ctx.stroke()
      }
    }

    function drawFalafel() {
      const fx = 80
      const fy = falafelY.current
      const ducking = isDucking.current && falafelY.current >= groundY.current - 2
      const sq = squash.current

      ctx.save()
      ctx.translate(fx, fy)

      // Running bounce when on ground
      const onGround = falafelY.current >= groundY.current - 2
      let bounce = 0
      if (onGround && gameStateRef.current === 'playing' && !ducking) {
        bounce = Math.sin(frameCount.current * 0.3) * 3
      }

      // Squash/stretch
      const scaleX = ducking ? 1.4 : (2 - sq)
      const scaleY = ducking ? 0.5 : sq
      ctx.scale(scaleX, scaleY)

      // Glow
      ctx.shadowColor = '#d4a054'
      ctx.shadowBlur = 8

      // Draw falafel emoji
      const size = ducking ? FALAFEL_SIZE * 0.7 : FALAFEL_SIZE
      ctx.font = `${size}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🧆', 0, bounce)
      ctx.restore()

      // Running dust
      if (onGround && gameStateRef.current === 'playing' && frameCount.current % 4 === 0) {
        particles.current.push({
          x: fx - 15, y: groundY.current + 10,
          vx: -1 - Math.random(), vy: -0.5 - Math.random() * 0.5,
          life: 1, maxLife: 10 + Math.random() * 5,
          color: 'rgba(255,255,255,0.3)', size: 2 + Math.random() * 2,
        })
      }
    }

    function drawObstacles() {
      for (const obs of obstacles.current) {
        ctx.font = `${obs.height}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        if (obs.flying) {
          ctx.globalAlpha = 0.9
          ctx.fillText(obs.emoji, obs.x, obs.y + obs.height)
          ctx.globalAlpha = 1
        } else {
          ctx.fillText(obs.emoji, obs.x, obs.y + obs.height)
        }
      }
    }

    function drawCollectibles() {
      for (const c of collectibles.current) {
        if (c.collected) continue
        ctx.save()
        if (c.glow) {
          ctx.shadowColor = '#ffd700'
          ctx.shadowBlur = 10 + Math.sin(frameCount.current * 0.1) * 5
        }
        const bob = Math.sin(frameCount.current * 0.06 + c.x) * 4
        ctx.font = `${COLLECTIBLE_SIZE}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(c.emoji, c.x, c.y + bob)
        ctx.restore()
      }
    }

    function drawParticles() {
      particles.current.forEach((p) => {
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    function drawSpeedLines() {
      if (speedRef.current < 8) return
      const intensity = (speedRef.current - 8) / (MAX_SPEED - 8)
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + intensity * 0.05})`
      ctx.lineWidth = 1
      for (let i = 0; i < 5; i++) {
        const y = Math.random() * h
        const len = 20 + Math.random() * 40 * intensity
        ctx.beginPath()
        ctx.moveTo(Math.random() * w, y)
        ctx.lineTo(Math.random() * w - len, y)
        ctx.stroke()
      }
    }

    function drawScore() {
      ctx.save()
      ctx.font = 'bold 20px Rubik, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText(String(Math.floor(scoreRef.current)), w - 12, 28)
      ctx.restore()
    }

    function spawnObstacle() {
      const sc = scoreRef.current
      // Flying obstacles after score 100
      const canFly = sc > 100 && Math.random() < 0.3
      if (canFly) {
        const emoji = FLYING_OBSTACLES[Math.floor(Math.random() * FLYING_OBSTACLES.length)]
        obstacles.current.push({
          x: w + 20,
          y: groundY.current - 60 - Math.random() * 40,
          emoji, width: 28, height: 28, flying: true,
        })
      } else {
        const emoji = GROUND_OBSTACLES[Math.floor(Math.random() * GROUND_OBSTACLES.length)]
        const tall = sc > 200 && Math.random() < 0.25
        const obstH = tall ? 45 : 30
        obstacles.current.push({
          x: w + 20,
          y: groundY.current - obstH + FALAFEL_SIZE / 2 + 2,
          emoji, width: OBSTACLE_WIDTH, height: obstH, flying: false,
        })
      }

      // Double obstacles after 200
      if (sc > 200 && Math.random() < 0.15) {
        const emoji = FLYING_OBSTACLES[Math.floor(Math.random() * FLYING_OBSTACLES.length)]
        obstacles.current.push({
          x: w + 60,
          y: groundY.current - 55 - Math.random() * 30,
          emoji, width: 28, height: 28, flying: true,
        })
      }
    }

    function spawnCollectible() {
      const isGolden = Math.random() < 0.15
      collectibles.current.push({
        x: w + 20,
        y: groundY.current - 40 - Math.random() * 60,
        emoji: isGolden ? '🧆' : '🌟',
        collected: false,
        points: isGolden ? 10 : 5,
        glow: isGolden,
      })
    }

    function update() {
      const spd = speedRef.current
      frameCount.current++

      // Speed up
      if (speedRef.current < MAX_SPEED) {
        speedRef.current += 0.002
      }

      // Score
      scoreRef.current += spd * 0.02
      setScore(Math.floor(scoreRef.current))

      // Ground scroll
      groundOffset.current += spd

      // Clouds
      clouds.current.forEach((c) => {
        c.x -= c.speed
        if (c.x + c.w < 0) c.x = w + c.w
      })

      // Falafel physics
      const onGround = falafelY.current >= groundY.current
      if (!onGround) {
        falafelVY.current += GRAVITY
        falafelY.current += falafelVY.current
      }
      if (falafelY.current >= groundY.current) {
        falafelY.current = groundY.current
        falafelVY.current = 0
        jumpsLeft.current = 2
        if (squash.current > 1) squash.current = 0.7 // squash on land
      }
      // Recover squash
      squash.current += (1 - squash.current) * 0.15

      // Spawn obstacles
      const spawnRate = Math.max(40, 90 - Math.floor(speedRef.current * 3))
      if (frameCount.current % spawnRate === 0) spawnObstacle()

      // Spawn collectibles
      if (frameCount.current % 70 === 0 && Math.random() < 0.5) spawnCollectible()

      // Move obstacles
      for (const obs of obstacles.current) {
        obs.x -= spd
      }
      obstacles.current = obstacles.current.filter((o) => o.x > -50)

      // Move collectibles
      for (const c of collectibles.current) {
        if (!c.collected) c.x -= spd
      }
      collectibles.current = collectibles.current.filter((c) => c.x > -50 || c.collected)

      // Collision: falafel hitbox (forgiving)
      const fx = 80
      const fy = falafelY.current
      const ducking = isDucking.current && onGround
      const fHalfW = ducking ? 16 : 12
      const fHalfH = ducking ? 8 : 16
      const fTop = fy - fHalfH
      const fBottom = fy + fHalfH
      const fLeft = fx - fHalfW
      const fRight = fx + fHalfW

      for (const obs of obstacles.current) {
        const oLeft = obs.x - obs.width / 2 + 4 // forgiving hitbox
        const oRight = obs.x + obs.width / 2 - 4
        const oTop = obs.y + 4
        const oBottom = obs.y + obs.height - 4

        if (fRight > oLeft && fLeft < oRight && fBottom > oTop && fTop < oBottom) {
          die()
          return
        }
      }

      // Collect items
      for (const c of collectibles.current) {
        if (c.collected) continue
        const dx = Math.abs(fx - c.x)
        const dy = Math.abs(fy - c.y)
        if (dx < 22 && dy < 22) {
          c.collected = true
          scoreRef.current += c.points
          spawnParticles(c.x, c.y, 8, c.glow ? ['#ffd700', '#ffec80'] : ['#44ff44', '#fff'])
        }
      }

      // Particles
      particles.current = particles.current.filter((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.life -= 1 / p.maxLife
        return p.life > 0
      })

      // Death flash
      if (deathFlash.current > 0) deathFlash.current--
    }

    function drawIdle() {
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = 'bold 22px Rubik, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('ריצת הפלאפל 🧆', w / 2, h / 2 - 30)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '14px Rubik, sans-serif'
      ctx.fillText('לחצו או לחצו רווח כדי להתחיל', w / 2, h / 2 + 5)

      // Draw static falafel
      ctx.font = `${FALAFEL_SIZE}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const bob = Math.sin(Date.now() * 0.003) * 5
      ctx.fillText('🧆', 80, groundY.current + bob)
    }

    function loop() {
      drawBackground()
      drawGround()
      drawSpeedLines()

      if (gameStateRef.current === 'idle') {
        drawIdle()
      } else if (gameStateRef.current === 'playing') {
        update()
        drawObstacles()
        drawCollectibles()
        drawFalafel()
        drawParticles()
        drawScore()
      } else {
        // Game over — still draw last frame
        drawObstacles()
        drawCollectibles()
        drawFalafel()
        drawParticles()
        drawScore()

        // Red flash
        if (deathFlash.current > 0) {
          ctx.fillStyle = `rgba(255,0,0,${deathFlash.current / 15 * 0.3})`
          ctx.fillRect(0, 0, w, h)
        }
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  return (
    <div dir="rtl" className={`min-h-screen flex flex-col items-center justify-center font-rubik ${shakeClass ? 'animate-shake' : ''}`}
      style={{ background: 'linear-gradient(to bottom, #0f0a1a, #1a1a2e)' }}
    >
      {/* Back button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => router.push('/games')}
          className="flex items-center gap-1 rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 text-white/70 text-sm hover:bg-white/20 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
          משחקים
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={() => jump()}
        onTouchStart={(e) => {
          // Detect swipe down for duck
          const startY = e.touches[0].clientY
          const onMove = (me: TouchEvent) => {
            if (me.touches[0].clientY - startY > 30) duck(true)
          }
          const onEnd = () => {
            duck(false)
            window.removeEventListener('touchmove', onMove)
            window.removeEventListener('touchend', onEnd)
          }
          window.addEventListener('touchmove', onMove)
          window.addEventListener('touchend', onEnd)

          // Tap = jump
          if (!isDucking.current) jump()
        }}
        className="rounded-2xl border border-white/10 cursor-pointer"
      />

      {/* Game Over overlay */}
      <AnimatePresence>
        {gameState === 'over' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 flex flex-col items-center gap-3"
          >
            <p className="text-white/90 text-xl font-bold">נגמר! 💥</p>
            <p className="text-white/70 text-lg">
              ניקוד: <span className="text-amber-400 font-bold">{Math.floor(scoreRef.current)}</span>
            </p>

            {highScores.length > 0 && (
              <div className="flex gap-3 text-sm text-white/50">
                {highScores.slice(0, 3).map((s, i) => (
                  <span key={i}>
                    {['🥇', '🥈', '🥉'][i]} {s}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={() => startGame()}
              className="mt-2 rounded-xl bg-amber-500/90 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-500 transition-colors active:scale-95"
            >
              שחקו שוב
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls hint */}
      {gameState === 'playing' && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 2, duration: 1 }}
          className="mt-3 text-white/30 text-xs text-center"
        >
          רווח/לחיצה = קפיצה · חץ למטה = התכופפות
        </motion.div>
      )}

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(2px); }
        }
        .animate-shake { animation: shake 0.4s ease-out; }
      `}</style>
    </div>
  )
}
