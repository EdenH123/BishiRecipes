'use client'

import { motion } from 'framer-motion'

interface Props {
  tier: number       // 1-5
  hp: number         // 0-100
  ascension: number  // 0+
  streak: number
  level: number
}

// HP → visual state
function getHPState(hp: number): 'vibrant' | 'normal' | 'tired' | 'sick' | 'exhausted' {
  if (hp >= 80) return 'vibrant'
  if (hp >= 50) return 'normal'
  if (hp >= 30) return 'tired'
  if (hp >= 10) return 'sick'
  return 'exhausted'
}

const HP_FILTERS: Record<string, string> = {
  vibrant: 'saturate(1.1) brightness(1.05)',
  normal: 'saturate(1)',
  tired: 'saturate(0.7) brightness(0.9)',
  sick: 'saturate(0.4) brightness(0.75)',
  exhausted: 'saturate(0.2) brightness(0.6) grayscale(0.3)',
}

const HP_BODY_COLOR: Record<string, string> = {
  vibrant: '#fbbf24',
  normal: '#f59e0b',
  tired: '#d97706',
  sick: '#92400e',
  exhausted: '#78350f',
}

const TIER_COLORS = {
  1: { armor: 'none', glow: 'none', accent: '#6b7280' },
  2: { armor: '#8b5cf6', glow: 'none', accent: '#8b5cf6' },
  3: { armor: '#3b82f6', glow: 'none', accent: '#3b82f6' },
  4: { armor: '#10b981', glow: '#10b981', accent: '#10b981' },
  5: { armor: '#f59e0b', glow: '#f59e0b', accent: '#eab308' },
}

const ASCENSION_TINTS = ['', '#c084fc30', '#818cf830', '#22d3ee30', '#f9731630', '#eab30830']

export default function CharacterAvatar({ tier, hp, ascension, streak, level }: Props) {
  const hpState = getHPState(hp)
  const filter = HP_FILTERS[hpState]
  const bodyColor = HP_BODY_COLOR[hpState]
  const t = TIER_COLORS[Math.min(tier, 5) as keyof typeof TIER_COLORS]
  const ascTint = ASCENSION_TINTS[Math.min(ascension, ASCENSION_TINTS.length - 1)]

  return (
    <div className="relative flex flex-col items-center">
      {/* Glow ring for tier 4+ */}
      {tier >= 4 && (
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${t.glow}40 0%, transparent 70%)`,
            transform: 'scale(1.5)',
          }}
        />
      )}

      {/* Main avatar SVG */}
      <svg viewBox="0 0 200 260" width="160" height="208" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
        {/* Background circle */}
        <circle cx="100" cy="120" r="90" fill="#1a1033" opacity="0.5" />
        {ascTint && <circle cx="100" cy="120" r="90" fill={ascTint} />}

        {/* Body */}
        <ellipse cx="100" cy="180" rx="35" ry="45" fill={bodyColor} />

        {/* Head */}
        <circle cx="100" cy="100" r="35" fill={bodyColor} />

        {/* Eyes */}
        {hpState === 'exhausted' ? (
          <>
            <line x1="82" y1="95" x2="92" y2="100" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="92" y1="95" x2="82" y2="100" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="108" y1="95" x2="118" y2="100" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="118" y1="95" x2="108" y2="100" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : hpState === 'sick' ? (
          <>
            <circle cx="87" cy="97" r="4" fill="#1a1a2e" />
            <circle cx="113" cy="97" r="4" fill="#1a1a2e" />
            <path d="M 85 110 Q 100 105 115 110" fill="none" stroke="#1a1a2e" strokeWidth="2" />
          </>
        ) : hpState === 'tired' ? (
          <>
            <circle cx="87" cy="97" r="5" fill="#1a1a2e" />
            <circle cx="113" cy="97" r="5" fill="#1a1a2e" />
            <line x1="90" y1="110" x2="110" y2="110" stroke="#1a1a2e" strokeWidth="2" />
          </>
        ) : (
          <>
            {/* Happy/vibrant eyes */}
            <circle cx="87" cy="95" r="5" fill="#1a1a2e" />
            <circle cx="113" cy="95" r="5" fill="#1a1a2e" />
            <circle cx="89" cy="93" r="1.5" fill="white" />
            <circle cx="115" cy="93" r="1.5" fill="white" />
            <path d="M 88 108 Q 100 118 112 108" fill="none" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {/* Tier 2+: Armor */}
        {tier >= 2 && (
          <g>
            <rect x="72" y="145" width="56" height="35" rx="8" fill={t.armor} opacity="0.8" />
            <rect x="78" y="150" width="44" height="25" rx="5" fill={t.armor} opacity="0.6" />
            {/* Shoulder pads */}
            <ellipse cx="68" cy="155" rx="12" ry="8" fill={t.armor} opacity="0.7" />
            <ellipse cx="132" cy="155" rx="12" ry="8" fill={t.armor} opacity="0.7" />
          </g>
        )}

        {/* Tier 3+: Helmet */}
        {tier >= 3 && (
          <g>
            <path d="M 70 85 Q 100 55 130 85" fill={t.armor} opacity="0.8" />
            <rect x="95" y="58" width="10" height="15" rx="3" fill={t.accent} />
          </g>
        )}

        {/* Tier 4+: Weapon */}
        {tier >= 4 && (
          <g transform="translate(140, 130) rotate(20)">
            <rect x="0" y="0" width="6" height="50" rx="2" fill="#9ca3af" />
            <rect x="-6" y="-5" width="18" height="8" rx="2" fill={t.accent} />
            <circle cx="3" cy="-8" r="4" fill={t.accent} opacity="0.8" />
          </g>
        )}

        {/* Tier 5: Cape */}
        {tier >= 5 && (
          <path d="M 75 150 Q 60 200 50 240 L 100 220 L 150 240 Q 140 200 125 150"
            fill={t.accent} opacity="0.3" />
        )}

        {/* Arms */}
        <ellipse cx="60" cy="170" rx="12" ry="20" fill={bodyColor} opacity="0.9"
          transform={hpState === 'exhausted' ? 'rotate(15 60 170)' : ''} />
        <ellipse cx="140" cy="170" rx="12" ry="20" fill={bodyColor} opacity="0.9"
          transform={hpState === 'exhausted' ? 'rotate(-15 140 170)' : ''} />

        {/* Legs */}
        <ellipse cx="85" cy="225" rx="14" ry="18" fill={bodyColor} opacity="0.85" />
        <ellipse cx="115" cy="225" rx="14" ry="18" fill={bodyColor} opacity="0.85" />

        {/* Ascension badge */}
        {ascension > 0 && (
          <g>
            <circle cx="100" cy="40" r="12" fill="#7c3aed" />
            <text x="100" y="44" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {ascension > 10 ? '✦' : ['I','II','III','IV','V','VI','VII','VIII','IX','X'][ascension - 1]}
            </text>
          </g>
        )}

        {/* Streak fire */}
        {streak >= 7 && (
          <text x="100" y="255" textAnchor="middle" fontSize="16">
            {streak >= 100 ? '🔥🔥🔥' : streak >= 30 ? '🔥🔥' : '🔥'}
          </text>
        )}
      </svg>

      {/* Level badge */}
      <div className="absolute bottom-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        Lv.{level}
      </div>
    </div>
  )
}
