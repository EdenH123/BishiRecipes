import { describe, it, expect } from 'vitest'
import { calculateCoins, getShopItem, SHOP_ITEMS, COIN_VALUES, ADMIN_COIN_BONUS } from '@/lib/coins'

const emptyStats = {
  recipeCount: 0,
  commentCount: 0,
  ratingCount: 0,
  favoriteCount: 0,
  reactionCount: 0,
  collaborationCount: 0,
}

describe('calculateCoins', () => {
  it('returns 0 for empty stats', () => {
    expect(calculateCoins(emptyStats)).toBe(0)
  })

  it('calculates coins from recipes', () => {
    expect(calculateCoins({ ...emptyStats, recipeCount: 4 })).toBe(4 * COIN_VALUES.recipe)
  })

  it('calculates coins from multiple activity types', () => {
    const stats = {
      recipeCount: 2,
      commentCount: 3,
      ratingCount: 5,
      favoriteCount: 1,
      reactionCount: 10,
      collaborationCount: 1,
    }
    const expected =
      2 * COIN_VALUES.recipe +
      3 * COIN_VALUES.comment +
      5 * COIN_VALUES.rating +
      1 * COIN_VALUES.favorite +
      10 * COIN_VALUES.reaction +
      1 * COIN_VALUES.collaboration
    expect(calculateCoins(stats)).toBe(expected)
  })

  it('adds admin bonus when isAdmin is true', () => {
    expect(calculateCoins(emptyStats, true)).toBe(ADMIN_COIN_BONUS)
  })

  it('does not add admin bonus when isAdmin is false', () => {
    expect(calculateCoins(emptyStats, false)).toBe(0)
  })

  it('combines admin bonus with regular coins', () => {
    const stats = { ...emptyStats, recipeCount: 1 }
    expect(calculateCoins(stats, true)).toBe(COIN_VALUES.recipe + ADMIN_COIN_BONUS)
  })
})

describe('getShopItem', () => {
  it('returns the correct item by ID', () => {
    const item = getShopItem('frame_gold')
    expect(item).toBeDefined()
    expect(item!.name).toBe('מסגרת זהב')
    expect(item!.type).toBe('frame')
  })

  it('returns undefined for non-existent ID', () => {
    expect(getShopItem('nonexistent')).toBeUndefined()
  })

  it('returns title items correctly', () => {
    const item = getShopItem('title_foodie')
    expect(item).toBeDefined()
    expect(item!.type).toBe('title')
  })
})

describe('SHOP_ITEMS', () => {
  it('has unique IDs', () => {
    const ids = SHOP_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has both frames and titles', () => {
    const frames = SHOP_ITEMS.filter((i) => i.type === 'frame')
    const titles = SHOP_ITEMS.filter((i) => i.type === 'title')
    expect(frames.length).toBeGreaterThan(0)
    expect(titles.length).toBeGreaterThan(0)
  })

  it('all items have positive prices', () => {
    SHOP_ITEMS.forEach((item) => {
      expect(item.price).toBeGreaterThan(0)
    })
  })

  it('level-locked items have minLevel set', () => {
    const diamond = getShopItem('frame_diamond')
    expect(diamond!.minLevel).toBe(5)
    const crown = getShopItem('frame_crown')
    expect(crown!.minLevel).toBe(7)
  })
})
