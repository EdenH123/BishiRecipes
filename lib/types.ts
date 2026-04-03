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
  category: string | null
  tags: string[]
  created_by: string
  created_at: string
  updated_at: string
  // joined
  profiles?: Profile
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

export function displayIngredient(ing: Ingredient): string {
  const parts = [ing.amount, ing.unit, ing.name].filter(Boolean)
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
