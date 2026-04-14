// ══════════════════════════════════════════════
// Cooking Empire — Game Configuration & Balancing
// ══════════════════════════════════════════════

// ── Generator Definitions ──
// Each tier is progressively more expensive but more efficient
export interface GeneratorDef {
  id: string
  name: string
  emoji: string
  description: string
  baseCost: number
  baseIncome: number      // coins per second
  costMultiplier: number  // price increase per purchase
  unlockAt: number        // total coins earned to unlock
}

export const GENERATORS: GeneratorDef[] = [
  { id: 'lemonade',   name: 'דוכן לימונדה',    emoji: '🍋', description: 'לימונדה קרה ומרעננת',           baseCost: 15,          baseIncome: 0.5,       costMultiplier: 1.15, unlockAt: 0 },
  { id: 'falafel',    name: 'עגלת פלאפל',       emoji: '🧆', description: 'הפלאפל הכי טוב בשכונה',        baseCost: 100,         baseIncome: 3,         costMultiplier: 1.15, unlockAt: 50 },
  { id: 'bakery',     name: 'מאפייה',           emoji: '🥐', description: 'לחמניות וקרואסונים טריים',      baseCost: 1100,        baseIncome: 20,        costMultiplier: 1.15, unlockAt: 500 },
  { id: 'cafe',       name: 'בית קפה',          emoji: '☕', description: 'קפה מושלם ועוגות',              baseCost: 12000,       baseIncome: 100,       costMultiplier: 1.15, unlockAt: 5000 },
  { id: 'pizzeria',   name: 'פיצריה',           emoji: '🍕', description: 'פיצה איטלקית אותנטית',          baseCost: 130000,      baseIncome: 500,       costMultiplier: 1.15, unlockAt: 50000 },
  { id: 'sushi',      name: 'מסעדת סושי',       emoji: '🍣', description: 'סושי יפני מסורתי',              baseCost: 1400000,     baseIncome: 3000,      costMultiplier: 1.15, unlockAt: 500000 },
  { id: 'steakhouse', name: 'סטייקיה',          emoji: '🥩', description: 'בשרים מעושנים ויין משובח',      baseCost: 20000000,    baseIncome: 20000,     costMultiplier: 1.15, unlockAt: 5000000 },
  { id: 'hotel',      name: 'מלון בוטיק',       emoji: '🏨', description: 'מלון עם שף פרטי',               baseCost: 330000000,   baseIncome: 150000,    costMultiplier: 1.15, unlockAt: 50000000 },
  { id: 'cruise',     name: 'ספינת תענוגות',     emoji: '🚢', description: 'שיט עם 10 מסעדות',              baseCost: 5100000000,  baseIncome: 1000000,   costMultiplier: 1.15, unlockAt: 500000000 },
  { id: 'resort',     name: 'ריזורט חוף',        emoji: '🏝️', description: 'ריזורט עם מסעדות מישלן',        baseCost: 75000000000, baseIncome: 8000000,   costMultiplier: 1.15, unlockAt: 5000000000 },
  { id: 'empire',     name: 'רשת מסעדות',        emoji: '🌍', description: 'רשת בינלאומית ב-50 מדינות',     baseCost: 1e12,        baseIncome: 70000000,  costMultiplier: 1.15, unlockAt: 50000000000 },
  { id: 'space',      name: 'מסעדה בחלל',       emoji: '🚀', description: 'מטבח ביחנת החלל',               baseCost: 1.5e13,      baseIncome: 600000000, costMultiplier: 1.15, unlockAt: 500000000000 },
]

// ── Upgrade Definitions ──
export interface UpgradeDef {
  id: string
  name: string
  emoji: string
  description: string
  cost: number
  effect: UpgradeEffect
  unlockAt: number  // total coins earned to show
  requires?: string // requires another upgrade id
}

export type UpgradeEffect =
  | { type: 'click_multiply'; value: number }
  | { type: 'generator_multiply'; generatorId: string; value: number }
  | { type: 'all_multiply'; value: number }
  | { type: 'crit_chance'; value: number }
  | { type: 'crit_multiply'; value: number }
  | { type: 'offline_multiply'; value: number }

export const UPGRADES: UpgradeDef[] = [
  // Click power
  { id: 'click1',  name: 'סכין חדה',       emoji: '🔪', description: 'x2 כוח לחיצה',            cost: 100,          effect: { type: 'click_multiply', value: 2 },          unlockAt: 50 },
  { id: 'click2',  name: 'סכין שף',        emoji: '🗡️', description: 'x3 כוח לחיצה',            cost: 5000,         effect: { type: 'click_multiply', value: 3 },          unlockAt: 2000, requires: 'click1' },
  { id: 'click3',  name: 'מכונת חיתוך',    emoji: '⚙️', description: 'x5 כוח לחיצה',            cost: 100000,       effect: { type: 'click_multiply', value: 5 },          unlockAt: 50000, requires: 'click2' },
  { id: 'click4',  name: 'רובוט שף',       emoji: '🤖', description: 'x10 כוח לחיצה',           cost: 10000000,     effect: { type: 'click_multiply', value: 10 },         unlockAt: 1000000, requires: 'click3' },

  // Generator boosts
  { id: 'lemon_boost',  name: 'לימונים אורגניים', emoji: '🌿', description: 'x3 הכנסה מלימונדה',      cost: 500,          effect: { type: 'generator_multiply', generatorId: 'lemonade', value: 3 },  unlockAt: 200 },
  { id: 'falafel_boost', name: 'תבלין סודי',      emoji: '🌶️', description: 'x3 הכנסה מפלאפל',        cost: 5000,         effect: { type: 'generator_multiply', generatorId: 'falafel', value: 3 },   unlockAt: 2000 },
  { id: 'bakery_boost', name: 'תנור תעשייתי',    emoji: '🔥', description: 'x3 הכנסה ממאפייה',       cost: 50000,        effect: { type: 'generator_multiply', generatorId: 'bakery', value: 3 },    unlockAt: 20000 },
  { id: 'cafe_boost',   name: 'פולי קפה מיוחדים', emoji: '☕', description: 'x3 הכנסה מקפה',          cost: 500000,       effect: { type: 'generator_multiply', generatorId: 'cafe', value: 3 },      unlockAt: 200000 },
  { id: 'pizza_boost',  name: 'תנור עצים',       emoji: '🪵', description: 'x3 הכנסה מפיצריה',       cost: 5000000,      effect: { type: 'generator_multiply', generatorId: 'pizzeria', value: 3 },  unlockAt: 2000000 },
  { id: 'sushi_boost',  name: 'סכין יפנית',      emoji: '🎌', description: 'x3 הכנסה מסושי',         cost: 50000000,     effect: { type: 'generator_multiply', generatorId: 'sushi', value: 3 },     unlockAt: 20000000 },
  { id: 'steak_boost',  name: 'מעשנת בוטיק',     emoji: '💨', description: 'x3 הכנסה מסטייקיה',      cost: 500000000,    effect: { type: 'generator_multiply', generatorId: 'steakhouse', value: 3 }, unlockAt: 200000000 },

  // Global multipliers
  { id: 'marketing1', name: 'שלט חוצות',     emoji: '📺', description: 'x2 הכנסה כללית',          cost: 10000,        effect: { type: 'all_multiply', value: 2 },            unlockAt: 5000 },
  { id: 'marketing2', name: 'קמפיין דיגיטלי', emoji: '📱', description: 'x2 הכנסה כללית',          cost: 1000000,      effect: { type: 'all_multiply', value: 2 },            unlockAt: 500000 },
  { id: 'marketing3', name: 'כוכב מישלן',     emoji: '⭐', description: 'x3 הכנסה כללית',          cost: 100000000,    effect: { type: 'all_multiply', value: 3 },            unlockAt: 50000000 },
  { id: 'marketing4', name: 'תוכנית טלוויזיה', emoji: '🎬', description: 'x5 הכנסה כללית',          cost: 10000000000,  effect: { type: 'all_multiply', value: 5 },            unlockAt: 5000000000 },

  // Critical clicks
  { id: 'crit1', name: 'מזל מתחיל',    emoji: '🍀', description: '5% סיכוי ללחיצה קריטית',   cost: 2000,         effect: { type: 'crit_chance', value: 0.05 },          unlockAt: 1000 },
  { id: 'crit2', name: 'אינטואיציה',   emoji: '✨', description: '+10% סיכוי קריטי',          cost: 200000,       effect: { type: 'crit_chance', value: 0.10 },          unlockAt: 100000 },
  { id: 'crit3', name: 'מגע הזהב',     emoji: '👆', description: 'x5 נזק קריטי',              cost: 5000000,      effect: { type: 'crit_multiply', value: 5 },           unlockAt: 2000000 },

  // Offline
  { id: 'offline1', name: 'משמרת לילה', emoji: '🌙', description: 'x2 הכנסה אופליין',          cost: 50000,        effect: { type: 'offline_multiply', value: 2 },        unlockAt: 20000 },
  { id: 'offline2', name: 'עבודה 24/7',  emoji: '🕐', description: 'x3 הכנסה אופליין',          cost: 5000000,      effect: { type: 'offline_multiply', value: 3 },        unlockAt: 2000000 },
]

// ── Achievement Definitions ──
export interface AchievementDef {
  id: string
  name: string
  emoji: string
  description: string
  condition: AchievementCondition
  reward: AchievementReward
}

export type AchievementCondition =
  | { type: 'total_earned'; amount: number }
  | { type: 'total_clicks'; amount: number }
  | { type: 'generator_count'; generatorId: string; amount: number }
  | { type: 'total_generators'; amount: number }
  | { type: 'cps'; amount: number }  // coins per second
  | { type: 'prestige_count'; amount: number }

export type AchievementReward =
  | { type: 'multiply_all'; value: number }
  | { type: 'multiply_click'; value: number }
  | { type: 'bonus_coins'; value: number }

export const ACHIEVEMENTS: AchievementDef[] = [
  // Total earned
  { id: 'earn_1k',    name: 'שף מתחיל',       emoji: '🌱', description: 'הרווח 1,000 מטבעות',           condition: { type: 'total_earned', amount: 1000 },            reward: { type: 'multiply_all', value: 1.05 } },
  { id: 'earn_10k',   name: 'שף מנוסה',       emoji: '🍳', description: 'הרווח 10,000 מטבעות',          condition: { type: 'total_earned', amount: 10000 },           reward: { type: 'multiply_all', value: 1.05 } },
  { id: 'earn_100k',  name: 'שף בכיר',        emoji: '👨‍🍳', description: 'הרווח 100,000 מטבעות',         condition: { type: 'total_earned', amount: 100000 },          reward: { type: 'multiply_all', value: 1.1 } },
  { id: 'earn_1m',    name: 'שף מאסטר',       emoji: '🏆', description: 'הרווח 1,000,000 מטבעות',       condition: { type: 'total_earned', amount: 1000000 },         reward: { type: 'multiply_all', value: 1.1 } },
  { id: 'earn_1b',    name: 'מגנאט מזון',      emoji: '💎', description: 'הרווח 1,000,000,000 מטבעות',   condition: { type: 'total_earned', amount: 1000000000 },      reward: { type: 'multiply_all', value: 1.15 } },
  { id: 'earn_1t',    name: 'אימפריית מזון',   emoji: '🌍', description: 'הרווח 1T מטבעות',              condition: { type: 'total_earned', amount: 1e12 },            reward: { type: 'multiply_all', value: 1.2 } },

  // Clicks
  { id: 'click_100',  name: 'אצבעות מהירות',  emoji: '👆', description: '100 לחיצות',                   condition: { type: 'total_clicks', amount: 100 },             reward: { type: 'multiply_click', value: 1.1 } },
  { id: 'click_1k',   name: 'לוחץ מקצועי',    emoji: '🖱️', description: '1,000 לחיצות',                 condition: { type: 'total_clicks', amount: 1000 },            reward: { type: 'multiply_click', value: 1.2 } },
  { id: 'click_10k',  name: 'מכונת לחיצות',   emoji: '⚡', description: '10,000 לחיצות',                condition: { type: 'total_clicks', amount: 10000 },           reward: { type: 'multiply_click', value: 1.3 } },
  { id: 'click_100k', name: 'אגדת הלחיצות',   emoji: '🔥', description: '100,000 לחיצות',               condition: { type: 'total_clicks', amount: 100000 },          reward: { type: 'multiply_click', value: 1.5 } },

  // Generators
  { id: 'gen_10',     name: 'מנהל עסק',       emoji: '📋', description: '10 עסקים בסך הכל',             condition: { type: 'total_generators', amount: 10 },          reward: { type: 'multiply_all', value: 1.05 } },
  { id: 'gen_50',     name: 'יזם סדרתי',      emoji: '💼', description: '50 עסקים בסך הכל',             condition: { type: 'total_generators', amount: 50 },          reward: { type: 'multiply_all', value: 1.1 } },
  { id: 'gen_100',    name: 'מלך העסקים',      emoji: '👑', description: '100 עסקים בסך הכל',            condition: { type: 'total_generators', amount: 100 },         reward: { type: 'multiply_all', value: 1.15 } },
  { id: 'gen_250',    name: 'טייקון',          emoji: '🏦', description: '250 עסקים בסך הכל',            condition: { type: 'total_generators', amount: 250 },         reward: { type: 'multiply_all', value: 1.2 } },

  // CPS
  { id: 'cps_10',     name: 'זרם הכנסה',      emoji: '💰', description: '10 מטבעות לשנייה',             condition: { type: 'cps', amount: 10 },                       reward: { type: 'multiply_all', value: 1.05 } },
  { id: 'cps_1k',     name: 'נהר של כסף',     emoji: '🌊', description: '1,000 מטבעות לשנייה',          condition: { type: 'cps', amount: 1000 },                     reward: { type: 'multiply_all', value: 1.1 } },
  { id: 'cps_1m',     name: 'מפל הזהב',       emoji: '🏅', description: '1,000,000 מטבעות לשנייה',      condition: { type: 'cps', amount: 1000000 },                  reward: { type: 'multiply_all', value: 1.15 } },
  { id: 'cps_1b',     name: 'אוקיינוס מטבעות', emoji: '🌏', description: '1B מטבעות לשנייה',             condition: { type: 'cps', amount: 1000000000 },               reward: { type: 'multiply_all', value: 1.2 } },

  // Prestige
  { id: 'prestige_1', name: 'לידה מחדש',      emoji: '🔄', description: 'ביצעת פרסטיג ראשון',             condition: { type: 'prestige_count', amount: 1 },             reward: { type: 'multiply_all', value: 1.1 } },
  { id: 'prestige_5', name: 'פניקס',           emoji: '🔥', description: '5 פרסטיגים',                    condition: { type: 'prestige_count', amount: 5 },             reward: { type: 'multiply_all', value: 1.2 } },
  { id: 'prestige_10', name: 'נצחי',           emoji: '♾️', description: '10 פרסטיגים',                   condition: { type: 'prestige_count', amount: 10 },            reward: { type: 'multiply_all', value: 1.3 } },
]

// ── Research Tree (purchased with prestige points) ──
export interface ResearchDef {
  id: string
  name: string
  emoji: string
  description: string
  cost: number  // prestige points
  effect: UpgradeEffect
  requires?: string
  unlockAtPrestige: number  // minimum prestige points earned ever
}

export const RESEARCH: ResearchDef[] = [
  { id: 'r_click1',    name: 'זיכרון שרירי',     emoji: '💪', description: 'x2 כוח לחיצה לצמיתות',       cost: 1,   effect: { type: 'click_multiply', value: 2 },    unlockAtPrestige: 0 },
  { id: 'r_income1',   name: 'יעילות מטבח',      emoji: '📈', description: 'x2 הכנסה פסיבית לצמיתות',     cost: 1,   effect: { type: 'all_multiply', value: 2 },      unlockAtPrestige: 0 },
  { id: 'r_click2',    name: 'ידיים מהירות',     emoji: '⚡', description: 'x3 כוח לחיצה לצמיתות',       cost: 3,   effect: { type: 'click_multiply', value: 3 },    unlockAtPrestige: 2, requires: 'r_click1' },
  { id: 'r_income2',   name: 'אוטומציה חכמה',    emoji: '🤖', description: 'x3 הכנסה פסיבית לצמיתות',     cost: 3,   effect: { type: 'all_multiply', value: 3 },      unlockAtPrestige: 2, requires: 'r_income1' },
  { id: 'r_crit1',     name: 'חוש שישי',         emoji: '🎯', description: '+15% סיכוי קריטי לצמיתות',    cost: 5,   effect: { type: 'crit_chance', value: 0.15 },    unlockAtPrestige: 5, requires: 'r_click2' },
  { id: 'r_offline1',  name: 'עובדים נאמנים',    emoji: '🌙', description: 'x5 הכנסה אופליין לצמיתות',    cost: 5,   effect: { type: 'offline_multiply', value: 5 },  unlockAtPrestige: 5, requires: 'r_income2' },
  { id: 'r_income3',   name: 'מהפכת מזון',       emoji: '🌟', description: 'x5 הכנסה פסיבית לצמיתות',     cost: 10,  effect: { type: 'all_multiply', value: 5 },      unlockAtPrestige: 10, requires: 'r_income2' },
  { id: 'r_click3',    name: 'מגע קסום',         emoji: '✨', description: 'x10 כוח לחיצה לצמיתות',      cost: 10,  effect: { type: 'click_multiply', value: 10 },   unlockAtPrestige: 10, requires: 'r_click2' },
  { id: 'r_crit2',     name: 'עיניים חדות',      emoji: '👁️', description: 'x10 נזק קריטי לצמיתות',      cost: 15,  effect: { type: 'crit_multiply', value: 10 },    unlockAtPrestige: 15, requires: 'r_crit1' },
  { id: 'r_mega',      name: 'אימפריה אינסופית', emoji: '♾️', description: 'x10 הכל לצמיתות',             cost: 25,  effect: { type: 'all_multiply', value: 10 },     unlockAtPrestige: 25, requires: 'r_income3' },
]

// ── Prestige Config ──
export const PRESTIGE_UNLOCK_EARNED = 1000000  // need 1M total earned to unlock prestige
export const PRESTIGE_FORMULA_BASE = 150       // base divisor for prestige point calc

// Formula: floor(sqrt(totalEarned / PRESTIGE_FORMULA_BASE))
// At 1M earned: ~81 points, at 10M: ~258, at 100M: ~816

// ── Offline Config ──
export const MAX_OFFLINE_SECONDS = 86400  // 24 hours max offline earnings
export const BASE_OFFLINE_RATE = 0.5      // 50% of normal income while offline

// ── Golden Falafel (random bonus) ──
export const GOLDEN_MIN_INTERVAL = 60     // seconds between golden falafels
export const GOLDEN_MAX_INTERVAL = 300
export const GOLDEN_DURATION = 10         // seconds to click it
export const GOLDEN_REWARD_CPS_SECONDS = 60  // reward = 60s of current CPS

// ── Save Config ──
export const SAVE_KEY = 'bishi_cooking_empire'
export const AUTO_SAVE_INTERVAL = 10000   // 10 seconds
