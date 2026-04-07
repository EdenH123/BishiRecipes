'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

// Point values: common=1, medium=2, rare=3
const FOOD_ITEMS: { emoji: string; points: number }[] = [
  { emoji: '🍕', points: 1 }, { emoji: '🍔', points: 1 }, { emoji: '🌮', points: 1 },
  { emoji: '🍩', points: 1 }, { emoji: '🧁', points: 1 }, { emoji: '🍪', points: 1 },
  { emoji: '🥐', points: 1 }, { emoji: '🍟', points: 1 }, { emoji: '🌭', points: 1 },
  { emoji: '🍫', points: 1 }, { emoji: '🍗', points: 1 },
  { emoji: '🍣', points: 2 }, { emoji: '🥑', points: 2 }, { emoji: '🍜', points: 2 }, { emoji: '🥙', points: 2 },
  { emoji: '🧆', points: 3 },
]
const BAD_ITEMS = ['💣', '🗑️', '🧨', '☠️']
const POWERUP_EMOJI = '⭐'

interface FallingItem {
  x: number
  y: number
  emoji: string
  speed: number
  isBad: boolean
  isPowerUp: boolean
  points: number
  id: number
  rotation: number
  rotSpeed: number
  wobblePhase: number
  wobbleAmp: number
}

interface FloatingText {
  x: number
  y: number
  text: string
  color: string
  life: number
  maxLife: number
  id: number
  scale: number
}

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

interface Cloud {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
}

export default function CatchGame() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [highScore, setHighScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [scoreBounce, setScoreBounce] = useState(false)
  const [redFlash, setRedFlash] = useState(false)
  const [lostLife, setLostLife] = useState(-1) // index of heart being lost
  const [invincible, setInvincible] = useState(false)

  const plateX = useRef(0)
  const items = useRef<FallingItem[]>([])
  const floatingTexts = useRef<FloatingText[]>([])
  const particles = useRef<Particle[]>([])
  const clouds = useRef<Cloud[]>([])
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const gameStateRef = useRef<'idle' | 'playing' | 'over'>('idle')
  const frameCount = useRef(0)
  const nextId = useRef(0)
  const difficulty = useRef(1)
  const comboRef = useRef(0)
  const lastCatchTime = useRef(0)
  const invincibleRef = useRef(false)
  const invincibleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textIdRef = useRef(0)

  useEffect(() => {
    const saved = localStorage.getItem('catch_high_score')
    if (saved) setHighScore(parseInt(saved))
  }, [])

  function startGame() {
    items.current = []
    floatingTexts.current = []
    particles.current = []
    scoreRef.current = 0
    livesRef.current = 3
    frameCount.current = 0
    difficulty.current = 1
    comboRef.current = 0
    lastCatchTime.current = 0
    invincibleRef.current = false
    if (invincibleTimer.current) clearTimeout(invincibleTimer.current)
    setScore(0)
    setLives(3)
    setCombo(0)
    setInvincible(false)
    setLostLife(-1)
    gameStateRef.current = 'playing'
    setGameState('playing')
  }

  function addFloatingText(x: number, y: number, text: string, color: string, scale = 1) {
    floatingTexts.current.push({
      x, y, text, color, life: 60, maxLife: 60, id: textIdRef.current++, scale,
    })
  }

  function addParticles(x: number, y: number, count: number, colors: string[]) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 1.5 + Math.random() * 3
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
      })
    }
  }

  function triggerRedFlash() {
    setRedFlash(true)
    setTimeout(() => setRedFlash(false), 200)
  }

  function triggerLostLife(index: number) {
    setLostLife(index)
    setTimeout(() => setLostLife(-1), 500)
  }

  function loseLife() {
    const lifeIndex = livesRef.current - 1
    livesRef.current--
    setLives(livesRef.current)
    triggerRedFlash()
    triggerLostLife(lifeIndex)
    if (livesRef.current <= 0) {
      gameStateRef.current = 'over'
      setGameState('over')
      if (scoreRef.current > (parseInt(localStorage.getItem('catch_high_score') || '0'))) {
        setHighScore(scoreRef.current)
        localStorage.setItem('catch_high_score', String(scoreRef.current))
      }
    }
  }

  function activateInvincibility() {
    invincibleRef.current = true
    setInvincible(true)
    if (invincibleTimer.current) clearTimeout(invincibleTimer.current)
    invincibleTimer.current = setTimeout(() => {
      invincibleRef.current = false
      setInvincible(false)
    }, 3000)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    const w = Math.min(window.innerWidth - 16, 400)
    const h = Math.min(window.innerHeight - 180, 550)
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    plateX.current = w / 2

    const PLATE_W = 60
    const PLATE_Y = h - 50

    // Init clouds
    if (clouds.current.length === 0) {
      for (let i = 0; i < 8; i++) {
        clouds.current.push({
          x: Math.random() * w,
          y: 20 + Math.random() * (h * 0.4),
          size: 20 + Math.random() * 40,
          speed: 0.1 + Math.random() * 0.3,
          opacity: 0.03 + Math.random() * 0.07,
        })
      }
    }

    function spawnItem() {
      const rand = Math.random()
      const isPowerUp = rand < 0.04 // 4% chance for power-up
      const isBad = !isPowerUp && rand < 0.19 // ~15% chance for bad
      let emoji: string
      let points = 0

      if (isPowerUp) {
        emoji = POWERUP_EMOJI
        points = 0
      } else if (isBad) {
        emoji = BAD_ITEMS[Math.floor(Math.random() * BAD_ITEMS.length)]
      } else {
        const food = FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)]
        emoji = food.emoji
        points = food.points
      }

      items.current.push({
        x: 20 + Math.random() * (w - 40),
        y: -20,
        emoji,
        speed: 1.5 + Math.random() * difficulty.current,
        isBad,
        isPowerUp,
        points,
        id: nextId.current++,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.06,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: 0.3 + Math.random() * 0.8,
      })
    }

    function drawPlate(x: number, y: number) {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(x, y + 8, PLATE_W / 2 + 2, 6, 0, 0, Math.PI * 2)
      ctx.fill()

      // Plate body (bottom rim)
      ctx.fillStyle = '#d4d4d4'
      ctx.beginPath()
      ctx.ellipse(x, y + 4, PLATE_W / 2, 8, 0, 0, Math.PI * 2)
      ctx.fill()

      // Plate top surface
      const plateGrad = ctx.createRadialGradient(x - 8, y - 4, 2, x, y, PLATE_W / 2)
      plateGrad.addColorStop(0, '#ffffff')
      plateGrad.addColorStop(0.5, '#f5f5f5')
      plateGrad.addColorStop(1, '#e0e0e0')
      ctx.fillStyle = plateGrad
      ctx.beginPath()
      ctx.ellipse(x, y, PLATE_W / 2, 10, 0, 0, Math.PI * 2)
      ctx.fill()

      // Rim ring
      ctx.strokeStyle = '#bbb'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(x, y, PLATE_W / 2, 10, 0, 0, Math.PI * 2)
      ctx.stroke()

      // Inner ring
      ctx.strokeStyle = 'rgba(180,180,180,0.4)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.ellipse(x, y, PLATE_W / 2 - 8, 6, 0, 0, Math.PI * 2)
      ctx.stroke()

      // Shine highlight
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.ellipse(x - 10, y - 3, 8, 3, -0.3, 0, Math.PI * 2)
      ctx.fill()

      // Invincibility glow
      if (invincibleRef.current) {
        ctx.save()
        ctx.shadowColor = '#ffd700'
        ctx.shadowBlur = 15 + Math.sin(frameCount.current * 0.15) * 5
        ctx.strokeStyle = 'rgba(255,215,0,0.7)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(x, y, PLATE_W / 2 + 3, 13, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
    }

    function drawClouds() {
      for (const cloud of clouds.current) {
        cloud.x += cloud.speed
        if (cloud.x > w + cloud.size) cloud.x = -cloud.size

        ctx.fillStyle = `rgba(255,255,255,${cloud.opacity})`
        ctx.beginPath()
        ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2)
        ctx.arc(cloud.x + cloud.size * 0.3, cloud.y - cloud.size * 0.1, cloud.size * 0.35, 0, Math.PI * 2)
        ctx.arc(cloud.x - cloud.size * 0.3, cloud.y + cloud.size * 0.05, cloud.size * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function drawStars() {
      const t = frameCount.current * 0.01
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137.5 + t * (10 + i % 5)) % w
        const sy = (i * 97.3) % (h * 0.5)
        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i))
        ctx.fillStyle = `rgba(255,255,255,${0.15 * twinkle})`
        ctx.beginPath()
        ctx.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function loop() {
      ctx.clearRect(0, 0, w, h)

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#1a0a2e')
      bg.addColorStop(0.5, '#3d0e0e')
      bg.addColorStop(1, '#1a0505')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Parallax stars & clouds
      drawStars()
      drawClouds()

      if (gameStateRef.current === 'idle') {
        ctx.font = 'bold 24px Rubik, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#ef4444'
        ctx.fillText('🍽️ תפוס את המנה', w / 2, h / 2 - 20)
        ctx.font = '14px Rubik, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.fillText('לחצו כדי להתחיל', w / 2, h / 2 + 20)
        frameRef.current = requestAnimationFrame(loop)
        return
      }

      if (gameStateRef.current === 'playing') {
        frameCount.current++
        difficulty.current = 1 + scoreRef.current * 0.05

        // Spawn: faster and more frequent over time
        const spawnRate = Math.max(15, 55 - Math.floor(difficulty.current * 4))
        if (frameCount.current % spawnRate === 0) spawnItem()

        const now = performance.now()

        // Update items
        for (const item of items.current) {
          item.y += item.speed
          item.rotation += item.rotSpeed
          item.wobblePhase += 0.05

          // Check catch
          if (item.y + 15 > PLATE_Y && item.y < PLATE_Y + 20 &&
              Math.abs(item.x - plateX.current) < PLATE_W / 2 + 10) {

            if (item.isPowerUp) {
              activateInvincibility()
              addFloatingText(item.x, PLATE_Y - 20, '⭐ חסינות!', '#ffd700', 1.3)
              addParticles(item.x, PLATE_Y, 12, ['#ffd700', '#ffec80', '#fff'])
            } else if (item.isBad) {
              if (invincibleRef.current) {
                addFloatingText(item.x, PLATE_Y - 20, 'מוגן!', '#ffd700')
                addParticles(item.x, PLATE_Y, 6, ['#ffd700', '#ffec80'])
              } else {
                loseLife()
                addParticles(item.x, PLATE_Y, 8, ['#ff0000', '#ff4444', '#880000'])
                comboRef.current = 0
                setCombo(0)
              }
            } else {
              // Good catch - combo logic
              const timeSinceLast = now - lastCatchTime.current
              if (timeSinceLast < 1000) {
                comboRef.current++
              } else {
                comboRef.current = 1
              }
              setCombo(comboRef.current)
              lastCatchTime.current = now

              const multiplier = Math.min(comboRef.current, 5)
              const gained = item.points * multiplier
              scoreRef.current += gained
              setScore(scoreRef.current)
              setScoreBounce(true)
              setTimeout(() => setScoreBounce(false), 200)

              const txt = multiplier > 1 ? `+${gained} x${multiplier}!` : `+${gained}`
              addFloatingText(item.x, PLATE_Y - 20, txt, multiplier > 1 ? '#ffdd44' : '#44ff44')

              if (comboRef.current >= 2) {
                addParticles(item.x, PLATE_Y, 6 + comboRef.current * 2,
                  ['#ffdd44', '#ff8844', '#44ff44', '#44ddff'])
              } else {
                addParticles(item.x, PLATE_Y, 6, ['#44ff44', '#88ff88', '#ffffff'])
              }
            }
            item.y = h + 50 // remove
          }

          // Miss good food
          if (!item.isBad && !item.isPowerUp && item.y > h + 10) {
            loseLife()
            comboRef.current = 0
            setCombo(0)
          }
        }

        // Remove off-screen
        items.current = items.current.filter(i => i.y < h + 50)
      }

      // Update floating texts
      floatingTexts.current = floatingTexts.current.filter(t => {
        t.life--
        t.y -= 1.2
        return t.life > 0
      })

      // Update particles
      particles.current = particles.current.filter(p => {
        p.life--
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.vx *= 0.98
        return p.life > 0
      })

      // Draw items with rotation and wobble
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const item of items.current) {
        ctx.save()
        const wobbleX = Math.sin(item.wobblePhase) * item.wobbleAmp
        ctx.translate(item.x + wobbleX, item.y)
        ctx.rotate(item.rotation)
        ctx.font = '26px serif'
        ctx.fillText(item.emoji, 0, 0)
        ctx.restore()
      }

      // Draw particles
      for (const p of particles.current) {
        const alpha = p.life / p.maxLife
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Draw floating texts
      for (const ft of floatingTexts.current) {
        const alpha = ft.life / ft.maxLife
        const scaleT = 1 + (1 - alpha) * 0.3
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.font = `bold ${Math.round(14 * ft.scale * scaleT)}px Rubik, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillStyle = ft.color
        ctx.shadowColor = ft.color
        ctx.shadowBlur = 6
        ctx.fillText(ft.text, ft.x, ft.y)
        ctx.restore()
      }

      // Draw plate
      drawPlate(plateX.current, PLATE_Y)

      // HUD on canvas (minimal - main HUD is in React)
      if (gameStateRef.current === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(0, 0, w, h)
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)

    // Mouse/touch controls
    function onMove(clientX: number) {
      const rect = canvas!.getBoundingClientRect()
      plateX.current = Math.max(30, Math.min(w - 30, clientX - rect.left))
    }

    function onMouse(e: MouseEvent) { onMove(e.clientX) }
    function onTouch(e: TouchEvent) { e.preventDefault(); onMove(e.touches[0].clientX) }

    canvas.addEventListener('mousemove', onMouse)
    canvas.addEventListener('touchmove', onTouch, { passive: false })

    return () => {
      cancelAnimationFrame(frameRef.current)
      canvas.removeEventListener('mousemove', onMouse)
      canvas.removeEventListener('touchmove', onTouch)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#1a0505] flex flex-col items-center font-rubik" dir="rtl">
      {/* Red flash overlay */}
      <AnimatePresence>
        {redFlash && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-red-600 pointer-events-none z-50"
          />
        )}
      </AnimatePresence>

      {/* Invincibility glow border */}
      <AnimatePresence>
        {invincible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
            className="fixed inset-0 border-4 border-yellow-400 rounded-lg pointer-events-none z-40"
            style={{ boxShadow: '0 0 30px rgba(255,215,0,0.4) inset' }}
          />
        )}
      </AnimatePresence>

      <div className="w-full max-w-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <h1 className="text-lg font-bold text-red-400">תפוס את המנה</h1>
        </div>
        <button onClick={() => router.push('/games')} className="text-white/50 text-sm active:scale-95">חזרה</button>
      </div>

      {/* HUD: Score + Lives + Combo */}
      {gameState === 'playing' && (
        <div className="w-full max-w-lg px-4 pb-2 flex items-center justify-between">
          {/* Score */}
          <motion.div
            animate={scoreBounce ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.2 }}
            className="text-white font-bold text-lg"
          >
            ניקוד: {score}
          </motion.div>

          {/* Combo */}
          <AnimatePresence>
            {combo >= 2 && (
              <motion.div
                key={combo}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1, 1.4, 1], opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-yellow-400 font-black text-xl"
              >
                x{Math.min(combo, 5)}!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hearts */}
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={
                  lostLife === i
                    ? { scale: [1, 1.5, 0], opacity: [1, 1, 0], rotate: [0, 0, 45] }
                    : i < lives
                    ? { scale: [1, 1.15, 1] }
                    : { scale: 1 }
                }
                transition={
                  lostLife === i
                    ? { duration: 0.4 }
                    : i < lives
                    ? { duration: 0.8, repeat: Infinity, repeatType: 'loop' as const }
                    : {}
                }
                className="text-lg"
              >
                {i < lives ? '❤️' : '🖤'}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onClick={() => { if (gameStateRef.current === 'idle') startGame() }}
        className="rounded-xl border-2 border-white/10 touch-none"
      />

      {gameState === 'over' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center">
          <p className="text-red-400 font-bold text-lg mb-1">Game Over!</p>
          <p className="text-white/60 text-sm mb-1">ניקוד: {score} | שיא: {Math.max(score, highScore)}</p>
          {combo >= 2 && (
            <p className="text-yellow-400/60 text-xs mb-3">שיא קומבו: x{Math.min(combo, 5)}</p>
          )}
          <div className="flex gap-3 justify-center mt-3">
            <button onClick={startGame} className="bg-red-500 text-white px-6 py-2.5 rounded-full font-bold active:scale-95">
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
