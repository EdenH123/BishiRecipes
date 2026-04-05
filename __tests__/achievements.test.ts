import { describe, it, expect } from 'vitest'
import { getUnlockedAchievements, ACHIEVEMENTS, type UserStats } from '@/lib/achievements'

const emptyStats: UserStats = {
  recipeCount: 0,
  commentCount: 0,
  ratingCount: 0,
  favoriteCount: 0,
  reactionCount: 0,
  categoriesUsed: 0,
  collaborationCount: 0,
}

describe('getUnlockedAchievements', () => {
  it('returns empty array for empty stats', () => {
    expect(getUnlockedAchievements(emptyStats)).toEqual([])
  })

  it('unlocks first_recipe with 1 recipe', () => {
    const result = getUnlockedAchievements({ ...emptyStats, recipeCount: 1 })
    expect(result.some((a) => a.id === 'first_recipe')).toBe(true)
  })

  it('unlocks five_recipes with 5 recipes', () => {
    const result = getUnlockedAchievements({ ...emptyStats, recipeCount: 5 })
    expect(result.some((a) => a.id === 'five_recipes')).toBe(true)
  })

  it('unlocks multiple recipe achievements at once', () => {
    const result = getUnlockedAchievements({ ...emptyStats, recipeCount: 10 })
    const ids = result.map((a) => a.id)
    expect(ids).toContain('first_recipe')
    expect(ids).toContain('five_recipes')
    expect(ids).toContain('ten_recipes')
  })

  it('unlocks comment achievements', () => {
    const result = getUnlockedAchievements({ ...emptyStats, commentCount: 10 })
    const ids = result.map((a) => a.id)
    expect(ids).toContain('first_comment')
    expect(ids).toContain('ten_comments')
  })

  it('unlocks all_categories with 9 categories', () => {
    const result = getUnlockedAchievements({ ...emptyStats, categoriesUsed: 9 })
    expect(result.some((a) => a.id === 'all_categories')).toBe(true)
  })

  it('unlocks collaborator achievement', () => {
    const result = getUnlockedAchievements({ ...emptyStats, collaborationCount: 1 })
    expect(result.some((a) => a.id === 'collaborator')).toBe(true)
  })

  it('does not include check function in returned objects', () => {
    const result = getUnlockedAchievements({ ...emptyStats, recipeCount: 1 })
    result.forEach((a) => {
      expect(a).not.toHaveProperty('check')
    })
  })
})

describe('ACHIEVEMENTS', () => {
  it('all have unique IDs', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all have required fields', () => {
    ACHIEVEMENTS.forEach((a) => {
      expect(a.title).toBeTruthy()
      expect(a.description).toBeTruthy()
      expect(a.icon).toBeTruthy()
      expect(typeof a.check).toBe('function')
    })
  })
})
