import { describe, it, expect } from 'vitest'
import { calculateXP, getLevel, getNextLevel, getLevelProgress, LEVELS, XP_VALUES } from '@/lib/xp-levels'

const emptyStats = {
  recipeCount: 0,
  commentCount: 0,
  ratingCount: 0,
  favoriteCount: 0,
  reactionCount: 0,
  categoriesUsed: 0,
  collaborationCount: 0,
}

describe('calculateXP', () => {
  it('returns 0 for empty stats', () => {
    expect(calculateXP(emptyStats)).toBe(0)
  })

  it('calculates XP from recipes', () => {
    expect(calculateXP({ ...emptyStats, recipeCount: 3 })).toBe(3 * XP_VALUES.recipe)
  })

  it('sums all activity types', () => {
    const stats = {
      ...emptyStats,
      recipeCount: 1,
      commentCount: 2,
      ratingCount: 3,
      favoriteCount: 4,
      reactionCount: 5,
      collaborationCount: 1,
    }
    const expected =
      1 * XP_VALUES.recipe +
      2 * XP_VALUES.comment +
      3 * XP_VALUES.rating +
      4 * XP_VALUES.favorite +
      5 * XP_VALUES.reaction +
      1 * XP_VALUES.collaboration
    expect(calculateXP(stats)).toBe(expected)
  })
})

describe('getLevel', () => {
  it('returns level 1 for 0 XP', () => {
    expect(getLevel(0).level).toBe(1)
  })

  it('returns level 2 for 100 XP', () => {
    expect(getLevel(100).level).toBe(2)
  })

  it('returns level 2 for 249 XP (just below level 3)', () => {
    expect(getLevel(249).level).toBe(2)
  })

  it('returns level 3 for exactly 250 XP', () => {
    expect(getLevel(250).level).toBe(3)
  })

  it('returns max level for very high XP', () => {
    expect(getLevel(99999).level).toBe(10)
  })
})

describe('getNextLevel', () => {
  it('returns level 2 as next for 0 XP', () => {
    const { nextLevel, xpNeeded } = getNextLevel(0)
    expect(nextLevel!.level).toBe(2)
    expect(xpNeeded).toBe(100)
  })

  it('returns null for max level', () => {
    const { nextLevel, xpNeeded } = getNextLevel(2000)
    expect(nextLevel).toBeNull()
    expect(xpNeeded).toBe(0)
  })

  it('calculates remaining XP correctly', () => {
    const { nextLevel, xpNeeded } = getNextLevel(150)
    expect(nextLevel!.level).toBe(3)
    expect(xpNeeded).toBe(100) // 250 - 150
  })
})

describe('getLevelProgress', () => {
  it('returns 0% at start of level', () => {
    expect(getLevelProgress(0)).toBe(0)
  })

  it('returns 50% at midpoint', () => {
    // Level 1: 0-100, midpoint = 50
    expect(getLevelProgress(50)).toBe(50)
  })

  it('returns 100% at max level', () => {
    expect(getLevelProgress(2000)).toBe(100)
  })
})

describe('LEVELS', () => {
  it('are sorted by xpRequired ascending', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].xpRequired).toBeGreaterThan(LEVELS[i - 1].xpRequired)
    }
  })

  it('start at level 1', () => {
    expect(LEVELS[0].level).toBe(1)
    expect(LEVELS[0].xpRequired).toBe(0)
  })

  it('have 10 levels total', () => {
    expect(LEVELS.length).toBe(10)
  })
})
