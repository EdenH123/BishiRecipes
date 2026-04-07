'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface GameCard {
  id: string
  title: string
  description: string
  emoji: string
  href: string
  gradient: string
  glowColor: string
  available: boolean
}

const GAMES: GameCard[] = [
  {
    id: 'flappy',
    title: 'Flappy Falafel',
    description: 'עופו בין עמודי האוכל ותשברו שיאים!',
    emoji: '🧆',
    href: '/flappy',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #065f46 100%)',
    glowColor: 'rgba(14, 165, 120, 0.4)',
    available: true,
  },
  {
    id: 'memory',
    title: 'זיכרון מצרכים',
    description: 'מצאו זוגות תואמים — עם קומבו!',
    emoji: '🃏',
    href: '/games/memory',
    gradient: 'linear-gradient(135deg, #581c87 0%, #9d174d 100%)',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    available: true,
  },
  {
    id: 'quiz',
    title: 'חידון בישול',
    description: '15 שניות, streak fire, בונוס מהירות!',
    emoji: '🧠',
    href: '/games/quiz',
    gradient: 'linear-gradient(135deg, #92400e 0%, #c2410c 100%)',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    available: true,
  },
  {
    id: 'snake',
    title: 'נחש הפלאפל',
    description: 'אספו אוכל זהוב, הימנעו מעצמכם!',
    emoji: '🐍',
    href: '/games/snake',
    gradient: 'linear-gradient(135deg, #14532d 0%, #064e3b 100%)',
    glowColor: 'rgba(74, 222, 128, 0.4)',
    available: true,
  },
  {
    id: 'catch',
    title: 'תפוס את המנה',
    description: 'קומבו, power-ups, ואוכל נדיר!',
    emoji: '🍽️',
    href: '/games/catch',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    available: true,
  },
  {
    id: 'word',
    title: 'מילה מבושלת',
    description: 'נחשו 20 מילים עם רמזים ובונוסים!',
    emoji: '📝',
    href: '/games/word',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #312e81 100%)',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    available: true,
  },
  {
    id: 'find',
    title: 'מצא את הפלאפל',
    description: 'הפלאפל מתחבא — מצאו אותו בין האוכל!',
    emoji: '🔍',
    href: '/games/find',
    gradient: 'linear-gradient(135deg, #4a1942 0%, #2d1b4e 100%)',
    glowColor: 'rgba(192, 132, 252, 0.4)',
    available: true,
  },
  {
    id: 'runner',
    title: 'ריצת הפלאפל',
    description: 'רוצו, קפצו והימנעו ממכשולי אוכל!',
    emoji: '🏃',
    href: '/games/runner',
    gradient: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    available: true,
  },
]

// Floating background emojis
const BG_EMOJIS = ['🍕', '🍔', '🌮', '🍩', '🧁', '🍰', '🥐', '🍟', '🧆', '🍣', '🥑', '🍜']

function FloatingEmoji({ emoji, delay }: { emoji: string; delay: number }) {
  const x = Math.random() * 100
  const duration = 12 + Math.random() * 10
  const size = 16 + Math.random() * 12

  return (
    <motion.span
      className="absolute pointer-events-none select-none"
      style={{ left: `${x}%`, fontSize: size, opacity: 0 }}
      animate={{
        y: ['-20px', `${window?.innerHeight + 40}px`],
        opacity: [0, 0.15, 0.15, 0],
        rotate: [0, 360],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {emoji}
    </motion.span>
  )
}

export default function GamesPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="min-h-screen font-rubik relative overflow-hidden" dir="rtl" style={{
      background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1033 40%, #0f172a 100%)',
    }}>
      {/* Floating background emojis */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {BG_EMOJIS.map((emoji, i) => (
            <FloatingEmoji key={i} emoji={emoji} delay={i * 1.5} />
          ))}
        </div>
      )}

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="bg-black/30 backdrop-blur-xl border-b border-white/5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.span
              className="text-3xl"
              animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatDelay: 4 }}
            >
              🎮
            </motion.span>
            <div>
              <h1 className="text-xl font-bold text-white">מרכז המשחקים</h1>
              <p className="text-[11px] text-white/40">Easter Eggs של BISHILicious</p>
            </div>
          </motion.div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-sm text-white/50 hover:text-white active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
            חזרה
          </motion.button>
        </div>
      </div>

      {/* Games Grid */}
      <div className="max-w-2xl mx-auto px-4 py-6 relative z-[1]">
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((game, i) => (
            <motion.button
              key={game.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 250, damping: 22 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => game.available && router.push(game.href)}
              disabled={!game.available}
              className="relative rounded-2xl overflow-hidden text-right"
              style={{
                boxShadow: `0 8px 32px ${game.glowColor}, 0 2px 8px rgba(0,0,0,0.3)`,
              }}
            >
              {/* Background */}
              <div className="absolute inset-0" style={{ background: game.gradient }} />

              {/* Subtle noise texture overlay */}
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
              />

              {/* Shine effect */}
              <div className="absolute top-0 right-0 w-24 h-24 opacity-20"
                style={{ background: 'radial-gradient(circle at top right, white 0%, transparent 70%)' }}
              />

              {/* Content */}
              <div className="relative p-4 pb-5">
                <motion.span
                  className="text-4xl block mb-2.5 drop-shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.3, type: 'spring', stiffness: 400, damping: 15 }}
                >
                  {game.emoji}
                </motion.span>
                <h3 className="text-white font-bold text-[15px] leading-tight mb-1 drop-shadow">{game.title}</h3>
                <p className="text-white/60 text-[11px] leading-snug">{game.description}</p>
              </div>

              {/* Bottom border glow */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, transparent 0%, ${game.glowColor} 50%, transparent 100%)` }}
              />
            </motion.button>
          ))}
        </div>

        {/* Secret hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center text-[11px] text-white/20 mt-10"
        >
          🤫 מצאתם את הסוד! 3 לחיצות על הלוגו...
        </motion.p>
      </div>
    </div>
  )
}
