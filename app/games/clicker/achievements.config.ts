// ══════════════════════════════════════════════════
// Culinary Empire — Achievement Definitions (32 achievements)
// ══════════════════════════════════════════════════

export type AchievementCondition =
  | { type: 'total_earned'; amount: number }
  | { type: 'total_clicks'; amount: number }
  | { type: 'generator_count'; generatorId: string; amount: number }
  | { type: 'total_generators'; amount: number }
  | { type: 'cps'; amount: number }
  | { type: 'prestige_count'; amount: number }
  | { type: 'combo'; amount: number }
  | { type: 'crit_count'; amount: number }

export type AchievementReward =
  | { type: 'multiply_all'; value: number }
  | { type: 'multiply_click'; value: number }
  | { type: 'bonus_coins'; value: number }

export interface AchievementDef {
  id: string
  name: string
  emoji: string
  description: string
  condition: AchievementCondition
  reward: AchievementReward
  hidden?: boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Total Earned Milestones (7) ──
  { id: 'e_1k',    name: 'טבח חובב',        emoji: '🌱', description: 'הרווח 1,000',          condition: { type: 'total_earned', amount: 1000 },          reward: { type: 'multiply_all', value: 1.05 } },
  { id: 'e_10k',   name: 'טבח מנוסה',       emoji: '🍳', description: 'הרווח 10,000',         condition: { type: 'total_earned', amount: 10000 },         reward: { type: 'multiply_all', value: 1.05 } },
  { id: 'e_100k',  name: 'שף בכיר',         emoji: '👨‍🍳', description: 'הרווח 100,000',        condition: { type: 'total_earned', amount: 100000 },        reward: { type: 'multiply_all', value: 1.08 } },
  { id: 'e_1m',    name: 'שף מאסטר',        emoji: '🏆', description: 'הרווח 1,000,000',      condition: { type: 'total_earned', amount: 1000000 },       reward: { type: 'multiply_all', value: 1.1 } },
  { id: 'e_100m',  name: 'מגנאט מזון',       emoji: '💎', description: 'הרווח 100,000,000',    condition: { type: 'total_earned', amount: 100000000 },     reward: { type: 'multiply_all', value: 1.1 } },
  { id: 'e_1b',    name: 'מיליארדר קולינרי', emoji: '🌟', description: 'הרווח 1B',             condition: { type: 'total_earned', amount: 1000000000 },    reward: { type: 'multiply_all', value: 1.15 } },
  { id: 'e_1t',    name: 'אימפריית טעמים',  emoji: '🌍', description: 'הרווח 1T',             condition: { type: 'total_earned', amount: 1e12 },          reward: { type: 'multiply_all', value: 1.2 } },

  // ── Click Milestones (5) ──
  { id: 'k_100',   name: 'מתחילים לבשל',    emoji: '👆', description: '100 לחיצות',            condition: { type: 'total_clicks', amount: 100 },           reward: { type: 'multiply_click', value: 1.1 } },
  { id: 'k_1k',    name: 'אצבעות מהירות',   emoji: '🖱️', description: '1,000 לחיצות',         condition: { type: 'total_clicks', amount: 1000 },          reward: { type: 'multiply_click', value: 1.15 } },
  { id: 'k_10k',   name: 'מכונת בישול',      emoji: '⚡', description: '10,000 לחיצות',        condition: { type: 'total_clicks', amount: 10000 },         reward: { type: 'multiply_click', value: 1.2 } },
  { id: 'k_50k',   name: 'לוחץ אגדי',       emoji: '🔥', description: '50,000 לחיצות',        condition: { type: 'total_clicks', amount: 50000 },         reward: { type: 'multiply_click', value: 1.25 } },
  { id: 'k_100k',  name: 'אלוף הלחיצות',    emoji: '💀', description: '100,000 לחיצות',       condition: { type: 'total_clicks', amount: 100000 },        reward: { type: 'multiply_click', value: 1.3 } },

  // ── Generator Milestones (6) ──
  { id: 'gn_10',   name: 'מנהל עסקים',      emoji: '📋', description: '10 עסקים בסך הכל',     condition: { type: 'total_generators', amount: 10 },        reward: { type: 'multiply_all', value: 1.05 } },
  { id: 'gn_50',   name: 'יזם סדרתי',       emoji: '💼', description: '50 עסקים',              condition: { type: 'total_generators', amount: 50 },        reward: { type: 'multiply_all', value: 1.08 } },
  { id: 'gn_100',  name: 'מלך העסקים',       emoji: '👑', description: '100 עסקים',             condition: { type: 'total_generators', amount: 100 },       reward: { type: 'multiply_all', value: 1.1 } },
  { id: 'gn_250',  name: 'טייקון',           emoji: '🏦', description: '250 עסקים',             condition: { type: 'total_generators', amount: 250 },       reward: { type: 'multiply_all', value: 1.15 } },
  { id: 'gn_500',  name: 'קונגלומרט',        emoji: '🏙️', description: '500 עסקים',             condition: { type: 'total_generators', amount: 500 },       reward: { type: 'multiply_all', value: 1.2 } },
  { id: 'gn_1k',   name: 'אימפריה',         emoji: '🌐', description: '1,000 עסקים',           condition: { type: 'total_generators', amount: 1000 },      reward: { type: 'multiply_all', value: 1.25 } },

  // ── CPS Milestones (5) ──
  { id: 'cps_10',  name: 'זרם הכנסה',       emoji: '💰', description: '10/שנייה',              condition: { type: 'cps', amount: 10 },                    reward: { type: 'multiply_all', value: 1.05 } },
  { id: 'cps_1k',  name: 'נהר של כסף',      emoji: '🌊', description: '1,000/שנייה',           condition: { type: 'cps', amount: 1000 },                  reward: { type: 'multiply_all', value: 1.08 } },
  { id: 'cps_1m',  name: 'מפל הזהב',        emoji: '🏅', description: '1M/שנייה',              condition: { type: 'cps', amount: 1000000 },               reward: { type: 'multiply_all', value: 1.1 } },
  { id: 'cps_1b',  name: 'אוקיינוס מטבעות', emoji: '🌏', description: '1B/שנייה',              condition: { type: 'cps', amount: 1000000000 },            reward: { type: 'multiply_all', value: 1.15 } },
  { id: 'cps_1t',  name: 'יקום של טעם',     emoji: '🪐', description: '1T/שנייה',              condition: { type: 'cps', amount: 1e12 },                  reward: { type: 'multiply_all', value: 1.2 } },

  // ── Prestige (3) ──
  { id: 'p_1',     name: 'לידה מחדש',       emoji: '🔄', description: 'פרסטיג ראשון',          condition: { type: 'prestige_count', amount: 1 },          reward: { type: 'multiply_all', value: 1.1 } },
  { id: 'p_5',     name: 'פניקס',            emoji: '🔥', description: '5 פרסטיגים',            condition: { type: 'prestige_count', amount: 5 },          reward: { type: 'multiply_all', value: 1.15 } },
  { id: 'p_10',    name: 'נצחי',             emoji: '♾️', description: '10 פרסטיגים',           condition: { type: 'prestige_count', amount: 10 },         reward: { type: 'multiply_all', value: 1.2 } },

  // ── Combo (3) ──
  { id: 'cb_10',   name: 'קומבו!',           emoji: '🎵', description: 'קומבו 10',              condition: { type: 'combo', amount: 10 },                  reward: { type: 'multiply_click', value: 1.1 } },
  { id: 'cb_25',   name: 'סופר קומבו',       emoji: '🎸', description: 'קומבו 25',              condition: { type: 'combo', amount: 25 },                  reward: { type: 'multiply_click', value: 1.15 } },
  { id: 'cb_50',   name: 'קומבו מטורף',      emoji: '💥', description: 'קומבו 50',              condition: { type: 'combo', amount: 50 },                  reward: { type: 'multiply_click', value: 1.2 }, hidden: true },

  // ── Crit (2) ──
  { id: 'ct_100',  name: 'מבשל מדויק',       emoji: '🎯', description: '100 לחיצות קריטיות',    condition: { type: 'crit_count', amount: 100 },            reward: { type: 'multiply_click', value: 1.1 } },
  { id: 'ct_1k',   name: 'שליטה בסכין',      emoji: '⚔️', description: '1,000 קריטיות',         condition: { type: 'crit_count', amount: 1000 },           reward: { type: 'multiply_click', value: 1.2 }, hidden: true },
]
