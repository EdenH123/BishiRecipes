'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const GOOD_ITEMS = ['🍕', '🍔', '🌮', '🍩', '🧁', '🍪', '🥐', '🍟', '🌭', '🍫', '🥙', '🍗', '🍣', '🥑', '🍜', '🧆']
const BAD_ITEMS = ['💣', '🗑️', '🧨', '☠️']

interface FallingItem {
  x: number
  y: number
  emoji: string
  speed: number
  isBad: boolean
  id: number
}

export default function CatchGame() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [highScore, setHighScore] = useState(0)

  const plateX = useRef(0)
  const items = useRef<FallingItem[]>([])
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const gameStateRef = useRef<'idle' | 'playing' | 'over'>('idle')
  const frameCount = useRef(0)
  const nextId = useRef(0)
  const difficulty = useRef(1)

  useEffect(() => {
    const saved = localStorage.getItem('catch_high_score')
    if (saved) setHighScore(parseInt(saved))
  }, [])

  function startGame() {
    items.current = []
    scoreRef.current = 0
    livesRef.current = 3
    frameCount.current = 0
    difficulty.current = 1
    setScore(0)
    setLives(3)
    gameStateRef.current = 'playing'
    setGameState('playing')
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

    function spawnItem() {
      const isBad = Math.random() < 0.15
      const emojis = isBad ? BAD_ITEMS : GOOD_ITEMS
      items.current.push({
        x: 20 + Math.random() * (w - 40),
        y: -20,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        speed: 1.5 + Math.random() * difficulty.current,
        isBad,
        id: nextId.current++,
      })
    }

    function loop() {
      ctx.clearRect(0, 0, w, h)

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#4a0e0e')
      bg.addColorStop(1, '#1a0505')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

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

        // Spawn
        const spawnRate = Math.max(30, 60 - scoreRef.current * 2)
        if (frameCount.current % spawnRate === 0) spawnItem()

        // Update items
        for (const item of items.current) {
          item.y += item.speed

          // Check catch
          if (item.y + 15 > PLATE_Y && item.y < PLATE_Y + 20 &&
              Math.abs(item.x - plateX.current) < PLATE_W / 2 + 10) {
            if (item.isBad) {
              livesRef.current--
              setLives(livesRef.current)
              if (livesRef.current <= 0) {
                gameStateRef.current = 'over'
                setGameState('over')
                if (scoreRef.current > highScore) {
                  setHighScore(scoreRef.current)
                  localStorage.setItem('catch_high_score', String(scoreRef.current))
                }
              }
            } else {
              scoreRef.current++
              setScore(scoreRef.current)
            }
            item.y = h + 50 // remove
          }

          // Miss good food
          if (!item.isBad && item.y > h + 10) {
            livesRef.current--
            setLives(livesRef.current)
            if (livesRef.current <= 0) {
              gameStateRef.current = 'over'
              setGameState('over')
              if (scoreRef.current > highScore) {
                setHighScore(scoreRef.current)
                localStorage.setItem('catch_high_score', String(scoreRef.current))
              }
            }
          }
        }

        // Remove off-screen
        items.current = items.current.filter(i => i.y < h + 50)
      }

      // Draw items
      ctx.font = '26px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const item of items.current) {
        ctx.fillText(item.emoji, item.x, item.y)
      }

      // Draw plate
      ctx.fillStyle = '#f5f5f5'
      ctx.beginPath()
      ctx.ellipse(plateX.current, PLATE_Y + 5, PLATE_W / 2, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e0e0e0'
      ctx.beginPath()
      ctx.ellipse(plateX.current, PLATE_Y, PLATE_W / 2, 10, 0, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f5f5f5'
      ctx.beginPath()
      ctx.ellipse(plateX.current, PLATE_Y, PLATE_W / 2, 10, 0, 0, Math.PI)
      ctx.fill()
      // Plate rim
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(plateX.current, PLATE_Y, PLATE_W / 2, 10, 0, 0, Math.PI * 2)
      ctx.stroke()

      // HUD
      ctx.save()
      ctx.font = 'bold 16px Rubik, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText(`ניקוד: ${scoreRef.current}`, w - 10, 25)
      ctx.textAlign = 'left'
      ctx.fillText('❤️'.repeat(livesRef.current), 10, 25)
      ctx.restore()

      if (gameStateRef.current === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
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
      <div className="w-full max-w-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <h1 className="text-lg font-bold text-red-400">תפוס את המנה</h1>
        </div>
        <button onClick={() => router.push('/games')} className="text-white/50 text-sm active:scale-95">חזרה</button>
      </div>

      <canvas
        ref={canvasRef}
        onClick={() => { if (gameStateRef.current === 'idle') startGame() }}
        className="rounded-xl border-2 border-white/10 touch-none"
      />

      {gameState === 'over' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center">
          <p className="text-red-400 font-bold text-lg mb-1">Game Over!</p>
          <p className="text-white/60 text-sm mb-3">ניקוד: {score} | שיא: {highScore}</p>
          <div className="flex gap-3 justify-center">
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
