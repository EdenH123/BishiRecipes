// Coin values per action (earned alongside XP)
export const COIN_VALUES = {
  recipe: 25,
  comment: 5,
  rating: 3,
  favorite: 2,
  reaction: 1,
  collaboration: 15,
} as const

export type ShopItemType = 'frame' | 'title'

export interface ShopItem {
  id: string
  type: ShopItemType
  name: string
  description: string
  price: number
  preview: string // CSS class for frame, or text for title
  minLevel?: number
}

export const SHOP_ITEMS: ShopItem[] = [
  // --- Avatar Frames ---
  { id: 'frame_gold', type: 'frame', name: 'מסגרת זהב', description: 'מסגרת זהובה מפוארת', price: 50, preview: 'ring-4 ring-yellow-400' },
  { id: 'frame_fire', type: 'frame', name: 'מסגרת אש', description: 'מסגרת בוערת 🔥', price: 80, preview: 'ring-4 ring-orange-500' },
  { id: 'frame_ice', type: 'frame', name: 'מסגרת קרח', description: 'מסגרת קפואה ❄️', price: 80, preview: 'ring-4 ring-cyan-400' },
  { id: 'frame_rainbow', type: 'frame', name: 'מסגרת קשת', description: 'כל הצבעים 🌈', price: 120, preview: 'ring-4 ring-pink-400' },
  { id: 'frame_diamond', type: 'frame', name: 'מסגרת יהלום', description: 'יוקרה אמיתית 💎', price: 200, preview: 'ring-4 ring-blue-300', minLevel: 5 },
  { id: 'frame_crown', type: 'frame', name: 'מסגרת מלכותית', description: 'למלך/ת המטבח 👑', price: 300, preview: 'ring-4 ring-purple-500', minLevel: 7 },

  // --- Titles ---
  { id: 'title_foodie', type: 'title', name: 'פודי אמיתי/ת', description: 'תואר שמופיע ליד השם', price: 30, preview: '🍕 פודי אמיתי/ת' },
  { id: 'title_baker', type: 'title', name: 'אופה מושבע/ת', description: 'לאוהבי אפייה', price: 30, preview: '🧁 אופה מושבע/ת' },
  { id: 'title_grill', type: 'title', name: 'מלך/ת הגריל', description: 'שולט/ת באש', price: 50, preview: '🥩 מלך/ת הגריל' },
  { id: 'title_healthy', type: 'title', name: 'שף בריאות', description: 'אוכל בריא זה סקסי', price: 50, preview: '🥗 שף בריאות' },
  { id: 'title_legend', type: 'title', name: 'אגדת מטבח', description: 'תואר אגדי', price: 150, preview: '✨ אגדת מטבח', minLevel: 5 },
  { id: 'title_master', type: 'title', name: 'גרנד שף', description: 'התואר הנדיר ביותר', price: 250, preview: '👨‍🍳 גרנד שף', minLevel: 8 },
]

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id)
}

export function calculateCoins(stats: { recipeCount: number; commentCount: number; ratingCount: number; favoriteCount: number; reactionCount: number; collaborationCount: number }): number {
  return (
    stats.recipeCount * COIN_VALUES.recipe +
    stats.commentCount * COIN_VALUES.comment +
    stats.ratingCount * COIN_VALUES.rating +
    stats.favoriteCount * COIN_VALUES.favorite +
    stats.reactionCount * COIN_VALUES.reaction +
    stats.collaborationCount * COIN_VALUES.collaboration
  )
}
