// ══════════════════════════════════════════════════
// Culinary Empire — Upgrade Definitions (45 upgrades)
// ══════════════════════════════════════════════════

export type UpgradeEffect =
  | { type: 'click_multiply'; value: number }
  | { type: 'click_add'; value: number }
  | { type: 'generator_multiply'; generatorId: string; value: number }
  | { type: 'all_multiply'; value: number }
  | { type: 'crit_chance'; value: number }
  | { type: 'crit_multiply'; value: number }
  | { type: 'offline_multiply'; value: number }
  | { type: 'combo_power'; value: number }
  | { type: 'cost_reduce'; value: number }

export interface UpgradeDef {
  id: string
  name: string
  emoji: string
  description: string
  cost: number
  effect: UpgradeEffect
  unlockAt: number   // total earned to show
  requires?: string  // prerequisite upgrade id
  category: 'click' | 'generator' | 'global' | 'crit' | 'offline' | 'combo'
}

export const UPGRADES: UpgradeDef[] = [
  // ── Click Power (8) ──
  { id: 'c1', name: 'סכין חדה',         emoji: '🔪', description: 'x2 כוח לחיצה',       cost: 50,          effect: { type: 'click_multiply', value: 2 },    unlockAt: 20,         category: 'click' },
  { id: 'c2', name: 'טכניקת שף',        emoji: '👨‍🍳', description: 'x3 כוח לחיצה',       cost: 2500,        effect: { type: 'click_multiply', value: 3 },    unlockAt: 1000,       category: 'click', requires: 'c1' },
  { id: 'c3', name: 'ידיים מהירות',     emoji: '⚡', description: 'x4 כוח לחיצה',       cost: 50000,       effect: { type: 'click_multiply', value: 4 },    unlockAt: 20000,      category: 'click', requires: 'c2' },
  { id: 'c4', name: 'מכונת חיתוך',      emoji: '⚙️', description: 'x5 כוח לחיצה',       cost: 2000000,     effect: { type: 'click_multiply', value: 5 },    unlockAt: 500000,     category: 'click', requires: 'c3' },
  { id: 'c5', name: 'רובוט שף',         emoji: '🤖', description: 'x8 כוח לחיצה',       cost: 100000000,   effect: { type: 'click_multiply', value: 8 },    unlockAt: 20000000,   category: 'click', requires: 'c4' },
  { id: 'c6', name: 'AI קולינרי',       emoji: '🧠', description: 'x10 כוח לחיצה',      cost: 10000000000, effect: { type: 'click_multiply', value: 10 },   unlockAt: 2000000000, category: 'click', requires: 'c5' },
  { id: 'c7', name: '+5 בסיס לחיצה',    emoji: '💪', description: '+5 לכל לחיצה',       cost: 500,         effect: { type: 'click_add', value: 5 },         unlockAt: 200,        category: 'click' },
  { id: 'c8', name: '+50 בסיס לחיצה',   emoji: '💥', description: '+50 לכל לחיצה',      cost: 50000,       effect: { type: 'click_add', value: 50 },        unlockAt: 20000,      category: 'click', requires: 'c7' },

  // ── Generator Boosts (15 — one per generator) ──
  { id: 'g_spoon',      name: 'כפות מעץ זית',      emoji: '🫒', description: 'x3 הכנסה מכף עץ',         cost: 200,          effect: { type: 'generator_multiply', generatorId: 'spoon', value: 3 },       unlockAt: 80,         category: 'generator' },
  { id: 'g_knife',      name: 'סכין יפנית',        emoji: '🎌', description: 'x3 הכנסה מסכין שף',       cost: 1500,         effect: { type: 'generator_multiply', generatorId: 'knife', value: 3 },       unlockAt: 600,        category: 'generator' },
  { id: 'g_oven',       name: 'תנור קונבקציה',     emoji: '🌡️', description: 'x3 הכנסה מתנור',          cost: 10000,        effect: { type: 'generator_multiply', generatorId: 'oven', value: 3 },        unlockAt: 4000,       category: 'generator' },
  { id: 'g_linecook',   name: 'הכשרת טבחים',       emoji: '📚', description: 'x3 הכנסה מטבח',           cost: 80000,        effect: { type: 'generator_multiply', generatorId: 'linecook', value: 3 },    unlockAt: 30000,      category: 'generator' },
  { id: 'g_prepteam',   name: 'ציוד מקצועי',       emoji: '🧰', description: 'x3 הכנסה מצוות הכנה',     cost: 600000,       effect: { type: 'generator_multiply', generatorId: 'prepteam', value: 3 },    unlockAt: 200000,     category: 'generator' },
  { id: 'g_bakery',     name: 'תנור עצים',         emoji: '🪵', description: 'x3 הכנסה ממאפייה',        cost: 4000000,      effect: { type: 'generator_multiply', generatorId: 'bakery', value: 3 },      unlockAt: 1500000,    category: 'generator' },
  { id: 'g_foodtruck',  name: 'מנוע טורבו',        emoji: '💨', description: 'x3 הכנסה ממשאית אוכל',    cost: 30000000,     effect: { type: 'generator_multiply', generatorId: 'foodtruck', value: 3 },   unlockAt: 10000000,   category: 'generator' },
  { id: 'g_restaurant', name: 'עיצוב פנים יוקרתי', emoji: '🎨', description: 'x3 הכנסה ממסעדה',         cost: 250000000,    effect: { type: 'generator_multiply', generatorId: 'restaurant', value: 3 },  unlockAt: 80000000,   category: 'generator' },
  { id: 'g_gourmet',    name: 'מצרכים מיוחדים',    emoji: '🍄', description: 'x3 הכנסה ממטבח גורמה',    cost: 2000000000,   effect: { type: 'generator_multiply', generatorId: 'gourmet', value: 3 },     unlockAt: 600000000,  category: 'generator' },
  { id: 'g_catering',   name: 'צי משאיות',         emoji: '🚛', description: 'x3 הכנסה מקייטרינג',      cost: 15000000000,  effect: { type: 'generator_multiply', generatorId: 'catering', value: 3 },    unlockAt: 5000000000, category: 'generator' },
  { id: 'g_factory',    name: 'קו ייצור אוטומטי',  emoji: '🤖', description: 'x3 הכנסה ממפעל',          cost: 1.5e11,       effect: { type: 'generator_multiply', generatorId: 'factory', value: 3 },     unlockAt: 4e10,       category: 'generator' },
  { id: 'g_celebrity',  name: 'ספר מתכונים',       emoji: '📖', description: 'x3 הכנסה ממותג סלבריטי',   cost: 1.5e12,       effect: { type: 'generator_multiply', generatorId: 'celebrity', value: 3 },   unlockAt: 4e11,       category: 'generator' },
  { id: 'g_lab',        name: 'מעבדה מתקדמת',      emoji: '🧪', description: 'x3 הכנסה ממעבדה',          cost: 1.5e13,       effect: { type: 'generator_multiply', generatorId: 'lab', value: 3 },         unlockAt: 4e12,       category: 'generator' },
  { id: 'g_franchise',  name: 'סניפים VIP',        emoji: '💎', description: 'x3 הכנסה מרשת בינלאומית',  cost: 1.5e14,       effect: { type: 'generator_multiply', generatorId: 'franchise', value: 3 },   unlockAt: 4e13,       category: 'generator' },
  { id: 'g_space',      name: 'טכנולוגיה חללית',   emoji: '🛸', description: 'x3 הכנסה ממטבח חלל',       cost: 1.5e15,       effect: { type: 'generator_multiply', generatorId: 'space', value: 3 },       unlockAt: 4e14,       category: 'generator' },

  // ── Global Economy (8) ──
  { id: 'm1', name: 'שלט חוצות',         emoji: '📺', description: 'x2 הכנסה כללית',        cost: 5000,         effect: { type: 'all_multiply', value: 2 },      unlockAt: 2000,       category: 'global' },
  { id: 'm2', name: 'קמפיין דיגיטלי',    emoji: '📱', description: 'x2 הכנסה כללית',        cost: 500000,       effect: { type: 'all_multiply', value: 2 },      unlockAt: 150000,     category: 'global', requires: 'm1' },
  { id: 'm3', name: 'כוכב מישלן',        emoji: '⭐', description: 'x3 הכנסה כללית',        cost: 50000000,     effect: { type: 'all_multiply', value: 3 },      unlockAt: 15000000,   category: 'global', requires: 'm2' },
  { id: 'm4', name: 'תוכנית TV',          emoji: '🎬', description: 'x3 הכנסה כללית',        cost: 5000000000,   effect: { type: 'all_multiply', value: 3 },      unlockAt: 1500000000, category: 'global', requires: 'm3' },
  { id: 'm5', name: 'אימפריית מזון',     emoji: '🌍', description: 'x5 הכנסה כללית',        cost: 500000000000, effect: { type: 'all_multiply', value: 5 },      unlockAt: 1.5e11,     category: 'global', requires: 'm4' },
  { id: 'd1', name: 'הנחת ספקים',        emoji: '📦', description: 'עלויות x0.9',           cost: 20000,        effect: { type: 'cost_reduce', value: 0.9 },     unlockAt: 8000,       category: 'global' },
  { id: 'd2', name: 'קניות סיטונאי',     emoji: '🏪', description: 'עלויות x0.85',          cost: 2000000,      effect: { type: 'cost_reduce', value: 0.85 },    unlockAt: 600000,     category: 'global', requires: 'd1' },
  { id: 'd3', name: 'שותפות אסטרטגית',   emoji: '🤝', description: 'עלויות x0.8',           cost: 200000000,    effect: { type: 'cost_reduce', value: 0.8 },     unlockAt: 60000000,   category: 'global', requires: 'd2' },

  // ── Critical Hits (6) ──
  { id: 'cr1', name: 'מזל מתחיל',       emoji: '🍀', description: '+5% סיכוי קריטי',       cost: 1000,         effect: { type: 'crit_chance', value: 0.05 },    unlockAt: 400,        category: 'crit' },
  { id: 'cr2', name: 'אינטואיציה',      emoji: '🎯', description: '+8% סיכוי קריטי',       cost: 50000,        effect: { type: 'crit_chance', value: 0.08 },    unlockAt: 20000,      category: 'crit', requires: 'cr1' },
  { id: 'cr3', name: 'חוש שישי',        emoji: '👁️', description: '+12% סיכוי קריטי',      cost: 5000000,      effect: { type: 'crit_chance', value: 0.12 },    unlockAt: 1500000,    category: 'crit', requires: 'cr2' },
  { id: 'cr4', name: 'מגע הזהב',        emoji: '✨', description: 'x5 נזק קריטי',           cost: 100000,       effect: { type: 'crit_multiply', value: 5 },     unlockAt: 40000,      category: 'crit' },
  { id: 'cr5', name: 'הברקה',           emoji: '💡', description: 'x8 נזק קריטי',           cost: 10000000,     effect: { type: 'crit_multiply', value: 8 },     unlockAt: 3000000,    category: 'crit', requires: 'cr4' },
  { id: 'cr6', name: 'שליטה מוחלטת',    emoji: '🔥', description: 'x12 נזק קריטי',          cost: 1000000000,   effect: { type: 'crit_multiply', value: 12 },    unlockAt: 300000000,  category: 'crit', requires: 'cr5' },

  // ── Combo (4) ──
  { id: 'co1', name: 'קצב מטבח',        emoji: '🥁', description: '+50% עוצמת קומבו',       cost: 3000,         effect: { type: 'combo_power', value: 1.5 },     unlockAt: 1200,       category: 'combo' },
  { id: 'co2', name: 'זרימה',           emoji: '🌊', description: '+50% עוצמת קומבו',       cost: 300000,       effect: { type: 'combo_power', value: 1.5 },     unlockAt: 100000,     category: 'combo', requires: 'co1' },
  { id: 'co3', name: 'טרנס בישול',      emoji: '🧘', description: 'x2 עוצמת קומבו',         cost: 30000000,     effect: { type: 'combo_power', value: 2 },       unlockAt: 10000000,   category: 'combo', requires: 'co2' },
  { id: 'co4', name: 'על-אנושי',        emoji: '⚡', description: 'x2 עוצמת קומבו',         cost: 3000000000,   effect: { type: 'combo_power', value: 2 },       unlockAt: 1000000000, category: 'combo', requires: 'co3' },

  // ── Offline (4) ──
  { id: 'o1', name: 'משמרת לילה',       emoji: '🌙', description: 'x2 הכנסה אופליין',       cost: 25000,        effect: { type: 'offline_multiply', value: 2 },  unlockAt: 10000,      category: 'offline' },
  { id: 'o2', name: 'צוות לילה',        emoji: '🦉', description: 'x2 הכנסה אופליין',       cost: 2500000,      effect: { type: 'offline_multiply', value: 2 },  unlockAt: 800000,     category: 'offline', requires: 'o1' },
  { id: 'o3', name: 'אוטומציה מלאה',    emoji: '🤖', description: 'x3 הכנסה אופליין',       cost: 250000000,    effect: { type: 'offline_multiply', value: 3 },  unlockAt: 80000000,   category: 'offline', requires: 'o2' },
  { id: 'o4', name: 'מפעל 24/7',        emoji: '🏭', description: 'x3 הכנסה אופליין',       cost: 25000000000,  effect: { type: 'offline_multiply', value: 3 },  unlockAt: 8000000000, category: 'offline', requires: 'o3' },
]
