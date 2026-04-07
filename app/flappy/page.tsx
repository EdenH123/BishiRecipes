'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

interface Score {
  id?: string
  user_id: string
  display_name: string
  score: number
  created_at?: string
}

const GRAVITY = 0.45
const JUMP_FORCE = -7.5
const PIPE_WIDTH = 56
const PIPE_GAP = 155
const PIPE_SPEED = 2.8
const BIRD_SIZE = 36
const PIPE_SPAWN_INTERVAL = 95 // frames

export default function FlappyPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle')
  const [score, setScore] = useState(0)
  const [highScores, setHighScores] = useState<Score[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [personalBest, setPersonalBest] = useState(0)

  // Game state refs for animation loop
  const birdY = useRef(200)
  const birdVel = useRef(0)
  const pipes = useRef<{ x: number; topH: number; scored: boolean }[]>([])
  const scoreRef = useRef(0)
  const gameStateRef = useRef<'idle' | 'playing' | 'over'>('idle')
  const frameCount = useRef(0)
  const flapAngle = useRef(0)

  // Load user & scores
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
        if (profile) setDisplayName(profile.display_name || 'אנונימי')
      }
      loadHighScores()
    }
    init()
  }, [])

  async function loadHighScores() {
    try {
      const { data } = await supabase
        .from('flappy_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10)
      if (data) setHighScores(data)
    } catch {
      // Table may not exist — load from localStorage
      const local = JSON.parse(localStorage.getItem('flappy_scores') || '[]')
      setHighScores(local)
    }
  }

  async function saveScore(finalScore: number) {
    if (!userId || finalScore === 0) return

    // Update personal best
    if (finalScore > personalBest) setPersonalBest(finalScore)

    try {
      await supabase.from('flappy_scores').insert({
        user_id: userId,
        display_name: displayName,
        score: finalScore,
      })
    } catch {
      // Fallback to localStorage
      const local = JSON.parse(localStorage.getItem('flappy_scores') || '[]')
      local.push({ user_id: userId, display_name: displayName, score: finalScore, created_at: new Date().toISOString() })
      local.sort((a: Score, b: Score) => b.score - a.score)
      localStorage.setItem('flappy_scores', JSON.stringify(local.slice(0, 10)))
    }
    loadHighScores()
  }

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    birdY.current = (canvas.height / dpr) / 2 - BIRD_SIZE / 2
    birdVel.current = 0
    pipes.current = []
    scoreRef.current = 0
    frameCount.current = 0
    flapAngle.current = 0
    setScore(0)
  }, [])

  const jump = useCallback(() => {
    if (gameStateRef.current === 'idle') {
      resetGame()
      gameStateRef.current = 'playing'
      setGameState('playing')
      birdVel.current = JUMP_FORCE
    } else if (gameStateRef.current === 'playing') {
      birdVel.current = JUMP_FORCE
    }
  }, [resetGame])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // Set canvas size with devicePixelRatio for sharp rendering
    let dpr = 1
    function resize() {
      if (!canvas) return
      dpr = window.devicePixelRatio || 1
      const w = Math.min(window.innerWidth, 420)
      const h = Math.min(window.innerHeight - 80, 640)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // Logical canvas dimensions (use these instead of canvas.width/height)
    function cw() { return canvas!.width / dpr }
    function ch() { return canvas!.height / dpr }

    // Load falafel image at high resolution
    const falafelImg = new window.Image()
    falafelImg.src = '/logo.png'
    let falafelLoaded = false
    falafelImg.onload = () => { falafelLoaded = true }

    function drawBird(ctx: CanvasRenderingContext2D) {
      const x = 70
      const y = birdY.current

      ctx.save()
      ctx.translate(x + BIRD_SIZE / 2, y + BIRD_SIZE / 2)

      // Rotate based on velocity
      const angle = Math.min(Math.max(birdVel.current * 3, -30), 70) * (Math.PI / 180)
      ctx.rotate(angle)

      if (falafelLoaded) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.beginPath()
        ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(falafelImg, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE)
      } else {
        // Fallback circle
        ctx.beginPath()
        ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2)
        ctx.fillStyle = '#C8A951'
        ctx.fill()
        ctx.font = `${BIRD_SIZE * 0.6}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🧆', 0, 2)
      }
      ctx.restore()
    }

    // Food emojis for pipe columns — each pipe gets a random pattern
    const FOOD_EMOJIS = ['🍕', '🍔', '🌮', '🍩', '🧁', '🍪', '🍰', '🥐', '🍟', '🌭', '🥯', '🍫', '🥙', '🧇', '🍗']
    const pipeEmojis = new Map<number, string[]>()

    function getPipeEmojis(topH: number): string[] {
      const key = Math.round(topH)
      if (!pipeEmojis.has(key)) {
        const count = Math.ceil(ch() / 28) + 2
        const emojis: string[] = []
        for (let i = 0; i < count; i++) {
          emojis.push(FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)])
        }
        pipeEmojis.set(key, emojis)
      }
      return pipeEmojis.get(key)!
    }

    function drawPipe(ctx: CanvasRenderingContext2D, x: number, topH: number) {
      if (!canvas) return
      const emojis = getPipeEmojis(topH)
      const emojiSize = 28
      ctx.font = `${emojiSize}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Top column (stacked food emojis from top down)
      const topCount = Math.ceil(topH / emojiSize)
      for (let i = 0; i < topCount; i++) {
        const ey = i * emojiSize + emojiSize / 2
        if (ey - emojiSize / 2 < topH) {
          ctx.fillText(emojis[i % emojis.length], x + PIPE_WIDTH / 2, ey)
        }
      }

      // Bottom column (stacked food emojis from gap down)
      const bottomY = topH + PIPE_GAP
      const bottomCount = Math.ceil((ch() - bottomY) / emojiSize) + 1
      for (let i = 0; i < bottomCount; i++) {
        const ey = bottomY + i * emojiSize + emojiSize / 2
        if (ey < ch()) {
          ctx.fillText(emojis[(i + 5) % emojis.length], x + PIPE_WIDTH / 2, ey)
        }
      }
    }

    function drawGround(ctx: CanvasRenderingContext2D) {
      if (!canvas) return
      const groundY = ch() - 40
      ctx.fillStyle = '#DEB887'
      ctx.fillRect(0, groundY, cw(), 40)
      ctx.fillStyle = '#8B7355'
      ctx.fillRect(0, groundY, cw(), 3)
      // Ground pattern
      ctx.fillStyle = '#C4A46C'
      for (let x = (frameCount.current * -2) % 30; x < cw(); x += 30) {
        ctx.fillRect(x, groundY + 8, 15, 3)
      }
    }

    function drawBackground(ctx: CanvasRenderingContext2D) {
      if (!canvas) return
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, ch())
      skyGrad.addColorStop(0, '#87CEEB')
      skyGrad.addColorStop(0.7, '#B0E0E6')
      skyGrad.addColorStop(1, '#F0E68C')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, cw(), ch())

      // Clouds
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      const offset = (frameCount.current * 0.3) % (cw() + 100)
      for (let i = 0; i < 3; i++) {
        const cx = ((i * 170 + offset) % (cw() + 100)) - 50
        const cy = 50 + i * 60
        ctx.beginPath()
        ctx.arc(cx, cy, 25, 0, Math.PI * 2)
        ctx.arc(cx + 20, cy - 10, 20, 0, Math.PI * 2)
        ctx.arc(cx + 40, cy, 25, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function drawScore(ctx: CanvasRenderingContext2D) {
      if (!canvas) return
      ctx.save()
      ctx.font = 'bold 40px Rubik, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'white'
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 4
      ctx.strokeText(String(scoreRef.current), cw() / 2, 60)
      ctx.fillText(String(scoreRef.current), cw() / 2, 60)
      ctx.restore()
    }

    function checkCollision(): boolean {
      if (!canvas) return false
      const bx = 70
      const by = birdY.current
      const r = BIRD_SIZE / 2 - 2

      // Ground/ceiling
      if (by + BIRD_SIZE > ch() - 40 || by < 0) return true

      // Pipes
      for (const pipe of pipes.current) {
        const inXRange = bx + BIRD_SIZE - r > pipe.x && bx + r < pipe.x + PIPE_WIDTH
        if (inXRange) {
          if (by + r < pipe.topH || by + BIRD_SIZE - r > pipe.topH + PIPE_GAP) return true
        }
      }
      return false
    }

    function gameLoop() {
      if (!canvas) return
      ctx.clearRect(0, 0, cw(), ch())
      drawBackground(ctx)

      if (gameStateRef.current === 'idle') {
        // Floating bird animation
        birdY.current = ch() / 2 - BIRD_SIZE / 2 + Math.sin(frameCount.current * 0.05) * 15
        drawGround(ctx)
        drawBird(ctx)

        // Title
        ctx.save()
        ctx.font = 'bold 28px Rubik, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#2D5016'
        ctx.fillText('Flappy Falafel', cw() / 2, ch() / 2 - 70)
        ctx.font = '16px Rubik, sans-serif'
        ctx.fillStyle = '#5B8C3E'
        ctx.fillText('לחצו כדי להתחיל', cw() / 2, ch() / 2 + 60)
        ctx.restore()
      } else if (gameStateRef.current === 'playing') {
        // Physics
        birdVel.current += GRAVITY
        birdY.current += birdVel.current

        // Spawn pipes
        frameCount.current++
        if (frameCount.current % PIPE_SPAWN_INTERVAL === 0) {
          const minTop = 60
          const maxTop = ch() - PIPE_GAP - 100
          const topH = minTop + Math.random() * (maxTop - minTop)
          pipes.current.push({ x: cw(), topH, scored: false })
        }

        // Move pipes & score
        for (const pipe of pipes.current) {
          pipe.x -= PIPE_SPEED
          if (!pipe.scored && pipe.x + PIPE_WIDTH < 70) {
            pipe.scored = true
            scoreRef.current++
            setScore(scoreRef.current)
          }
        }

        // Remove off-screen pipes
        pipes.current = pipes.current.filter(p => p.x > -PIPE_WIDTH - 10)

        // Draw
        for (const pipe of pipes.current) drawPipe(ctx, pipe.x, pipe.topH)
        drawGround(ctx)
        drawBird(ctx)
        drawScore(ctx)

        // Collision
        if (checkCollision()) {
          gameStateRef.current = 'over'
          setGameState('over')
          saveScore(scoreRef.current)
        }
      } else {
        // Game over — draw last frame frozen
        for (const pipe of pipes.current) drawPipe(ctx, pipe.x, pipe.topH)
        drawGround(ctx)
        drawBird(ctx)
        drawScore(ctx)

        // Darken
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        ctx.fillRect(0, 0, cw(), ch())
      }

      frameRef.current = requestAnimationFrame(gameLoop)
    }

    frameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // Touch/click handlers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleInteraction = (e: Event) => {
      e.preventDefault()
      if (gameStateRef.current === 'over') return
      jump()
    }

    canvas.addEventListener('touchstart', handleInteraction, { passive: false })
    canvas.addEventListener('mousedown', handleInteraction)

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        if (gameStateRef.current === 'over') return
        jump()
      }
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      canvas.removeEventListener('touchstart', handleInteraction)
      canvas.removeEventListener('mousedown', handleInteraction)
      window.removeEventListener('keydown', handleKey)
    }
  }, [jump])

  function handleRestart() {
    resetGame()
    gameStateRef.current = 'idle'
    setGameState('idle')
  }

  return (
    <div className="min-h-screen bg-[#87CEEB] flex flex-col items-center justify-center font-rubik" dir="rtl">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="rounded-2xl shadow-2xl border-4 border-white/30 touch-none"
        />

        {/* Back button on idle screen */}
        {gameState === 'idle' && (
          <button
            onClick={(e) => { e.stopPropagation(); router.push('/') }}
            className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform z-10"
          >
            חזרה
          </button>
        )}

        <AnimatePresence>
          {gameState === 'over' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mx-4 shadow-xl max-w-sm w-full max-h-[80%] overflow-y-auto">
                <h2 className="text-2xl font-bold text-center text-red-500 mb-1">Game Over!</h2>
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold text-primary">{score}</span>
                  <p className="text-sm text-gray-500 mt-1">
                    {score > personalBest ? '🎉 שיא חדש!' : `שיא אישי: ${personalBest}`}
                  </p>
                </div>

                {/* Leaderboard */}
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-2 text-center">🏆 לידרבורד</h3>
                  <div className="space-y-1.5">
                    {highScores.length === 0 && (
                      <p className="text-xs text-gray-400 text-center">אין תוצאות עדיין</p>
                    )}
                    {highScores.map((s, i) => (
                      <div
                        key={s.id || i}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
                          s.user_id === userId && s.score === score
                            ? 'bg-primary/10 font-bold'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-center font-bold text-xs">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                          </span>
                          <span className="truncate max-w-[120px]">{s.display_name}</span>
                        </div>
                        <span className="font-bold text-primary">{s.score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleRestart}
                    className="flex-1 bg-primary text-white py-3 rounded-full font-bold active:scale-95 transition-transform"
                  >
                    שחק שוב
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-full font-bold active:scale-95 transition-transform"
                  >
                    חזרה
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
