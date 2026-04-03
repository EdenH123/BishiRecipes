export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface Recipe {
  id: string
  title: string
  description: string | null
  ingredients: string[]
  steps: string[]
  image_url: string | null
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
