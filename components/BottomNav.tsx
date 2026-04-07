'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const NAV_ITEMS = [
  { href: '/', icon: 'home', label: 'בית', fillOnActive: true },
  { href: '/recipe/new', icon: 'add_circle', label: 'הוספה', fillOnActive: false },
  { href: '/shopping-list', icon: 'shopping_cart', label: 'קניות', fillOnActive: true },
  { href: '/leaderboard', icon: 'emoji_events', label: 'לידרבורד', fillOnActive: true },
  { href: '/profile', icon: 'person', label: 'פרופיל', fillOnActive: false },
]

export default function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href
  }

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-surface/90 backdrop-blur-lg border-t border-surface-container-highest/30 shadow-[0_-4px_20px_rgba(180,28,27,0.05)] flex flex-row-reverse justify-around items-center px-4 pt-2 rounded-t-[1.5rem]" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center justify-center p-3 rounded-2xl transition-colors duration-200 text-on-surface-variant hover:text-primary"
          >
            {active && (
              <motion.div
                layoutId="bottomNavIndicator"
                className="absolute inset-0 rounded-2xl bg-primary/10"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <motion.span
              className={`material-symbols-outlined relative z-10 ${active ? 'text-primary' : ''}`}
              style={active && item.fillOnActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              whileTap={{ scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {item.icon}
            </motion.span>
            <motion.span
              className={`text-xs mt-1 relative z-10 ${active ? 'text-primary font-bold' : ''}`}
              whileTap={{ scale: 0.9 }}
            >
              {item.label}
            </motion.span>
          </Link>
        )
      })}
    </nav>
  )
}
