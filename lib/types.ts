export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

export interface Recipe {
  id: string
  title: string
  description: string | null
  ingredients: string[]
  steps: string[]
  image_url: string | null
  video_url: string | null
  prep_time: number | null
  category: string | null
  tags: string[]
  created_by: string
  created_at: string
  updated_at: string
  // joined
  profiles?: Profile
}

export interface Collaborator {
  user_id: string
  profiles: {
    display_name: string
    avatar_url: string | null
  }
}

export interface Favorite {
  user_id: string
  recipe_id: string
}

export interface Comment {
  id: string
  recipe_id: string
  user_id: string
  content: string
  created_at: string
  // joined
  profiles?: Profile
}

export interface Ingredient {
  amount: string
  unit: string
  name: string
}

export const MEASUREMENT_UNITS = [
  '',
  'כוס',
  'כוסות',
  'כף',
  'כפות',
  'כפית',
  'כפיות',
  'גרם',
  'ק״ג',
  'מ״ל',
  'ליטר',
  'יחידה',
  'יחידות',
  'חבילה',
  'קורט',
  'לפי הטעם',
] as const

export function parseIngredient(raw: string): Ingredient {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'name' in parsed) {
      return { amount: parsed.amount || '', unit: parsed.unit || '', name: parsed.name || '' }
    }
  } catch {
    // Legacy plain string format
  }
  return { amount: '', unit: '', name: raw }
}

export function serializeIngredient(ing: Ingredient): string {
  return JSON.stringify({ amount: ing.amount, unit: ing.unit, name: ing.name })
}

const FRACTION_MAP: Record<string, string> = {
  '1/4': '¼',
  '1/2': '½',
  '3/4': '¾',
  '1/3': '⅓',
  '2/3': '⅔',
  '1/8': '⅛',
  '3/8': '⅜',
  '5/8': '⅝',
  '7/8': '⅞',
}

export function formatAmount(amount: string): string {
  if (!amount) return ''
  // Replace fraction patterns like "1 1/2" → "1½", "1/4" → "¼"
  let result = amount.trim()
  for (const [fraction, unicode] of Object.entries(FRACTION_MAP)) {
    // Whole number + fraction: "1 1/2" → "1½"
    result = result.replace(new RegExp(`(\\d+)\\s+${fraction.replace('/', '\\/')}`, 'g'), `$1${unicode}`)
    // Standalone fraction: "1/2" → "½"
    result = result.replace(new RegExp(`(?<!\\d)${fraction.replace('/', '\\/')}(?!\\d)`, 'g'), unicode)
  }
  return result
}

export function displayIngredient(ing: Ingredient): string {
  const amount = formatAmount(ing.amount)
  // Wrap amount with LTR isolate so "4½" doesn't flip to "½4" in RTL context
  // Use FSI/PDI (U+2068/U+2069) for proper bidi isolation
  const ltrAmount = amount ? `\u2066${amount}\u2069` : ''
  const parts = [ltrAmount, ing.unit, ing.name].filter(Boolean)
  return parts.join(' ')
}

export const CATEGORIES = [
  'ארוחת בוקר',
  'ארוחת צהריים',
  'ארוחת ערב',
  'קינוח',
  'חטיף',
  'מרק',
  'סלט',
  'לחם ואפייה',
  'שתייה',
] as const

export const DEFAULT_TAGS = [
  'שבת',
  'חג',
  'מהיר',
  'ילדים',
  'פרווה',
  'בשרי',
  'חלבי',
  'טבעוני',
  'ללא גלוטן',
  'קל להכנה',
] as const

export function getUserBadge(recipeCount: number): { label: string; icon: string; color: string } | null {
  if (recipeCount >= 20) return { label: 'שף מאסטר', icon: '👨‍🍳', color: 'bg-amber-400/20 text-amber-700' }
  if (recipeCount >= 10) return { label: 'שף בכיר', icon: '🍳', color: 'bg-primary/10 text-primary' }
  if (recipeCount >= 5) return { label: 'טבח/ית', icon: '🥄', color: 'bg-tertiary/10 text-tertiary' }
  if (recipeCount >= 1) return { label: 'מתחילים', icon: '🌱', color: 'bg-sky/10 text-sky' }
  return null
}
