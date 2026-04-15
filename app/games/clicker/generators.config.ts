// ══════════════════════════════════════════════════
// Culinary Empire — Generator Definitions
// ══════════════════════════════════════════════════
//
// 15 tiers: kitchen tools → staff → businesses → empire
// Each tier has unique growth rate for strategic depth
// Synergy: every 25 owned of a generator → 2x income to all lower tiers

export interface GeneratorDef {
  id: string
  name: string
  emoji: string
  description: string
  baseCost: number
  baseIncome: number      // chef coins per second per unit
  growthRate: number       // cost multiplier per purchase (varies per tier)
  unlockAt: number         // total earned to reveal
  synergyTarget?: string   // optional: specific generator this boosts
}

export const GENERATORS: GeneratorDef[] = [
  //                                                          cost    income/s  growth  unlock
  // ── Kitchen Tools (Tier 1-3) ──
  { id: 'spoon',       name: 'כף עץ',            emoji: '🥄', description: 'מערבבים ומרוויחים',            baseCost: 10,          baseIncome: 0.5,       growthRate: 1.12, unlockAt: 0 },
  { id: 'knife',       name: 'סכין שף',          emoji: '🔪', description: 'חיתוך מהיר = בישול מהיר',      baseCost: 75,          baseIncome: 3,         growthRate: 1.13, unlockAt: 40 },
  { id: 'oven',        name: 'תנור ביתי',        emoji: '🔥', description: 'אפייה אוטומטית',               baseCost: 500,         baseIncome: 12,        growthRate: 1.14, unlockAt: 300 },

  // ── Staff (Tier 4-6) ──
  { id: 'linecook',    name: 'טבח מוכשר',        emoji: '👨‍🍳', description: 'עובד במטבח שלך',              baseCost: 4000,        baseIncome: 55,        growthRate: 1.14, unlockAt: 2000 },
  { id: 'prepteam',    name: 'צוות הכנה',        emoji: '👥', description: 'צוות שלם מכין מצרכים',         baseCost: 30000,       baseIncome: 250,       growthRate: 1.15, unlockAt: 15000 },
  { id: 'bakery',      name: 'דוכן מאפייה',      emoji: '🥐', description: 'לחמניות טריות כל בוקר',        baseCost: 200000,      baseIncome: 1200,      growthRate: 1.15, unlockAt: 100000 },

  // ── Businesses (Tier 7-10) ──
  { id: 'foodtruck',   name: 'משאית אוכל',       emoji: '🚚', description: 'אוכל רחוב מעולה',              baseCost: 1500000,     baseIncome: 6000,      growthRate: 1.16, unlockAt: 700000 },
  { id: 'restaurant',  name: 'מסעדה',            emoji: '🍽️', description: 'מסעדה עם תפריט מלא',           baseCost: 12000000,    baseIncome: 30000,     growthRate: 1.16, unlockAt: 5000000 },
  { id: 'gourmet',     name: 'מטבח גורמה',       emoji: '⭐', description: 'טעימות ברמה אחרת',             baseCost: 100000000,   baseIncome: 160000,    growthRate: 1.17, unlockAt: 40000000 },
  { id: 'catering',    name: 'רשת קייטרינג',     emoji: '🎪', description: 'אירועים ומסיבות',              baseCost: 900000000,   baseIncome: 900000,    growthRate: 1.17, unlockAt: 350000000 },

  // ── Empire (Tier 11-13) ──
  { id: 'factory',     name: 'מפעל מזון',        emoji: '🏭', description: 'ייצור המוני של מוצרים',         baseCost: 8000000000,  baseIncome: 5000000,   growthRate: 1.18, unlockAt: 3000000000 },
  { id: 'celebrity',   name: 'מותג שף סלבריטי',  emoji: '📺', description: 'תוכנית טלוויזיה משלך',         baseCost: 75000000000, baseIncome: 30000000,  growthRate: 1.18, unlockAt: 25000000000 },
  { id: 'lab',         name: 'מעבדה קולינרית',   emoji: '🔬', description: 'מחקר טעמים וטכנולוגיה',        baseCost: 700000000000, baseIncome: 180000000, growthRate: 1.19, unlockAt: 200000000000 },

  // ── Endgame (Tier 14-15) ──
  { id: 'franchise',   name: 'רשת בינלאומית',    emoji: '🌍', description: 'סניפים ב-50 מדינות',           baseCost: 7e12,        baseIncome: 1.1e9,     growthRate: 1.20, unlockAt: 2e12 },
  { id: 'space',       name: 'מטבח חלל',         emoji: '🚀', description: 'בישול בתחנת החלל',             baseCost: 8e13,        baseIncome: 7e9,       growthRate: 1.20, unlockAt: 2.5e13 },
]

// ── Synergy system ──
// Every 25 of a generator → 2x income multiplier to ALL generators below it
export const SYNERGY_THRESHOLD = 25
export const SYNERGY_MULTIPLIER = 2
