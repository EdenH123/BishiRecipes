import { parseIngredient, type Ingredient } from './types'

// --- Data model ---

export interface ShoppingItem {
  id: string
  ingredientName: string
  normalizedName: string
  quantity: string
  unit: string
  checked: boolean
  recipeId?: string
  recipeTitle?: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'bishi_shopping_list'

// --- Persistence ---

export function loadShoppingList(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveShoppingList(items: ShoppingItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

// --- Normalization ---
// Strategy: normalize Hebrew ingredient names for duplicate detection.
// We trim, lowercase (for any latin chars), remove common Hebrew plural
// suffixes, and strip leading ה (the) article. This is intentionally simple
// and avoids NLP — it catches common duplicates without overmatching.

const HEBREW_PLURAL_SUFFIXES = ['ים', 'ות', 'יות']

export function normalizeIngredientName(name: string): string {
  let n = name.trim()
  // Remove bidi marks
  n = n.replace(/[\u200E\u200F\u200B\u2066\u2069\uFEFF]/g, '')
  // Lowercase (for Latin chars mixed in)
  n = n.toLowerCase()
  // Remove leading ה article
  if (n.startsWith('ה') && n.length > 2) {
    n = n.slice(1)
  }
  // Remove common Hebrew plural suffixes to match singular forms
  for (const suffix of HEBREW_PLURAL_SUFFIXES) {
    if (n.endsWith(suffix) && n.length > suffix.length + 1) {
      n = n.slice(0, -suffix.length)
      break
    }
  }
  return n.trim()
}

// --- Unit compatibility ---
// Only merge quantities when units are the same or both empty.

function unitsCompatible(a: string, b: string): boolean {
  const na = a.trim()
  const nb = b.trim()
  return na === nb
}

// --- Quantity parsing and merging ---

const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}

function parseQuantity(qty: string): number | null {
  const s = qty.trim()
  if (!s) return null
  let total = 0
  let rest = s
  // Extract leading whole number
  const wholeMatch = rest.match(/^(\d+)/)
  if (wholeMatch) {
    total += parseInt(wholeMatch[1])
    rest = rest.slice(wholeMatch[0].length).trim()
  }
  // Unicode fraction
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (rest.includes(char)) return total + val
  }
  // Slash fraction
  const fracMatch = rest.match(/(\d+)\s*\/\s*(\d+)/)
  if (fracMatch) return total + parseInt(fracMatch[1]) / parseInt(fracMatch[2])
  // Plain number
  if (!wholeMatch) {
    const n = parseFloat(s)
    return isNaN(n) ? null : n
  }
  return total
}

function formatQuantity(n: number): string {
  const whole = Math.floor(n)
  const frac = n - whole
  const fractions: [number, string][] = [
    [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.375, '⅜'],
    [0.5, '½'], [0.625, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞'],
  ]
  for (const [val, char] of fractions) {
    if (Math.abs(frac - val) < 0.01) {
      return whole > 0 ? `${whole}${char}` : char
    }
  }
  if (frac === 0) return String(whole)
  return n % 1 === 0 ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

function mergeQuantities(a: string, b: string): string {
  const na = parseQuantity(a)
  const nb = parseQuantity(b)
  if (na !== null && nb !== null) return formatQuantity(na + nb)
  // Can't parse both — keep first
  if (a && b) return `${a} + ${b}`
  return a || b
}

// --- Core operations ---

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * Duplicate strategy: When adding ingredients, we check for existing items
 * with the same normalizedName. If found and units are compatible, we merge
 * quantities into a single line item. If units differ, we keep them separate
 * to avoid data loss (e.g. "2 כוסות" vs "100 גרם" of the same ingredient).
 * This balances avoiding clutter with preserving meaningful distinctions.
 */
export function addIngredientsToList(
  currentList: ShoppingItem[],
  ingredients: string[],
  recipeId?: string,
  recipeTitle?: string,
): ShoppingItem[] {
  const now = new Date().toISOString()
  const newList = [...currentList]

  for (const raw of ingredients) {
    const ing = parseIngredient(raw)
    if (!ing.name.trim()) continue

    const normalized = normalizeIngredientName(ing.name)

    // Find existing item with same normalized name and compatible unit
    const existingIdx = newList.findIndex(
      (item) =>
        !item.checked &&
        item.normalizedName === normalized &&
        unitsCompatible(item.unit, ing.unit),
    )

    if (existingIdx >= 0) {
      // Merge quantities
      const existing = newList[existingIdx]
      newList[existingIdx] = {
        ...existing,
        quantity: mergeQuantities(existing.quantity, ing.amount),
        updatedAt: now,
      }
    } else {
      newList.push({
        id: generateId(),
        ingredientName: ing.name.trim(),
        normalizedName: normalized,
        quantity: ing.amount,
        unit: ing.unit,
        checked: false,
        recipeId,
        recipeTitle,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  return newList
}

export function toggleItem(list: ShoppingItem[], id: string): ShoppingItem[] {
  return list.map((item) =>
    item.id === id
      ? { ...item, checked: !item.checked, updatedAt: new Date().toISOString() }
      : item,
  )
}

export function removeItem(list: ShoppingItem[], id: string): ShoppingItem[] {
  return list.filter((item) => item.id !== id)
}

export function clearCheckedItems(list: ShoppingItem[]): ShoppingItem[] {
  return list.filter((item) => !item.checked)
}
