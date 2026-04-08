import { parseIngredient, isIngredientHeader, type Ingredient } from './types'

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

export interface RecipeEntry {
  recipeId: string
  recipeTitle: string
  multiplier: number
  addedAt: string
}

const STORAGE_KEY = 'bishi_shopping_list'
const RECIPES_STORAGE_KEY = 'bishi_shopping_recipes'

// --- Persistence ---

export function loadShoppingList(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const items: ShoppingItem[] = JSON.parse(raw)
      // Re-normalize names on load to pick up normalization improvements,
      // then consolidate duplicates that may have been created before merging logic
      const renormalized = items.map((item) => ({
        ...item,
        normalizedName: normalizeIngredientName(item.ingredientName),
      }))
      return consolidateItems(renormalized)
    }
  } catch {}
  return []
}

/** Try to re-parse items that were saved with old "X + Y" quantity format */
function reparsePlusFormat(items: ShoppingItem[]): ShoppingItem[] {
  const expanded: ShoppingItem[] = []
  for (const item of items) {
    // If quantity contains " + ", split into separate items to re-merge with gram conversion
    if (item.quantity.includes('+')) {
      const parts = item.quantity.split(/\s*\+\s*/)
      let first = true
      for (const part of parts) {
        const trimmed = part.trim()
        // Try to extract quantity and unit from "7 כפות" or "100 גרם" or "1½ כוס"
        const match = trimmed.match(/^([\d½¼¾⅓⅔⅛⅜⅝⅞/.]+)\s+(.+)$/)
        if (match) {
          expanded.push({
            ...item,
            id: first ? item.id : item.id + '_' + Math.random().toString(36).slice(2, 6),
            quantity: match[1],
            unit: match[2].trim(),
          })
        } else {
          // Could be just a number — keep the original unit if it exists
          expanded.push({
            ...item,
            id: first ? item.id : item.id + '_' + Math.random().toString(36).slice(2, 6),
            quantity: trimmed,
            unit: first ? item.unit : '',
          })
        }
        first = false
      }
    } else {
      expanded.push(item)
    }
  }
  return expanded
}

/** Merge items with the same normalizedName that ended up as separate entries */
function consolidateItems(items: ShoppingItem[]): ShoppingItem[] {
  const reparsed = reparsePlusFormat(items)
  const result: ShoppingItem[] = []
  for (const item of reparsed) {
    const existingIdx = result.findIndex(
      (r) =>
        !r.checked &&
        !item.checked &&
        r.normalizedName === item.normalizedName,
    )
    if (existingIdx >= 0) {
      const existing = result[existingIdx]
      if (unitsCompatible(existing.unit, item.unit)) {
        result[existingIdx] = {
          ...existing,
          quantity: mergeQuantities(existing.quantity, item.quantity),
          updatedAt: item.updatedAt > existing.updatedAt ? item.updatedAt : existing.updatedAt,
        }
      } else {
        // Different units — try gram conversion
        const existingGrams = toGrams(existing.quantity, existing.unit)
        const itemGrams = toGrams(item.quantity, item.unit)
        const newerDate = item.updatedAt > existing.updatedAt ? item.updatedAt : existing.updatedAt

        if (existingGrams !== null && itemGrams !== null) {
          const formatted = formatGrams(existingGrams + itemGrams)
          result[existingIdx] = {
            ...existing,
            quantity: formatted.quantity,
            unit: formatted.unit,
            updatedAt: newerDate,
          }
        } else {
          const existingDisplay = [existing.quantity, existing.unit].filter(Boolean).join(' ')
          const newDisplay = [item.quantity, item.unit].filter(Boolean).join(' ')
          result[existingIdx] = {
            ...existing,
            quantity: existingDisplay && newDisplay ? `${existingDisplay} + ${newDisplay}` : existingDisplay || newDisplay,
            unit: '',
            updatedAt: newerDate,
          }
        }
      }
    } else {
      result.push(item)
    }
  }
  return result
}

export function saveShoppingList(items: ShoppingItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export function loadRecipeEntries(): RecipeEntry[] {
  try {
    const raw = localStorage.getItem(RECIPES_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveRecipeEntries(entries: RecipeEntry[]): void {
  try {
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(entries))
  } catch {}
}

export function addRecipeEntry(
  entries: RecipeEntry[],
  recipeId: string,
  recipeTitle: string,
  multiplier: number,
): RecipeEntry[] {
  // If same recipe already exists, update its multiplier (accumulate)
  const existing = entries.find((e) => e.recipeId === recipeId)
  if (existing) {
    return entries.map((e) =>
      e.recipeId === recipeId
        ? { ...e, multiplier: e.multiplier + multiplier, addedAt: new Date().toISOString() }
        : e,
    )
  }
  return [
    ...entries,
    { recipeId, recipeTitle, multiplier, addedAt: new Date().toISOString() },
  ]
}

export function removeRecipeEntry(entries: RecipeEntry[], recipeId: string): RecipeEntry[] {
  return entries.filter((e) => e.recipeId !== recipeId)
}

// --- Normalization ---
// Strategy: normalize Hebrew ingredient names for duplicate detection.
// We trim, lowercase (for any latin chars), remove common Hebrew plural
// suffixes, and strip leading ה (the) article. This is intentionally simple
// and avoids NLP — it catches common duplicates without overmatching.

// Known ingredient synonyms map: maps variant forms to a canonical key.
// This handles irregular plurals and common alternate spellings that
// suffix-stripping alone can't catch.
const INGREDIENT_SYNONYMS: Record<string, string> = {
  'עגבנייה': 'עגבניה',
  'עגבניות': 'עגבניה',
  'עגבנייות': 'עגבניה',
  'בצל': 'בצל',
  'בצלים': 'בצל',
  'שום': 'שום',
  'שומים': 'שום',
  'ביצה': 'ביצה',
  'ביצים': 'ביצה',
  'לימון': 'לימון',
  'לימונים': 'לימון',
  'תפוח': 'תפוח',
  'תפוחים': 'תפוח',
  'גזר': 'גזר',
  'גזרים': 'גזר',
  'תפוח אדמה': 'תפוח אדמה',
  'תפוחי אדמה': 'תפוח אדמה',
  'פלפל': 'פלפל',
  'פלפלים': 'פלפל',
  'מלפפון': 'מלפפון',
  'מלפפונים': 'מלפפון',
  'אבוקדו': 'אבוקדו',
  'אבוקדים': 'אבוקדו',
  'חציל': 'חציל',
  'חצילים': 'חציל',
  'קישוא': 'קישוא',
  'קישואים': 'קישוא',
  'כוסברה': 'כוסברה',
  'פטרוזיליה': 'פטרוזיליה',
  'שמיר': 'שמיר',
  'נענע': 'נענע',
  'בזיליקום': 'בזיליקום',
  'כוסמת': 'כוסמת',
  'אורז': 'אורז',
  'פסטה': 'פסטה',
  'קמח': 'קמח',
  'סוכר': 'סוכר',
  'מלח': 'מלח',
  'שמן': 'שמן',
  'חמאה': 'חמאה',
  'שמנת': 'שמנת',
  'חלב': 'חלב',
  'גבינה': 'גבינה',
  'גבינות': 'גבינה',
  'קוטג׳': 'קוטג',
  'קוטג': 'קוטג',
  'שוקולד': 'שוקולד',
  'קקאו': 'קקאו',
}

const HEBREW_PLURAL_SUFFIXES = ['יים', 'ים', 'יות', 'ות']
const HEBREW_FEMININE_SUFFIXES = ['ייה', 'יה', 'ה']

function stripHebrew(n: string): string {
  // Remove leading ה article
  if (n.startsWith('ה') && n.length > 2) {
    n = n.slice(1)
  }
  // Remove common Hebrew plural suffixes to match singular forms
  for (const suffix of HEBREW_PLURAL_SUFFIXES) {
    if (n.endsWith(suffix) && n.length > suffix.length + 1) {
      return n.slice(0, -suffix.length)
    }
  }
  // Remove feminine suffixes (ה, יה, ייה)
  for (const suffix of HEBREW_FEMININE_SUFFIXES) {
    if (n.endsWith(suffix) && n.length > suffix.length + 1) {
      return n.slice(0, -suffix.length)
    }
  }
  return n
}

export function normalizeIngredientName(name: string): string {
  let n = name.trim()
  // Remove bidi marks
  n = n.replace(/[\u200E\u200F\u200B\u2066\u2069\uFEFF]/g, '')
  // Lowercase (for Latin chars mixed in)
  n = n.toLowerCase()
  // Remove quotes variants
  n = n.replace(/[״"'׳]/g, '')
  // Remove parenthetical notes like "(1/2 כוס)" or "(לקישוט)"
  n = n.replace(/\([^)]*\)/g, '').trim()
  // Collapse multiple spaces
  n = n.replace(/\s+/g, ' ').trim()
  // Check synonym map first (exact match on cleaned input)
  if (INGREDIENT_SYNONYMS[n]) return INGREDIENT_SYNONYMS[n]
  // Fallback: strip Hebrew morphology
  return stripHebrew(n).trim()
}

// --- Unit conversion to grams ---
// Approximate conversions for common Hebrew cooking units.
// These are general-purpose averages; exact values depend on the ingredient,
// but for a shopping list, close enough is better than separate lines.
const UNIT_TO_GRAMS: Record<string, number> = {
  'גרם': 1,
  'גר': 1,
  'ג': 1,
  'ק״ג': 1000,
  'קילו': 1000,
  'קילוגרם': 1000,
  'כוס': 200,
  'כוסות': 200,
  'כף': 15,
  'כפות': 15,
  'כפית': 5,
  'כפיות': 5,
  'מ״ל': 1,
  'מל': 1,
  'ליטר': 1000,
}

/** Try to convert a quantity+unit to grams. Returns null if unit is not convertible. */
function toGrams(quantity: string, unit: string): number | null {
  const factor = UNIT_TO_GRAMS[unit.trim()]
  if (factor === undefined) return null
  const n = parseQuantity(quantity)
  if (n === null) return null
  return n * factor
}

/** Format grams into the most readable unit (g or kg) */
function formatGrams(grams: number): { quantity: string; unit: string } {
  if (grams >= 1000) {
    const kg = grams / 1000
    return { quantity: formatQuantity(kg), unit: 'ק״ג' }
  }
  return { quantity: formatQuantity(grams), unit: 'גרם' }
}

// --- Unit compatibility ---

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

function scaleQuantity(qty: string, multiplier: number): string {
  if (multiplier === 1 || !qty) return qty
  const n = parseQuantity(qty)
  if (n === null) return qty
  return formatQuantity(n * multiplier)
}

/**
 * Duplicate strategy: When adding ingredients, we check for existing items
 * with the same normalizedName. If found and units are compatible, we merge
 * quantities into a single line item. If units differ, we keep them separate
 * to avoid data loss (e.g. "2 כוסות" vs "100 גרם" of the same ingredient).
 * This balances avoiding clutter with preserving meaningful distinctions.
 *
 * The optional multiplier parameter scales ingredient quantities before adding,
 * so users can add scaled servings (e.g. x2, x3) from the recipe page.
 */
export function addIngredientsToList(
  currentList: ShoppingItem[],
  ingredients: string[],
  recipeId?: string,
  recipeTitle?: string,
  multiplier: number = 1,
): ShoppingItem[] {
  const now = new Date().toISOString()
  const newList = [...currentList]

  for (const raw of ingredients) {
    const ing = parseIngredient(raw)
    if (!ing.name.trim() || isIngredientHeader(ing.name)) continue

    const scaledAmount = scaleQuantity(ing.amount, multiplier)
    const normalized = normalizeIngredientName(ing.name)

    // Find existing item with same normalized name — prefer same unit, fallback to any
    const sameUnitIdx = newList.findIndex(
      (item) =>
        !item.checked &&
        item.normalizedName === normalized &&
        unitsCompatible(item.unit, ing.unit),
    )
    const anyUnitIdx = sameUnitIdx >= 0
      ? sameUnitIdx
      : newList.findIndex(
          (item) => !item.checked && item.normalizedName === normalized,
        )

    if (sameUnitIdx >= 0) {
      // Same unit — merge quantities numerically
      const existing = newList[sameUnitIdx]
      newList[sameUnitIdx] = {
        ...existing,
        quantity: mergeQuantities(existing.quantity, scaledAmount),
        updatedAt: now,
      }
    } else if (anyUnitIdx >= 0) {
      // Different unit — try to convert both to grams and merge
      const existing = newList[anyUnitIdx]
      const existingGrams = toGrams(existing.quantity, existing.unit)
      const newGrams = toGrams(scaledAmount, ing.unit)

      if (existingGrams !== null && newGrams !== null) {
        // Both convertible — merge as grams/kg
        const totalGrams = existingGrams + newGrams
        const formatted = formatGrams(totalGrams)
        newList[anyUnitIdx] = {
          ...existing,
          quantity: formatted.quantity,
          unit: formatted.unit,
          updatedAt: now,
        }
      } else {
        // Can't convert — show as "X + Y"
        const existingDisplay = [existing.quantity, existing.unit].filter(Boolean).join(' ')
        const newDisplay = [scaledAmount, ing.unit].filter(Boolean).join(' ')
        newList[anyUnitIdx] = {
          ...existing,
          quantity: existingDisplay && newDisplay ? `${existingDisplay} + ${newDisplay}` : existingDisplay || newDisplay,
          unit: '',
          updatedAt: now,
        }
      }
    } else {
      newList.push({
        id: generateId(),
        ingredientName: ing.name.trim(),
        normalizedName: normalized,
        quantity: scaledAmount,
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
