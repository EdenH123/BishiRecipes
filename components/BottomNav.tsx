'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  const isHome = pathname === '/'
  const isNew = pathname === '/recipe/new'
  const isLeaderboard = pathname === '/leaderboard'
  const isProfile = pathname === '/profile'

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-surface/90 backdrop-blur-lg border-t border-surface-container-highest/30 shadow-[0_-4px_20px_rgba(180,28,27,0.05)] flex flex-row-reverse justify-around items-center px-4 pt-2 rounded-t-[1.5rem]" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <Link
        href="/"
        className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
          isHome
            ? 'bg-primary/10 text-primary scale-110'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={isHome ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          home
        </span>
        <span className="text-xs mt-1">בית</span>
      </Link>

      <Link
        href="/recipe/new"
        className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
          isNew
            ? 'bg-primary/10 text-primary scale-110'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <span className="material-symbols-outlined">add_circle</span>
        <span className="text-xs mt-1">הוספה</span>
      </Link>

      <Link
        href="/leaderboard"
        className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
          isLeaderboard
            ? 'bg-primary/10 text-primary scale-110'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={isLeaderboard ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          emoji_events
        </span>
        <span className="text-xs mt-1">לידרבורד</span>
      </Link>

      <Link
        href="/profile"
        className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
          isProfile
            ? 'bg-primary/10 text-primary scale-110'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <span className="material-symbols-outlined">person</span>
        <span className="text-xs mt-1">פרופיל</span>
      </Link>
    </nav>
  )
}
