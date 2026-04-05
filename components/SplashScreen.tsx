'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const spring = { type: 'spring' as const, stiffness: 300, damping: 18 }

// Falling food rain
const RAIN_EMOJIS = ['🍕', '🧁', '🍰', '🥗', '🍖', '🥘', '🍲', '🥙', '🍩', '🧆', '🍔', '🌮', '🥯', '🍳', '🥐', '🍪']
const RAIN_DROPS = Array.from({ length: 20 }, (_, i) => ({
  emoji: RAIN_EMOJIS[i % RAIN_EMOJIS.length],
  x: (i * 5.2 + 2) % 100,
  delay: i * 0.12,
  duration: 1.8 + (i % 5) * 0.3,
  size: i % 3 === 0 ? 'text-2xl' : i % 3 === 1 ? 'text-xl' : 'text-lg',
}))

const LOADING_TEXTS = [
  'מחממים תנור...',
  'מכינים מצרכים...',
  'עורכים שולחן...',
]

export default function SplashScreen() {
  const [show, setShow] = useState(true)
  const [textIndex, setTextIndex] = useState(0)

  useEffect(() => {
    if (sessionStorage.getItem('splash_shown')) {
      setShow(false)
      return
    }
    sessionStorage.setItem('splash_shown', '1')
    const timer = setTimeout(() => setShow(false), 3000)

    // Cycle loading text
    const textTimer = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length)
    }, 800)

    return () => {
      clearTimeout(timer)
      clearInterval(textTimer)
    }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #fff8f0 0%, #fff1e6 50%, #ffe8d6 100%)' }}
        >
          {/* Radial glow behind center */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(180,28,27,0.08) 0%, transparent 70%)' }}
          />

          {/* Falling food rain */}
          {RAIN_DROPS.map((drop, i) => (
            <motion.span
              key={i}
              initial={{ y: '-10%', opacity: 0, rotate: 0 }}
              animate={{
                y: '110vh',
                opacity: [0, 0.25, 0.25, 0],
                rotate: i % 2 === 0 ? 360 : -360,
              }}
              transition={{
                delay: drop.delay,
                duration: drop.duration,
                ease: 'linear',
                repeat: Infinity,
              }}
              className={`absolute ${drop.size} select-none pointer-events-none`}
              style={{ left: `${drop.x}%`, top: 0 }}
            >
              {drop.emoji}
            </motion.span>
          ))}

          {/* Utensils animation */}
          <div className="relative flex items-end justify-center mb-4">
            {/* Fork sweeps in from left */}
            <motion.span
              initial={{ x: -150, opacity: 0, rotate: -45 }}
              animate={{ x: 0, opacity: 1, rotate: 8 }}
              transition={{ delay: 0.3, ...spring }}
              className="text-5xl -mr-1"
            >
              🍴
            </motion.span>

            {/* Pan drops in from top with bounce */}
            <motion.span
              initial={{ y: -200, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{
                delay: 0.6,
                type: 'spring',
                stiffness: 200,
                damping: 12,
              }}
              className="text-8xl mx-1 relative z-10"
            >
              🍳
            </motion.span>

            {/* Knife sweeps in from right */}
            <motion.span
              initial={{ x: 150, opacity: 0, rotate: 45 }}
              animate={{ x: 0, opacity: 1, rotate: -8 }}
              transition={{ delay: 0.3, ...spring }}
              className="text-5xl -ml-1"
            >
              🔪
            </motion.span>
          </div>

          {/* Impact flash when pan lands */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2, 0], opacity: [0, 0.25, 0] }}
            transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
            className="absolute w-24 h-24 rounded-full bg-primary"
          />

          {/* Sparkle particles on impact */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={`spark-${i}`}
              initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                x: Math.cos((i * Math.PI) / 3) * 60,
                y: Math.sin((i * Math.PI) / 3) * 60 - 40,
              }}
              transition={{ delay: 0.85, duration: 0.5 }}
              className="absolute w-2 h-2 rounded-full bg-amber-400"
            />
          ))}

          {/* Logo */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.3, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 1.1, type: 'spring', stiffness: 250, damping: 15 }}
            className="text-4xl font-bold text-primary font-rubik mt-2"
          >
            BISHILicious
          </motion.h1>

          {/* Subtitle with heart pulse */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.3 }}
            className="text-on-surface-variant mt-2 font-rubik flex items-center gap-1"
          >
            <span className="text-sm">מתכונים של המשפחה</span>
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ delay: 1.8, duration: 0.6, repeat: Infinity, repeatDelay: 0.8 }}
            >
              ❤️
            </motion.span>
          </motion.p>

          {/* Loading text cycling */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={textIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 0.6, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-on-surface-variant font-rubik"
              >
                {LOADING_TEXTS[textIndex]}
              </motion.span>
            </AnimatePresence>

            {/* Animated dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [0.8, 1.3, 0.8],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    delay: 1.7 + i * 0.15,
                    duration: 0.7,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="w-2 h-2 rounded-full bg-primary/50"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
