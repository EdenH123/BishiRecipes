'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface GameCard {
  id: string
  title: string
  description: string
  emoji: string
  href: string
  color: string
  available: boolean
}

const GAMES: GameCard[] = [
  {
    id: 'flappy',
    title: 'Flappy Falafel',
    description: 'עופו בין עמודי האוכל ותשברו שיאים!',
    emoji: '🧆',
    href: '/flappy',
    color: 'from-sky-400 to-green-400',
    available: true,
  },
  {
    id: 'memory',
    title: 'זיכרון מצרכים',
    description: 'מצאו זוגות של מצרכים תואמים',
    emoji: '🃏',
    href: '/games/memory',
    color: 'from-purple-400 to-pink-400',
    available: false,
  },
  {
    id: 'quiz',
    title: 'חידון בישול',
    description: 'כמה אתם באמת יודעים על בישול?',
    emoji: '🧠',
    href: '/games/quiz',
    color: 'from-amber-400 to-orange-400',
    available: false,
  },
  {
    id: 'snake',
    title: 'נחש הפלאפל',
    description: 'אספו אוכל והתארכו בלי לפגוע בעצמכם',
    emoji: '🐍',
    href: '/games/snake',
    color: 'from-green-400 to-emerald-500',
    available: false,
  },
  {
    id: 'catch',
    title: 'תפוס את המנה',
    description: 'תפסו מנות שנופלות מהשמיים',
    emoji: '🍽️',
    href: '/games/catch',
    color: 'from-rose-400 to-red-400',
    available: false,
  },
  {
    id: 'word',
    title: 'מילה מבושלת',
    description: 'נחשו את המצרך לפי רמזים',
    emoji: '📝',
    href: '/games/word',
    color: 'from-blue-400 to-indigo-400',
    available: false,
  },
]

export default function GamesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface to-primary/5 font-rubik" dir="rtl">
      {/* Header */}
      <div className="bg-surface/80 backdrop-blur-md shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎮</span>
            <div>
              <h1 className="text-xl font-bold text-primary">מרכז המשחקים</h1>
              <p className="text-xs text-on-surface-variant">Easter Eggs של BISHILicious</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
            חזרה
          </button>
        </div>
      </div>

      {/* Games Grid */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {GAMES.map((game, i) => (
            <motion.button
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
              onClick={() => game.available && router.push(game.href)}
              disabled={!game.available}
              className={`relative rounded-2xl overflow-hidden text-right active:scale-95 transition-transform ${
                game.available ? 'shadow-lg' : 'opacity-50'
              }`}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-90`} />

              {/* Content */}
              <div className="relative p-4 pb-5">
                <span className="text-4xl block mb-2">{game.emoji}</span>
                <h3 className="text-white font-bold text-base leading-tight mb-1">{game.title}</h3>
                <p className="text-white/80 text-xs leading-snug">{game.description}</p>

                {!game.available && (
                  <div className="absolute top-3 left-3 bg-black/30 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    בקרוב
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Secret hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-on-surface-variant/50 mt-8"
        >
          🤫 מצאתם את הסוד! ספרו לחברים...
        </motion.p>
      </div>
    </div>
  )
}
