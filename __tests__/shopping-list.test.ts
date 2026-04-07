import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  type ShoppingItem,
  normalizeIngredientName,
  addIngredientsToList,
  toggleItem,
  removeItem,
  clearCheckedItems,
  loadShoppingList,
  saveShoppingList,
} from '@/lib/shopping-list'
import { serializeIngredient } from '@/lib/types'

// Mock localStorage
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

beforeEach(() => {
  storage.clear()
})

describe('normalizeIngredientName', () => {
  it('trims whitespace', () => {
    expect(normalizeIngredientName('  בצל  ')).toBe('בצל')
  })

  it('removes bidi marks', () => {
    expect(normalizeIngredientName('\u200Eבצל\u200F')).toBe('בצל')
  })

  it('removes leading ה article', () => {
    expect(normalizeIngredientName('הבצל')).toBe('בצל')
  })

  it('does not strip ה from short words', () => {
    // "הם" is 2 chars, should not strip
    expect(normalizeIngredientName('הם')).toBe('הם')
  })

  it('removes plural suffix ים', () => {
    expect(normalizeIngredientName('עגבניים')).toBe('עגבנ')
  })

  it('removes plural suffix ות', () => {
    expect(normalizeIngredientName('כוסות')).toBe('כוס')
  })

  it('lowercases latin chars', () => {
    expect(normalizeIngredientName('Tomato')).toBe('tomato')
  })

  it('normalizes "עגבנייה" and "עגבניות" to same canonical form', () => {
    const a = normalizeIngredientName('עגבנייה')
    const b = normalizeIngredientName('עגבניות')
    expect(a).toBe(b)
    expect(a).toBe('עגבניה')
  })

  it('normalizes "ביצה" and "ביצים" to same form', () => {
    expect(normalizeIngredientName('ביצה')).toBe(normalizeIngredientName('ביצים'))
  })

  it('normalizes "תפוחי אדמה" and "תפוח אדמה"', () => {
    expect(normalizeIngredientName('תפוחי אדמה')).toBe(normalizeIngredientName('תפוח אדמה'))
  })

  it('normalizes "פלפל" and "פלפלים"', () => {
    expect(normalizeIngredientName('פלפל')).toBe(normalizeIngredientName('פלפלים'))
  })

  it('normalizes "גבינה" and "גבינות"', () => {
    expect(normalizeIngredientName('גבינה')).toBe(normalizeIngredientName('גבינות'))
  })

  it('removes quote characters', () => {
    expect(normalizeIngredientName('קוטג׳')).toBe('קוטג')
  })
})

describe('addIngredientsToList', () => {
  const makeIngredient = (name: string, amount: string, unit: string) =>
    serializeIngredient({ name, amount, unit })

  it('adds ingredients to empty list', () => {
    const ingredients = [
      makeIngredient('בצל', '2', 'יחידות'),
      makeIngredient('שום', '3', 'שיני'),
    ]
    const result = addIngredientsToList([], ingredients, 'r1', 'מרק')
    expect(result).toHaveLength(2)
    expect(result[0].ingredientName).toBe('בצל')
    expect(result[0].quantity).toBe('2')
    expect(result[0].unit).toBe('יחידות')
    expect(result[0].recipeId).toBe('r1')
    expect(result[0].recipeTitle).toBe('מרק')
    expect(result[0].checked).toBe(false)
    expect(result[1].ingredientName).toBe('שום')
  })

  it('merges duplicate ingredients with same unit', () => {
    const existing: ShoppingItem[] = [
      {
        id: 'existing1',
        ingredientName: 'בצל',
        normalizedName: normalizeIngredientName('בצל'),
        quantity: '2',
        unit: 'יחידות',
        checked: false,
        recipeId: 'r1',
        recipeTitle: 'מרק',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    const newIngredients = [makeIngredient('בצל', '1', 'יחידות')]
    const result = addIngredientsToList(existing, newIngredients, 'r2', 'סלט')

    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe('3') // 2 + 1 merged
    expect(result[0].id).toBe('existing1') // same item
  })

  it('keeps items separate when units differ', () => {
    const existing: ShoppingItem[] = [
      {
        id: 'existing1',
        ingredientName: 'סוכר',
        normalizedName: normalizeIngredientName('סוכר'),
        quantity: '2',
        unit: 'כוסות',
        checked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    const newIngredients = [makeIngredient('סוכר', '100', 'גרם')]
    const result = addIngredientsToList(existing, newIngredients)

    expect(result).toHaveLength(2)
    expect(result[0].unit).toBe('כוסות')
    expect(result[1].unit).toBe('גרם')
  })

  it('does not merge with checked items', () => {
    const existing: ShoppingItem[] = [
      {
        id: 'existing1',
        ingredientName: 'בצל',
        normalizedName: normalizeIngredientName('בצל'),
        quantity: '2',
        unit: 'יחידות',
        checked: true, // already purchased
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    const newIngredients = [makeIngredient('בצל', '1', 'יחידות')]
    const result = addIngredientsToList(existing, newIngredients)

    expect(result).toHaveLength(2) // not merged
  })

  it('adds same recipe twice and merges quantities', () => {
    const ingredients = [
      makeIngredient('מלח', '1', 'כפית'),
      makeIngredient('פלפל', '½', 'כפית'),
    ]
    let list = addIngredientsToList([], ingredients, 'r1', 'מרק')
    list = addIngredientsToList(list, ingredients, 'r1', 'מרק')

    expect(list).toHaveLength(2)
    expect(list[0].quantity).toBe('2') // 1 + 1
    expect(list[1].quantity).toBe('1') // ½ + ½
  })

  it('skips ingredients with empty name', () => {
    const ingredients = [makeIngredient('', '1', 'כוס')]
    const result = addIngredientsToList([], ingredients)
    expect(result).toHaveLength(0)
  })

  it('handles plain string ingredients (legacy format)', () => {
    const ingredients = ['2 כוסות קמח', 'מלח לפי הטעם']
    const result = addIngredientsToList([], ingredients, 'r1', 'עוגה')
    expect(result).toHaveLength(2)
    expect(result[0].ingredientName).toBe('2 כוסות קמח')
    expect(result[1].ingredientName).toBe('מלח לפי הטעם')
  })
})

describe('toggleItem', () => {
  it('toggles item checked state', () => {
    const items: ShoppingItem[] = [
      {
        id: 'a',
        ingredientName: 'בצל',
        normalizedName: 'בצל',
        quantity: '2',
        unit: '',
        checked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    const toggled = toggleItem(items, 'a')
    expect(toggled[0].checked).toBe(true)

    const toggledBack = toggleItem(toggled, 'a')
    expect(toggledBack[0].checked).toBe(false)
  })
})

describe('removeItem', () => {
  it('removes item by id', () => {
    const items: ShoppingItem[] = [
      {
        id: 'a',
        ingredientName: 'בצל',
        normalizedName: 'בצל',
        quantity: '2',
        unit: '',
        checked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'b',
        ingredientName: 'שום',
        normalizedName: 'שום',
        quantity: '3',
        unit: '',
        checked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    const result = removeItem(items, 'a')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('b')
  })
})

describe('clearCheckedItems', () => {
  it('removes all checked items', () => {
    const items: ShoppingItem[] = [
      {
        id: 'a',
        ingredientName: 'בצל',
        normalizedName: 'בצל',
        quantity: '2',
        unit: '',
        checked: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'b',
        ingredientName: 'שום',
        normalizedName: 'שום',
        quantity: '3',
        unit: '',
        checked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    const result = clearCheckedItems(items)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('b')
  })
})

describe('persistence', () => {
  it('saves and loads shopping list', () => {
    const items: ShoppingItem[] = [
      {
        id: 'a',
        ingredientName: 'בצל',
        normalizedName: 'בצל',
        quantity: '2',
        unit: 'יחידות',
        checked: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    saveShoppingList(items)
    const loaded = loadShoppingList()
    expect(loaded).toEqual(items)
  })

  it('returns empty array when nothing saved', () => {
    expect(loadShoppingList()).toEqual([])
  })

  it('returns empty array on corrupted data', () => {
    storage.set('bishi_shopping_list', 'not-json{{{')
    expect(loadShoppingList()).toEqual([])
  })
})
