import { describe, it, expect } from 'vitest'
import { parseIngredient, serializeIngredient, displayIngredient, getUserBadge } from '@/lib/types'

describe('parseIngredient', () => {
  it('parses JSON ingredient', () => {
    const json = JSON.stringify({ amount: '2', unit: 'כוס', name: 'קמח' })
    const result = parseIngredient(json)
    expect(result).toEqual({ amount: '2', unit: 'כוס', name: 'קמח' })
  })

  it('handles legacy plain string', () => {
    const result = parseIngredient('קמח')
    expect(result).toEqual({ amount: '', unit: '', name: 'קמח' })
  })

  it('handles missing fields in JSON', () => {
    const json = JSON.stringify({ name: 'סוכר' })
    const result = parseIngredient(json)
    expect(result).toEqual({ amount: '', unit: '', name: 'סוכר' })
  })

  it('handles invalid JSON gracefully', () => {
    const result = parseIngredient('not json {')
    expect(result).toEqual({ amount: '', unit: '', name: 'not json {' })
  })
})

describe('serializeIngredient', () => {
  it('serializes to JSON string', () => {
    const ing = { amount: '1', unit: 'כף', name: 'שמן' }
    const result = serializeIngredient(ing)
    expect(JSON.parse(result)).toEqual(ing)
  })

  it('roundtrips with parseIngredient', () => {
    const original = { amount: '3', unit: 'כוסות', name: 'מים' }
    const serialized = serializeIngredient(original)
    const parsed = parseIngredient(serialized)
    expect(parsed).toEqual(original)
  })
})

describe('displayIngredient', () => {
  it('joins all parts', () => {
    expect(displayIngredient({ amount: '2', unit: 'כוס', name: 'קמח' })).toBe('2 כוס קמח')
  })

  it('skips empty parts', () => {
    expect(displayIngredient({ amount: '', unit: '', name: 'מלח' })).toBe('מלח')
  })

  it('handles amount without unit', () => {
    expect(displayIngredient({ amount: '3', unit: '', name: 'ביצים' })).toBe('3 ביצים')
  })
})

describe('getUserBadge', () => {
  it('returns null for 0 recipes', () => {
    expect(getUserBadge(0)).toBeNull()
  })

  it('returns מתחילים for 1 recipe', () => {
    expect(getUserBadge(1)!.label).toBe('מתחילים')
  })

  it('returns טבח/ית for 5 recipes', () => {
    expect(getUserBadge(5)!.label).toBe('טבח/ית')
  })

  it('returns שף בכיר for 10 recipes', () => {
    expect(getUserBadge(10)!.label).toBe('שף בכיר')
  })

  it('returns שף מאסטר for 20+ recipes', () => {
    expect(getUserBadge(20)!.label).toBe('שף מאסטר')
    expect(getUserBadge(100)!.label).toBe('שף מאסטר')
  })
})
