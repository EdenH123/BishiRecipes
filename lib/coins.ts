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
  { id: 'frame_emerald', type: 'frame', name: 'מסגרת אמרלד', description: 'ירוק אזמרגד מנצנץ', price: 90, preview: 'linear-gradient(135deg, #0d6b3d, #2ecc71, #0d6b3d, #56d895, #0d6b3d)', glow: '0 0 12px rgba(46,204,113,0.5)' },
  { id: 'frame_galaxy', type: 'frame', name: 'מסגרת גלקסי', description: 'חלל עמוק וכוכבים', price: 150, preview: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e, #6a5acd, #0f0c29)', glow: '0 0 16px rgba(106,90,205,0.6)', minLevel: 3 },
  { id: 'frame_sunset', type: 'frame', name: 'מסגרת שקיעה', description: 'צבעי שקיעה חמים', price: 70, preview: 'linear-gradient(135deg, #ff6b6b, #ee5a24, #f0932b, #ff6b6b, #c0392b)', glow: '0 0 12px rgba(238,90,36,0.5)' },
  { id: 'frame_neon', type: 'frame', name: 'מסגרת ניאון', description: 'זוהר פלואורסצנטי', price: 100, preview: 'linear-gradient(135deg, #00ff87, #60efff, #00ff87, #60efff)', glow: '0 0 16px rgba(0,255,135,0.5), 0 0 32px rgba(96,239,255,0.3)' },
  { id: 'frame_rosegold', type: 'frame', name: 'מסגרת רוז גולד', description: 'ורוד-זהב מטאלי', price: 120, preview: 'linear-gradient(135deg, #b76e79, #f7cac9, #e8a0a0, #f7cac9, #b76e79)', glow: '0 0 12px rgba(183,110,121,0.4)', minLevel: 2 },
  { id: 'frame_lava', type: 'frame', name: 'מסגרת לבה', description: 'לבה בוערת מהר געש', price: 130, preview: 'linear-gradient(0deg, #8b0000, #ff4500, #ff6a00, #ffd700, #ff4500, #8b0000)', glow: '0 0 18px rgba(255,69,0,0.6)', minLevel: 4 },
  { id: 'frame_ocean', type: 'frame', name: 'מסגרת אוקיינוס', description: 'גלי ים טורקיז', price: 90, preview: 'linear-gradient(135deg, #006994, #36d1dc, #5b86e5, #36d1dc, #006994)', glow: '0 0 12px rgba(54,209,220,0.5)' },
  { id: 'frame_sakura', type: 'frame', name: 'מסגרת סאקורה', description: 'פרחי דובדבן יפניים', price: 110, preview: 'linear-gradient(135deg, #ffb7c5, #ff69b4, #ffb7c5, #ffc0cb, #ff69b4)', glow: '0 0 12px rgba(255,105,180,0.4)', minLevel: 3 },
  { id: 'frame_midnight', type: 'frame', name: 'מסגרת מידנייט', description: 'לילה כהה עם כסף', price: 160, preview: 'linear-gradient(135deg, #0d1b2a, #1b2838, #415a77, #c0c0c0, #1b2838, #0d1b2a)', glow: '0 0 14px rgba(192,192,192,0.4)', minLevel: 5 },
  { id: 'frame_cosmic', type: 'frame', name: 'מסגרת קוסמית', description: 'סגול-ורוד-כחול רב-צבעוני', price: 250, preview: 'conic-gradient(#6a0dad, #ff69b4, #4169e1, #00ced1, #ff69b4, #6a0dad)', glow: '0 0 20px rgba(106,13,173,0.5), 0 0 40px rgba(255,105,180,0.2)', minLevel: 6 },

  // --- Titles ---
  { id: 'title_foodie', type: 'title', name: 'פודי אמיתי/ת', description: 'תואר שמופיע ליד השם', price: 30, preview: '🍕 פודי אמיתי/ת' },
  { id: 'title_baker', type: 'title', name: 'אופה מושבע/ת', description: 'לאוהבי אפייה', price: 30, preview: '🧁 אופה מושבע/ת' },
  { id: 'title_grill', type: 'title', name: 'מלך/ת הגריל', description: 'שולט/ת באש', price: 50, preview: '🥩 מלך/ת הגריל' },
  { id: 'title_healthy', type: 'title', name: 'שף בריאות', description: 'אוכל בריא זה סקסי', price: 50, preview: '🥗 שף בריאות' },
  { id: 'title_legend', type: 'title', name: 'אגדת מטבח', description: 'תואר אגדי', price: 150, preview: '✨ אגדת מטבח', minLevel: 5 },
  { id: 'title_master', type: 'title', name: 'גרנד שף', description: 'התואר הנדיר ביותר', price: 250, preview: '👨‍🍳 גרנד שף', minLevel: 8 },
  { id: 'title_sushi', type: 'title', name: 'שף סושי', description: 'מאסטר המטבח היפני', price: 40, preview: '🍣 שף סושי' },
  { id: 'title_pizza', type: 'title', name: 'מלך/ת הפיצה', description: 'פיצה זה אהבה', price: 40, preview: '🍕 מלך/ת הפיצה' },
  { id: 'title_pastry', type: 'title', name: 'קונדיטור/ית', description: 'אמן/ית המאפים', price: 60, preview: '🎂 קונדיטור/ית' },
  { id: 'title_fire', type: 'title', name: 'שף על האש', description: 'הכל על הגריל', price: 60, preview: '🔥 שף על האש' },
  { id: 'title_italian', type: 'title', name: 'גורמה איטלקי/ת', description: 'פסטה, ריזוטו ואהבה', price: 70, preview: '🍝 גורמה איטלקי/ת', minLevel: 2 },
  { id: 'title_burger', type: 'title', name: 'מאסטר הבורגר', description: 'בורגר מושלם כל פעם', price: 70, preview: '🍔 מאסטר הבורגר', minLevel: 2 },
  { id: 'title_ninja', type: 'title', name: 'ניניה של המטבח', description: 'מהיר/ה ומדויק/ת', price: 100, preview: '🥷 ניניה של המטבח', minLevel: 4 },
  { id: 'title_spice', type: 'title', name: 'מומחה/ית תבלינים', description: 'מכיר/ה כל תבלין', price: 100, preview: '🌶️ מומחה/ית תבלינים', minLevel: 4 },
  { id: 'title_wizard', type: 'title', name: 'קוסם/ת הטעמים', description: 'קסם בכל ביס', price: 180, preview: '✨ קוסם/ת הטעמים', minLevel: 6 },
  { id: 'title_vip', type: 'title', name: 'שף VIP', description: 'התואר היוקרתי ביותר', price: 300, preview: '💎 שף VIP', minLevel: 9 },
]

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id)
}

export const ADMIN_COIN_BONUS = 10000

export function calculateCoins(stats: { recipeCount: number; commentCount: number; ratingCount: number; favoriteCount: number; reactionCount: number; collaborationCount: number }, isAdmin = false): number {
  return (
    stats.recipeCount * COIN_VALUES.recipe +
    stats.commentCount * COIN_VALUES.comment +
    stats.ratingCount * COIN_VALUES.rating +
    stats.favoriteCount * COIN_VALUES.favorite +
    stats.reactionCount * COIN_VALUES.reaction +
    stats.collaborationCount * COIN_VALUES.collaboration +
    (isAdmin ? ADMIN_COIN_BONUS : 0)
  )
}
