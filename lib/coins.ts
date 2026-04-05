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
  preview: string // gradient for frame border, or text for title
  glow?: string // box-shadow glow color
  minLevel?: number
}

export const SHOP_ITEMS: ShopItem[] = [
  // --- Avatar Frames ---
  { id: 'frame_gold', type: 'frame', name: 'מסגרת זהב', description: 'זוהר זהוב מפואר', price: 50, preview: 'linear-gradient(135deg, #d4a017, #f5d060, #d4a017, #f5d060, #d4a017)', glow: '0 0 12px rgba(212,160,23,0.5)' },
  { id: 'frame_fire', type: 'frame', name: 'מסגרת אש', description: 'להבות בוערות', price: 80, preview: 'linear-gradient(0deg, #ff4500, #ff6a00, #ff9500, #ff6a00, #ff4500)', glow: '0 0 14px rgba(255,69,0,0.5)' },
  { id: 'frame_ice', type: 'frame', name: 'מסגרת קרח', description: 'קפואה ומנצנצת', price: 80, preview: 'linear-gradient(135deg, #b0e0e6, #e0f7fa, #87ceeb, #e0f7fa, #b0e0e6)', glow: '0 0 12px rgba(135,206,235,0.5)' },
  { id: 'frame_rainbow', type: 'frame', name: 'מסגרת קשת', description: 'כל הצבעים', price: 120, preview: 'conic-gradient(#e74c3c, #e67e22, #f1c40f, #2ecc71, #3498db, #9b59b6, #e74c3c)', glow: '0 0 10px rgba(155,89,182,0.3)' },
  { id: 'frame_diamond', type: 'frame', name: 'מסגרת יהלום', description: 'יוקרה טהורה', price: 200, preview: 'linear-gradient(135deg, #a8d8ea, #ffffff, #a8d8ea, #d4f1f9, #ffffff, #a8d8ea)', glow: '0 0 16px rgba(168,216,234,0.6), inset 0 0 8px rgba(255,255,255,0.3)', minLevel: 5 },
  { id: 'frame_crown', type: 'frame', name: 'מסגרת מלכותית', description: 'למלך/ת המטבח', price: 300, preview: 'linear-gradient(135deg, #4a0e4e, #8e44ad, #c39bd3, #8e44ad, #4a0e4e)', glow: '0 0 18px rgba(142,68,173,0.5)', minLevel: 7 },

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
