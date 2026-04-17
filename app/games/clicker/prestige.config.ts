// ══════════════════════════════════════════════════
// Culinary Empire — Prestige & Research Definitions
// ══════════════════════════════════════════════════
//
// Prestige currency: כוכבי מישלן (Michelin Stars)
// Research currency: Same (spent from prestige pool)
// Research tree has 5 branches with dependencies

import type { UpgradeEffect } from './upgrades.config'

// ── Research Tree ──
export interface ResearchDef {
  id: string
  name: string
  emoji: string
  description: string
  cost: number          // michelin stars
  effect: UpgradeEffect
  requires?: string     // prerequisite research id
  branch: 'click' | 'automation' | 'economy' | 'prestige' | 'events'
  unlockAtPrestige: number  // min lifetime stars to show
}

export const RESEARCH: ResearchDef[] = [
  // ── Click Branch ──
  { id: 'rc1', name: 'זיכרון שרירי',    emoji: '💪', description: 'x1.5 כוח לחיצה לצמיתות',    cost: 3,   effect: { type: 'click_multiply', value: 1.5 },   branch: 'click',      unlockAtPrestige: 0 },
  { id: 'rc2', name: 'ידיים מנוסות',    emoji: '👐', description: 'x1.8 כוח לחיצה לצמיתות',    cost: 8,   effect: { type: 'click_multiply', value: 1.8 },   branch: 'click',      unlockAtPrestige: 10,  requires: 'rc1' },
  { id: 'rc3', name: 'אומנות בישול',    emoji: '🎨', description: 'x2 כוח לחיצה לצמיתות',      cost: 20,  effect: { type: 'click_multiply', value: 2 },     branch: 'click',      unlockAtPrestige: 30, requires: 'rc2' },
  { id: 'rc4', name: 'מגע קסום',        emoji: '✨', description: '+10% סיכוי קריטי לצמיתות',   cost: 10,  effect: { type: 'crit_chance', value: 0.10 },     branch: 'click',      unlockAtPrestige: 15,  requires: 'rc1' },
  { id: 'rc5', name: 'מכת בישול',       emoji: '⚡', description: 'x5 נזק קריטי לצמיתות',      cost: 25,  effect: { type: 'crit_multiply', value: 5 },      branch: 'click',      unlockAtPrestige: 40, requires: 'rc4' },

  // ── Automation Branch ──
  { id: 'ra1', name: 'יעילות מטבח',     emoji: '📈', description: 'x1.5 הכנסה פסיבית לצמיתות',  cost: 3,   effect: { type: 'all_multiply', value: 1.5 },     branch: 'automation', unlockAtPrestige: 0 },
  { id: 'ra2', name: 'אוטומציה חכמה',   emoji: '🤖', description: 'x1.8 הכנסה פסיבית לצמיתות',  cost: 8,   effect: { type: 'all_multiply', value: 1.8 },     branch: 'automation', unlockAtPrestige: 10,  requires: 'ra1' },
  { id: 'ra3', name: 'מהפכת מזון',      emoji: '🌟', description: 'x2 הכנסה פסיבית לצמיתות',    cost: 20,  effect: { type: 'all_multiply', value: 2 },       branch: 'automation', unlockAtPrestige: 30, requires: 'ra2' },
  { id: 'ra4', name: 'עובדים נאמנים',   emoji: '🌙', description: 'x2 הכנסה אופליין לצמיתות',   cost: 8,   effect: { type: 'offline_multiply', value: 2 },   branch: 'automation', unlockAtPrestige: 10,  requires: 'ra1' },

  // ── Economy Branch ──
  { id: 're1', name: 'קשרים בשוק',      emoji: '🤝', description: 'עלויות x0.92 לצמיתות',      cost: 5,   effect: { type: 'cost_reduce', value: 0.92 },     branch: 'economy',    unlockAtPrestige: 5 },
  { id: 're2', name: 'רשת אספקה',       emoji: '📦', description: 'עלויות x0.88 לצמיתות',      cost: 12,  effect: { type: 'cost_reduce', value: 0.88 },     branch: 'economy',    unlockAtPrestige: 15,  requires: 're1' },
  { id: 're3', name: 'מונופול',          emoji: '🏦', description: 'עלויות x0.82 לצמיתות',      cost: 30,  effect: { type: 'cost_reduce', value: 0.82 },     branch: 'economy',    unlockAtPrestige: 40, requires: 're2' },

  // ── Prestige Branch ──
  { id: 'rp1', name: 'מורשת מתמשכת',    emoji: '📜', description: '+25% נקודות פרסטיג',         cost: 6,   effect: { type: 'all_multiply', value: 1 },       branch: 'prestige',   unlockAtPrestige: 8 },
  { id: 'rp2', name: 'שם עולמי',        emoji: '🌐', description: '+50% נקודות פרסטיג',         cost: 18,  effect: { type: 'all_multiply', value: 1 },       branch: 'prestige',   unlockAtPrestige: 25, requires: 'rp1' },

  // ── Events Branch ──
  { id: 'rv1', name: 'עין חדה',          emoji: '👁️', description: 'אירועים בתדירות גבוהה',     cost: 4,   effect: { type: 'all_multiply', value: 1 },       branch: 'events',     unlockAtPrestige: 5 },
  { id: 'rv2', name: 'קומבו מאסטר',     emoji: '🎵', description: 'x1.5 עוצמת קומבו לצמיתות',   cost: 8,   effect: { type: 'combo_power', value: 1.5 },      branch: 'events',     unlockAtPrestige: 10,  requires: 'rv1' },

  // ── Automation Branch (continued) ──
  { id: 'ra_auto', name: 'קנייה אוטומטית', emoji: '🔄', description: 'קונה את ה-generator הכי יעיל אוטומטית', cost: 15, effect: { type: 'all_multiply', value: 1 }, branch: 'automation', unlockAtPrestige: 20, requires: 'ra3' },
]

// ── Prestige Config ──
// Formula: floor((totalEarned / divisor) ^ exponent)
// At 2M → 1 star, at 20M → 3 stars, at 200M → 10 stars, at 2B → 31 stars
export const PRESTIGE_DIVISOR = 2000000
export const PRESTIGE_EXPONENT = 0.45
export const PRESTIGE_UNLOCK_EARNED = 2000000  // need 2M total earned to see prestige

// Prestige bonus from research rp1/rp2
export const PRESTIGE_RESEARCH_BONUS: Record<string, number> = {
  rp1: 1.25,  // +25%
  rp2: 1.5,   // +50% (multiplicative with rp1)
}

// Event frequency research (checked by id in engine)
export const EVENT_RESEARCH_FREQUENCY: Record<string, number> = {
  rv1: 0.6,  // 60% of normal interval (= more frequent)
}
