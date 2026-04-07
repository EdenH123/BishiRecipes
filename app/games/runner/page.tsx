'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

// --- Types ---
interface Obstacle {
  x: number
  y: number
  w: number
  h: number
  emoji: string
  type: 'ground' | 'tall' | 'flying'
}

interface Collectible {
  x: number
  y: number
  emoji: string
  points: number
  collected: boolean
  glow: boolean
}

interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}

interface Cloud {
  x: number; y: number; w: number; alpha: number; speed: number
}

interface Building {
  x: number; w: number; h: number; color: string; speed: number
}

// --- Helpers ---
function getHighScores(): number[] {
  try {
    const saved = localStorage.getItem('runner_high_scores')
    if (saved) return JSON.parse(saved)
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

const GROUND_EMOJIS: [string, number, number][] = [
  ['🥤', 24, 30], ['🍰', 30, 28], ['🧁', 26, 30],
]
const TALL_EMOJIS: [string, number, number][] = [
  ['🌯', 30, 50], ['🍕', 36, 48],
]
const FLYING_EMOJIS: [string, number, number][] = [
  ['🐦', 28, 24], ['🥙', 30, 26],
]

const GRAVITY = 0.6
const JUMP_FORCE = -12
const DUCK_HEIGHT = 20
const NORMAL_HEIGHT = 36
const PLAYER_WIDTH = 32

export default function RunnerGame() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle')
  const [displayScore, setDisplayScore] = useState(0)
  const [highScores, setHighScores] = useState<number[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [scoreKey, setScoreKey] = useState(0)
  const [shakeClass, setShakeClass] = useState(false)
  const [currentSpeed, setCurrentSpeed] = useState(5)

  // Game refs
  const gameStateRef = useRef<'idle' | 'playing' | 'over'>('idle')
  const pausedRef = useRef(false)
  const scoreRef = useRef(0)
  const speedRef = useRef(5)
  const frameCount = useRef(0)

  // Player refs
  const playerY = useRef(0)
  const playerVY = useRef(0)
  const playerHeight = useRef(NORMAL_HEIGHT)
  const isGrounded = useRef(true)
  const jumpsLeft = useRef(2)
  const isDucking = useRef(false)
  const bouncePhase = useRef(0)
  const squashStretch = useRef({ sx: 1, sy: 1 })
  const groundY = useRef(0)

  // World refs
  const obstacles = useRef<Obstacle[]>([])
  const collectibles = useRef<Collectible[]>([])
  const particles = useRef<Particle[]>([])
  const clouds = useRef<Cloud[]>([])
  const buildings = useRef<Building[]>([])
  const groundOffset = useRef(0)
  const nextObstacleFrame = useRef(80)
  const nextCollectibleFrame = useRef(120)
  const flashAlpha = useRef(0)
  const shakeOffset = useRef({ x: 0, y: 0 })

  // Canvas dimensions
  const W = useRef(0)
  const H = useRef(0)

  useEffect(() => { setHighScores(getHighScores()) }, [])

  function spawnClouds(w: number, h: number) {
    clouds.current = []
    for (let i = 0; i < 6; i++) {
      clouds.current.push({
        x: Math.random() * w, y: 20 + Math.random() * (h * 0.3),
        w: 40 + Math.random() * 60, alpha: 0.05 + Math.random() * 0.08,
        speed: 0.2 + Math.random() * 0.3,
      })
    }
  }

  function spawnBuildings(w: number, h: number) {
    buildings.current = []
    let bx = 0
    while (bx < w + 100) {
      const bw = 30 + Math.random() * 50
      const bh = 40 + Math.random() * 80
      const lightness = 10 + Math.random() * 8
      buildings.current.push({ x: bx, w: bw, h: bh, color: `hsl(240, 20%, ${lightness}%)`, speed: 0.5 })
      bx += bw + 10 + Math.random() * 40
    }
  }

  function spawnObstacle() {
    const score = scoreRef.current
    const types: ('ground' | 'tall' | 'flying')[] = ['ground']
    if (score >= 100) types.push('flying')
    if (score >= 50) types.push('tall')
    // After 200, allow combos
    const doDouble = score >= 200 && Math.random() < 0.3
    const spawn = (type: 'ground' | 'tall' | 'flying') => {
      let pool: [string, number, number][]
      if (type === 'ground') pool = GROUND_EMOJIS
      else if (type === 'tall') pool = TALL_EMOJIS
      else pool = FLYING_EMOJIS
      const [emoji, ow, oh] = pool[Math.floor(Math.random() * pool.length)]
      const gy = groundY.current
      let oy: number
      if (type === 'flying') oy = gy - 70 - Math.random() * 40
      else oy = gy - oh
      obstacles.current.push({ x: W.current + 10, y: oy, w: ow, h: oh, emoji, type })
    }
    const t = types[Math.floor(Math.random() * types.length)]
    spawn(t)
    if (doDouble && t === 'ground') spawn('flying')
  }

  function spawnCollectible() {
    const gy = groundY.current
    const isGolden = Math.random() < 0.15
    collectibles.current.push({
      x: W.current + 10,
      y: gy - 60 - Math.random() * 50,
      emoji: isGolden ? '🧆' : '🌟',
      points: isGolden ? 10 : 5,
      collected: false,
      glow: isGolden,
    })
  }

  function addParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const spd = 1 + Math.random() * 3
      particles.current.push({
        x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1,
        life: 1, maxLife: 15 + Math.random() * 15, color, size: 2 + Math.random() * 3,
      })
    }
  }

  function resetGame() {
    const gy = groundY.current
    playerY.current = gy - NORMAL_HEIGHT
    playerVY.current = 0
    playerHeight.current = NORMAL_HEIGHT
    isGrounded.current = true
    jumpsLeft.current = 2
    isDucking.current = false
    bouncePhase.current = 0
    squashStretch.current = { sx: 1, sy: 1 }
    scoreRef.current = 0
    speedRef.current = 5
    frameCount.current = 0
    obstacles.current = []
    collectibles.current = []
    particles.current = []
    nextObstacleFrame.current = 80
    nextCollectibleFrame.current = 120
    flashAlpha.current = 0
    shakeOffset.current = { x: 0, y: 0 }
    setDisplayScore(0)
    setScoreKey(k => k + 1)
    setCurrentSpeed(5)
    setIsPaused(false)
    pausedRef.current = false
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

  const doJump = useCallback(() => {
    if (gameStateRef.current === 'idle') { startGame(); return }
    if (gameStateRef.current === 'over') return
    if (pausedRef.current) return
    if (jumpsLeft.current > 0) {
      playerVY.current = JUMP_FORCE
      isGrounded.current = false
      jumpsLeft.current--
      isDucking.current = false
      playerHeight.current = NORMAL_HEIGHT
      squashStretch.current = { sx: 0.8, sy: 1.3 }
      // Dust particles
      if (jumpsLeft.current === 1) {
        addParticles(60, groundY.current, 'rgba(200,180,150,0.8)', 5)
      }
    }
  }, [])

  const doDuck = useCallback((active: boolean) => {
    if (gameStateRef.current !== 'playing' || pausedRef.current) return
    isDucking.current = active
    playerHeight.current = active ? DUCK_HEIGHT : NORMAL_HEIGHT
    if (active && isGrounded.current) {
      playerY.current = groundY.current - DUCK_HEIGHT
    }
  }, [])

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    const w = Math.min(window.innerWidth - 16, 600)
    const h = Math.min(window.innerHeight - 220, 300)
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    W.current = w
    H.current = h
    groundY.current = h - 40
    playerY.current = groundY.current - NORMAL_HEIGHT

    spawnClouds(w, h)
    spawnBuildings(w, h)

    function drawBackground() {
      const grd = ctx.createLinearGradient(0, 0, 0, h)
      grd.addColorStop(0, '#0f0a1a')
      grd.addColorStop(1, '#1a1a2e')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, w, h)
    }

    function drawClouds() {
      clouds.current.forEach(c => {
        ctx.globalAlpha = c.alpha
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.ellipse(c.x, c.y, c.w / 2, c.w / 4, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(c.x - c.w * 0.2, c.y + 5, c.w / 3, c.w / 5, 0, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    function drawBuildings() {
      const gy = groundY.current
      buildings.current.forEach(b => {
        ctx.fillStyle = b.color
        ctx.fillRect(b.x, gy - b.h, b.w, b.h)
        // Windows
        ctx.fillStyle = 'rgba(255,200,50,0.15)'
        for (let wy = gy - b.h + 8; wy < gy - 5; wy += 14) {
          for (let wx = b.x + 5; wx < b.x + b.w - 8; wx += 12) {
            ctx.fillRect(wx, wy, 6, 8)
          }
        }
      })
    }

    function drawGround() {
      const gy = groundY.current
      // Ground surface
      ctx.fillStyle = '#2a1f3d'
      ctx.fillRect(0, gy, w, h - gy)
      // Scrolling dashes on ground
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 2
      const off = groundOffset.current % 30
      for (let x = -off; x < w + 30; x += 30) {
        ctx.beginPath()
        ctx.moveTo(x, gy + 2)
        ctx.lineTo(x + 15, gy + 2)
        ctx.stroke()
      }
      // Ground line
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(w, gy)
      ctx.stroke()
    }

    function drawPlayer() {
      const gy = groundY.current
      const ph = playerHeight.current
      const py = playerY.current
      const px = 60
      const { sx, sy } = squashStretch.current
      const bounce = isGrounded.current ? Math.sin(bouncePhase.current) * 2 : 0
      const drawY = py + bounce
      const fc = frameCount.current
      const runCycle = fc * 0.15
      const grounded = isGrounded.current
      const playing = gameStateRef.current === 'playing' && !pausedRef.current
      const ducking = isDucking.current

      // Center of body
      const cx = px + PLAYER_WIDTH / 2
      const cy = drawY + ph / 2

      ctx.save()

      // Shadow on ground
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#000'
      ctx.beginPath()
      const shadowScale = 1 - Math.max(0, (gy - py - ph) / 100) * 0.5
      ctx.ellipse(cx, gy + 2, 14 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.translate(cx, cy)
      ctx.scale(sx, sy)

      if (ducking) {
        // --- DUCKING ---
        // Squashed body
        ctx.fillStyle = '#c4913e'
        ctx.beginPath()
        ctx.ellipse(0, 2, 18, 9, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#a87830'
        ctx.beginPath()
        ctx.ellipse(0, 0, 16, 6, 0, Math.PI, Math.PI * 2)
        ctx.fill()
        // Speckles
        ctx.fillStyle = '#8b6020'
        for (const [spx, spy] of [[-7, 2], [0, 5], [8, 3], [-4, 6], [5, 1]]) {
          ctx.beginPath(); ctx.arc(spx, spy, 1.2, 0, Math.PI * 2); ctx.fill()
        }
        // Eyes (wide)
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.ellipse(-5, -1, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(5, -1, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#222'
        ctx.beginPath(); ctx.arc(-4.5, 0, 1.8, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(5.5, 0, 1.8, 0, Math.PI * 2); ctx.fill()
        // Stubby arms & legs
        ctx.strokeStyle = '#a87830'; ctx.lineWidth = 3; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(-16, 3); ctx.lineTo(-12, 7); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(16, 3); ctx.lineTo(12, 7); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(-7, 9); ctx.lineTo(-10, 13); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(7, 9); ctx.lineTo(10, 13); ctx.stroke()
      } else {
        // --- NORMAL / RUNNING / JUMPING ---
        const bodyR = 15

        // Legs (behind body)
        ctx.strokeStyle = '#a87830'
        ctx.lineWidth = 3.5
        ctx.lineCap = 'round'

        if (!grounded) {
          // Air: legs tucked
          ctx.beginPath(); ctx.moveTo(-5, bodyR - 2); ctx.lineTo(-10, bodyR - 8); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(5, bodyR - 2); ctx.lineTo(10, bodyR - 8); ctx.stroke()
          ctx.fillStyle = '#e74c3c'
          ctx.beginPath(); ctx.ellipse(-10, bodyR - 9, 4, 2.5, -0.3, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.ellipse(10, bodyR - 9, 4, 2.5, 0.3, 0, Math.PI * 2); ctx.fill()
        } else if (playing) {
          // Running legs
          const ls1 = Math.sin(runCycle) * 10
          const ls2 = Math.sin(runCycle + Math.PI) * 10
          ctx.beginPath(); ctx.moveTo(-5, bodyR - 2); ctx.lineTo(-5 + ls1 * 0.4, bodyR + 8); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(5, bodyR - 2); ctx.lineTo(5 + ls2 * 0.4, bodyR + 8); ctx.stroke()
          ctx.fillStyle = '#e74c3c'
          ctx.beginPath(); ctx.ellipse(-5 + ls1 * 0.4, bodyR + 9, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.ellipse(5 + ls2 * 0.4, bodyR + 9, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill()
        } else {
          // Idle standing
          ctx.beginPath(); ctx.moveTo(-5, bodyR - 2); ctx.lineTo(-6, bodyR + 8); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(5, bodyR - 2); ctx.lineTo(6, bodyR + 8); ctx.stroke()
          ctx.fillStyle = '#e74c3c'
          ctx.beginPath(); ctx.ellipse(-6, bodyR + 9, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.ellipse(6, bodyR + 9, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill()
        }

        // Body (falafel ball)
        ctx.shadowColor = '#d4a054'; ctx.shadowBlur = 8
        ctx.fillStyle = '#c4913e'
        ctx.beginPath(); ctx.arc(0, 0, bodyR, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
        // Darker top (crispy)
        ctx.fillStyle = '#a87830'
        ctx.beginPath(); ctx.arc(0, 0, bodyR - 2, Math.PI, Math.PI * 2); ctx.fill()
        // Speckles
        ctx.fillStyle = '#8b6020'
        for (const [spx, spy] of [[-6, -5], [2, -8], [8, -3], [-3, 3], [5, 5], [-8, 1]]) {
          ctx.beginPath(); ctx.arc(spx, spy, 1.3, 0, Math.PI * 2); ctx.fill()
        }

        // Arms
        ctx.strokeStyle = '#a87830'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'
        if (!grounded) {
          // Arms up in air
          ctx.beginPath(); ctx.moveTo(-bodyR + 1, -2); ctx.lineTo(-bodyR - 6, -10); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(bodyR - 1, -2); ctx.lineTo(bodyR + 6, -10); ctx.stroke()
          ctx.fillStyle = '#fff'
          ctx.beginPath(); ctx.arc(-bodyR - 7, -11, 3, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.arc(bodyR + 7, -11, 3, 0, Math.PI * 2); ctx.fill()
        } else if (playing) {
          // Pumping arms
          const as1 = Math.sin(runCycle) * 12
          const as2 = Math.sin(runCycle + Math.PI) * 12
          ctx.beginPath(); ctx.moveTo(-bodyR + 1, 0); ctx.lineTo(-bodyR - 4 + as1 * 0.2, 6 + as1 * 0.3); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(bodyR - 1, 0); ctx.lineTo(bodyR + 4 + as2 * 0.2, 6 + as2 * 0.3); ctx.stroke()
          ctx.fillStyle = '#fff'
          ctx.beginPath(); ctx.arc(-bodyR - 4 + as1 * 0.2, 7 + as1 * 0.3, 3, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.arc(bodyR + 4 + as2 * 0.2, 7 + as2 * 0.3, 3, 0, Math.PI * 2); ctx.fill()
        } else {
          // Relaxed arms
          ctx.beginPath(); ctx.moveTo(-bodyR + 1, 0); ctx.lineTo(-bodyR - 4, 8); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(bodyR - 1, 0); ctx.lineTo(bodyR + 4, 8); ctx.stroke()
          ctx.fillStyle = '#fff'
          ctx.beginPath(); ctx.arc(-bodyR - 4, 9, 3, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.arc(bodyR + 4, 9, 3, 0, Math.PI * 2); ctx.fill()
        }

        // Face — Eyes
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.ellipse(-5, -4, 4, 4.5, 0, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(5, -4, 4, 4.5, 0, 0, Math.PI * 2); ctx.fill()
        // Pupils (look forward)
        ctx.fillStyle = '#222'
        ctx.beginPath(); ctx.arc(-4, -3.5, 2.2, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(6, -3.5, 2.2, 0, Math.PI * 2); ctx.fill()
        // Eye shine
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(-4.5, -4.5, 0.8, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(5.5, -4.5, 0.8, 0, Math.PI * 2); ctx.fill()

        // Mouth
        if (!grounded) {
          // Excited open mouth
          ctx.fillStyle = '#222'
          ctx.beginPath(); ctx.ellipse(1, 5, 4, 3, 0, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#e74c3c'
          ctx.beginPath(); ctx.ellipse(1, 6, 2.5, 1.5, 0, 0, Math.PI); ctx.fill()
        } else {
          // Happy smile
          ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5
          ctx.beginPath(); ctx.arc(1, 3, 5, 0.1, Math.PI - 0.1); ctx.stroke()
        }
      }

      ctx.restore()

      // Running dust
      if (grounded && playing && fc % 4 === 0) {
        addParticles(px, gy, 'rgba(180,160,130,0.6)', 1)
      }
    }

    function drawObstacles() {
      obstacles.current.forEach(o => {
        ctx.font = `${Math.max(o.w, o.h) - 4}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(o.emoji, o.x + o.w / 2, o.y + o.h / 2)
      })
    }

    function drawCollectibles() {
      collectibles.current.forEach(c => {
        if (c.collected) return
        ctx.save()
        const bob = Math.sin(Date.now() * 0.005 + c.x) * 4
        if (c.glow) {
          ctx.shadowColor = '#ffd700'
          ctx.shadowBlur = 10 + 4 * Math.sin(Date.now() * 0.008)
        }
        ctx.font = '22px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(c.emoji, c.x + 12, c.y + 12 + bob)
        ctx.restore()
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

    function drawSpeedLines() {
      if (speedRef.current > 8) {
        const intensity = Math.min((speedRef.current - 8) / 7, 1)
        ctx.strokeStyle = `rgba(255,255,255,${0.05 * intensity})`
        ctx.lineWidth = 1
        for (let i = 0; i < 6; i++) {
          const ly = 20 + Math.random() * (groundY.current - 40)
          const lx = Math.random() * w
          ctx.beginPath()
          ctx.moveTo(lx, ly)
          ctx.lineTo(lx - 30 - Math.random() * 40, ly)
          ctx.stroke()
        }
      }
    }

    function drawFlash() {
      if (flashAlpha.current > 0) {
        ctx.globalAlpha = flashAlpha.current
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(0, 0, w, h)
        ctx.globalAlpha = 1
        flashAlpha.current -= 0.05
      }
    }

    function drawCanvasScore() {
      ctx.save()
      ctx.font = 'bold 16px Rubik, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText(String(Math.floor(scoreRef.current)), w - 10, 22)
      ctx.restore()
    }

    function update() {
      const spd = speedRef.current
      frameCount.current++

      // Progressive difficulty
      speedRef.current += 0.002
      if (speedRef.current > 15) speedRef.current = 15

      // Score from distance
      scoreRef.current += spd * 0.02
      if (frameCount.current % 10 === 0) {
        setDisplayScore(Math.floor(scoreRef.current))
        setCurrentSpeed(Math.round(speedRef.current * 10) / 10)
        if (Math.floor(scoreRef.current) % 50 === 0 && Math.floor(scoreRef.current) > 0) {
          setScoreKey(k => k + 1)
        }
      }

      // Player physics
      if (!isGrounded.current) {
        playerVY.current += GRAVITY
        playerY.current += playerVY.current
        const gy = groundY.current
        if (playerY.current >= gy - playerHeight.current) {
          playerY.current = gy - playerHeight.current
          playerVY.current = 0
          isGrounded.current = true
          jumpsLeft.current = 2
          squashStretch.current = { sx: 1.2, sy: 0.8 }
          addParticles(60, gy, 'rgba(180,160,130,0.6)', 3)
        }
      } else {
        playerY.current = groundY.current - playerHeight.current
      }

      // Squash/stretch lerp back to 1
      squashStretch.current.sx += (1 - squashStretch.current.sx) * 0.15
      squashStretch.current.sy += (1 - squashStretch.current.sy) * 0.15

      // Bounce phase
      bouncePhase.current += 0.15 * spd

      // Move world
      groundOffset.current += spd

      // Clouds
      clouds.current.forEach(c => {
        c.x -= c.speed
        if (c.x + c.w < 0) { c.x = w + c.w; c.y = 20 + Math.random() * (h * 0.3) }
      })

      // Buildings
      buildings.current.forEach(b => {
        b.x -= b.speed * (spd / 5)
        if (b.x + b.w < 0) {
          b.x = w + 10 + Math.random() * 50
          b.h = 40 + Math.random() * 80
          b.w = 30 + Math.random() * 50
        }
      })

      // Obstacles
      nextObstacleFrame.current -= 1
      if (nextObstacleFrame.current <= 0) {
        spawnObstacle()
        const minGap = Math.max(30, 70 - scoreRef.current * 0.05)
        nextObstacleFrame.current = minGap + Math.random() * 40
      }
      obstacles.current.forEach(o => { o.x -= spd })
      obstacles.current = obstacles.current.filter(o => o.x + o.w > -50)

      // Collectibles
      nextCollectibleFrame.current -= 1
      if (nextCollectibleFrame.current <= 0) {
        spawnCollectible()
        nextCollectibleFrame.current = 80 + Math.random() * 100
      }
      collectibles.current.forEach(c => { c.x -= spd })
      collectibles.current = collectibles.current.filter(c => c.x > -50)

      // Particles
      particles.current = particles.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= 1 / p.maxLife
        return p.life > 0
      })

      // Shake decay
      shakeOffset.current.x *= 0.9
      shakeOffset.current.y *= 0.9

      // Collision detection (forgiving hitbox)
      const px = 60 + 4
      const py = playerY.current + 4
      const pw = PLAYER_WIDTH - 8
      const ph = playerHeight.current - 8

      for (const o of obstacles.current) {
        const ox = o.x + 4; const oy = o.y + 4
        const ow = o.w - 8; const oh = o.h - 8
        if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
          triggerDeath()
          return
        }
      }

      // Collect items
      collectibles.current.forEach(c => {
        if (c.collected) return
        const cx = c.x; const cy = c.y
        if (px < cx + 24 && px + pw > cx && py < cy + 24 && py + ph > cy) {
          c.collected = true
          scoreRef.current += c.points
          setDisplayScore(Math.floor(scoreRef.current))
          setScoreKey(k => k + 1)
          addParticles(cx + 12, cy + 12, c.glow ? '#ffd700' : '#fbbf24', c.glow ? 15 : 8)
        }
      })
      collectibles.current = collectibles.current.filter(c => !c.collected || c.x > -50)
    }

    function triggerDeath() {
      gameStateRef.current = 'over'
      setGameState('over')
      flashAlpha.current = 0.4
      shakeOffset.current = { x: 8, y: 4 }
      setShakeClass(true)
      setTimeout(() => setShakeClass(false), 400)
      // Death particles (crumble)
      const px = 60; const py = playerY.current
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2
        const spd = 2 + Math.random() * 4
        particles.current.push({
          x: px + PLAYER_WIDTH / 2, y: py + playerHeight.current / 2,
          vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 3,
          life: 1, maxLife: 25 + Math.random() * 20,
          color: ['#c8a050', '#a07830', '#e0c070', '#806020'][Math.floor(Math.random() * 4)],
          size: 3 + Math.random() * 4,
        })
      }
      const newScores = saveHighScore(Math.floor(scoreRef.current))
      setHighScores(newScores)
      setDisplayScore(Math.floor(scoreRef.current))
    }

    function drawIdleScreen() {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, w, h)
      ctx.font = 'bold 26px Rubik, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fbbf24'
      ctx.fillText('🧆 ריצת הפלאפל', w / 2, h / 2 - 24)
      ctx.font = '13px Rubik, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText('לחצו או לחצו רווח כדי להתחיל', w / 2, h / 2 + 14)
    }

    function drawPauseScreen() {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, w, h)
      ctx.font = 'bold 28px Rubik, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      ctx.fillText('⏸ השהייה', w / 2, h / 2)
      ctx.font = '14px Rubik, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText('לחצו רווח להמשיך', w / 2, h / 2 + 30)
    }

    function loop() {
      ctx.save()
      ctx.translate(shakeOffset.current.x, shakeOffset.current.y)

      if (gameStateRef.current === 'playing' && !pausedRef.current) {
        update()
      }

      drawBackground()
      drawClouds()
      drawBuildings()
      drawGround()

      if (gameStateRef.current === 'playing' || gameStateRef.current === 'over') {
        drawObstacles()
        drawCollectibles()
        drawSpeedLines()
        drawPlayer()
        drawParticles()
        drawCanvasScore()
        drawFlash()

        // Animate remaining particles even when dead
        if (gameStateRef.current === 'over') {
          particles.current = particles.current.filter(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 1 / p.maxLife
            return p.life > 0
          })
          shakeOffset.current.x *= 0.9
          shakeOffset.current.y *= 0.9
          if (flashAlpha.current > 0) flashAlpha.current -= 0.03

          ctx.fillStyle = 'rgba(0,0,0,0.5)'
          ctx.fillRect(0, 0, w, h)
        }
      }

      if (gameStateRef.current === 'idle') {
        drawGround()
        drawPlayer()
        drawIdleScreen()
      }

      if (pausedRef.current && gameStateRef.current === 'playing') {
        drawPauseScreen()
      }

      ctx.restore()
      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  // Keyboard controls
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (gameStateRef.current === 'idle') { startGame(); return }
        if (gameStateRef.current === 'over') return
        if (pausedRef.current && e.key === ' ') { togglePause(); return }
        doJump()
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        doDuck(true)
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        togglePause()
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { doDuck(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [doJump, doDuck])

  // Touch controls — jump fires instantly on touchStart
  const touchStartY = useRef(0)

  function onTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement
    if (target.closest('[data-back-btn]')) return
    e.preventDefault()
    touchStartY.current = e.touches[0].clientY

    if (gameStateRef.current === 'idle') { startGame(); return }
    if (gameStateRef.current === 'over') return

    // Check if touching the duck button
    const duckBtn = document.getElementById('duck-btn')
    if (duckBtn) {
      const rect = duckBtn.getBoundingClientRect()
      const tx = e.touches[0].clientX
      const ty = e.touches[0].clientY
      if (tx >= rect.left && tx <= rect.right && ty >= rect.top && ty <= rect.bottom) {
        doDuck(true)
        return
      }
    }

    // Otherwise jump immediately
    doJump()
  }

  function onTouchMove(e: React.TouchEvent) {
    // Swipe down while touching = duck
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 30) {
      doDuck(true)
    }
  }

  function onTouchEnd() {
    doDuck(false)
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#0f0a1a] to-[#1a1a2e] flex flex-col items-center font-rubik select-none"
      dir="rtl"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    >
      {/* Header */}
      <div className="w-full max-w-2xl px-4 py-3 flex items-center justify-between" data-back-btn>
        <div className="flex items-center gap-2">
          <span className="text-xl">🧆</span>
          <h1 className="text-lg font-bold text-amber-400">ריצת הפלאפל</h1>
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
          <button onClick={() => router.push('/games')} className="text-white/50 hover:text-white/80 transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
        </div>
      </div>

      {/* Score bar */}
      <div className="flex gap-6 text-sm text-white/60 mb-3">
        <span>
          ניקוד:{' '}
          <AnimatePresence mode="wait">
            <motion.b
              key={scoreKey}
              initial={{ scale: 1.6, color: '#fbbf24' }}
              animate={{ scale: 1, color: '#f59e0b' }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="inline-block text-amber-400"
            >
              {displayScore}
            </motion.b>
          </AnimatePresence>
        </span>
        <span>שיא: <b className="text-amber-400">{highScores[0] || 0}</b></span>
        {gameState === 'playing' && (
          <span>מהירות: <b className="text-orange-400">{currentSpeed}</b></span>
        )}
      </div>

      {/* Canvas */}
      <div className={shakeClass ? 'animate-shake' : ''}>
        <canvas
          ref={canvasRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => {
            if (gameStateRef.current === 'idle') startGame()
            else if (gameStateRef.current === 'playing' && !pausedRef.current) doJump()
          }}
          className="rounded-xl border-2 border-white/10 cursor-pointer"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Mobile on-screen controls */}
      {gameState === 'playing' && (
        <div className="flex gap-4 mt-4 sm:hidden w-full px-4">
          <div
            onTouchStart={(e) => { e.stopPropagation(); doJump() }}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/20 border border-amber-500/30 py-5 text-amber-300 font-bold text-base active:bg-amber-500/40 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">keyboard_arrow_up</span>
            קפיצה
          </div>
          <div
            id="duck-btn"
            onTouchStart={(e) => { e.stopPropagation(); doDuck(true) }}
            onTouchEnd={(e) => { e.stopPropagation(); doDuck(false) }}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-500/20 border border-blue-500/30 py-5 text-blue-300 font-bold text-base active:bg-blue-500/40 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">keyboard_arrow_down</span>
            התכופפות
          </div>
        </div>
      )}

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

      {/* Desktop hint */}
      {gameState === 'playing' && (
        <div className="mt-3 text-xs text-white/30 text-center hidden sm:block">
          רווח/למעלה = קפיצה | למטה = התכופפות | כפול = קפיצה כפולה
        </div>
      )}

      <AnimatePresence>
        {gameState === 'over' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mt-4 text-center"
          >
            <p className="text-red-400 font-bold text-lg mb-2">
              נגמר! ניקוד: {displayScore}
            </p>

            {highScores.length > 0 && (
              <div className="mb-3 bg-white/5 rounded-xl px-4 py-2 inline-block">
                <p className="text-amber-400 text-sm font-bold mb-1">🏆 שיאים</p>
                {highScores.map((hs, i) => (
                  <div key={i} className="text-white/70 text-sm flex items-center gap-2 justify-center">
                    <span className="text-amber-300">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <span className={hs === displayScore ? 'text-amber-400 font-bold' : ''}>{hs}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="bg-amber-500 text-white px-6 py-2.5 rounded-full font-bold"
              >
                שחקו שוב
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/games')}
                className="bg-white/10 text-white px-6 py-2.5 rounded-full font-bold"
              >
                חזרה
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
