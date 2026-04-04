import type { UserStats } from '@/lib/achievements'

export interface Level {
  level: number
  title: string
  icon: string
  xpRequired: number
}

export const XP_VALUES = {
  recipe: 50,
  comment: 10,
  rating: 5,
  favorite: 3,
  reaction: 2,
  collaboration: 30,
} as const

export const LEVELS: Level[] = [
  { level: 1, title: 'טבח מתחיל', icon: '🥄', xpRequired: 0 },
  { level: 2, title: 'טבח חובב', icon: '🍳', xpRequired: 100 },
  { level: 3, title: 'שף צעיר', icon: '🔪', xpRequired: 250 },
  { level: 4, title: 'שף מנוסה', icon: '🍲', xpRequired: 450 },
  { level: 5, title: 'שף בכיר', icon: '👨‍🍳', xpRequired: 700 },
  { level: 6, title: 'סו-שף', icon: '🍽️', xpRequired: 950 },
  { level: 7, title: 'שף ראשי', icon: '🌟', xpRequired: 1200 },
  { level: 8, title: 'שף מאסטר', icon: '🏅', xpRequired: 1450 },
  { level: 9, title: 'שף אגדי', icon: '👑', xpRequired: 1700 },
  { level: 10, title: 'אלוף המטבח', icon: '🏆', xpRequired: 2000 },
]

export function calculateXP(stats: UserStats): number {
  return (
    stats.recipeCount * XP_VALUES.recipe +
    stats.commentCount * XP_VALUES.comment +
    stats.ratingCount * XP_VALUES.rating +
    stats.favoriteCount * XP_VALUES.favorite +
    stats.reactionCount * XP_VALUES.reaction +
    stats.collaborationCount * XP_VALUES.collaboration
  )
}

export function getLevel(xp: number): Level {
  let current = LEVELS[0]
  for (const level of LEVELS) {
    if (xp >= level.xpRequired) {
      current = level
    } else {
      break
    }
  }
  return current
}

export function getNextLevel(xp: number): { nextLevel: Level | null; xpNeeded: number } {
  const current = getLevel(xp)
  const nextIndex = LEVELS.findIndex((l) => l.level === current.level) + 1

  if (nextIndex >= LEVELS.length) {
    return { nextLevel: null, xpNeeded: 0 }
  }

  const nextLevel = LEVELS[nextIndex]
  return { nextLevel, xpNeeded: nextLevel.xpRequired - xp }
}

export function getLevelProgress(xp: number): number {
  const current = getLevel(xp)
  const { nextLevel } = getNextLevel(xp)

  if (!nextLevel) return 100

  const xpInLevel = xp - current.xpRequired
  const xpForLevel = nextLevel.xpRequired - current.xpRequired

  return Math.round((xpInLevel / xpForLevel) * 100)
}
