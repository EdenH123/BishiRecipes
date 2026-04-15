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
  { id: 'rc1', name: 'זיכרון שרירי',    emoji: '💪', description: 'x2 כוח לחיצה לצמיתות',     cost: 1,  effect: { type: 'click_multiply', value: 2 },    branch: 'click',      unlockAtPrestige: 0 },
  { id: 'rc2', name: 'ידיים מנוסות',    emoji: '👐', description: 'x3 כוח לחיצה לצמיתות',     cost: 3,  effect: { type: 'click_multiply', value: 3 },    branch: 'click',      unlockAtPrestige: 3,  requires: 'rc1' },
  { id: 'rc3', name: 'אומנות בישול',    emoji: '🎨', description: 'x5 כוח לחיצה לצמיתות',     cost: 8,  effect: { type: 'click_multiply', value: 5 },    branch: 'click',      unlockAtPrestige: 10, requires: 'rc2' },
  { id: 'rc4', name: 'מגע קסום',        emoji: '✨', description: '+15% סיכוי קריטי לצמיתות',  cost: 5,  effect: { type: 'crit_chance', value: 0.15 },    branch: 'click',      unlockAtPrestige: 5,  requires: 'rc1' },
  { id: 'rc5', name: 'מכת בישול',       emoji: '⚡', description: 'x10 נזק קריטי לצמיתות',    cost: 12, effect: { type: 'crit_multiply', value: 10 },    branch: 'click',      unlockAtPrestige: 15, requires: 'rc4' },

  // ── Automation Branch ──
  { id: 'ra1', name: 'יעילות מטבח',     emoji: '📈', description: 'x2 הכנסה פסיבית לצמיתות',   cost: 1,  effect: { type: 'all_multiply', value: 2 },      branch: 'automation', unlockAtPrestige: 0 },
  { id: 'ra2', name: 'אוטומציה חכמה',   emoji: '🤖', description: 'x3 הכנסה פסיבית לצמיתות',   cost: 3,  effect: { type: 'all_multiply', value: 3 },      branch: 'automation', unlockAtPrestige: 3,  requires: 'ra1' },
  { id: 'ra3', name: 'מהפכת מזון',      emoji: '🌟', description: 'x5 הכנסה פסיבית לצמיתות',   cost: 8,  effect: { type: 'all_multiply', value: 5 },      branch: 'automation', unlockAtPrestige: 10, requires: 'ra2' },
  { id: 'ra4', name: 'עובדים נאמנים',   emoji: '🌙', description: 'x5 הכנסה אופליין לצמיתות',  cost: 4,  effect: { type: 'offline_multiply', value: 5 },  branch: 'automation', unlockAtPrestige: 4,  requires: 'ra1' },

  // ── Economy Branch ──
  { id: 're1', name: 'קשרים בשוק',      emoji: '🤝', description: 'עלויות x0.85 לצמיתות',     cost: 2,  effect: { type: 'cost_reduce', value: 0.85 },    branch: 'economy',    unlockAtPrestige: 0 },
  { id: 're2', name: 'רשת אספקה',       emoji: '📦', description: 'עלויות x0.8 לצמיתות',      cost: 5,  effect: { type: 'cost_reduce', value: 0.8 },     branch: 'economy',    unlockAtPrestige: 5,  requires: 're1' },
  { id: 're3', name: 'מונופול',          emoji: '🏦', description: 'עלויות x0.7 לצמיתות',      cost: 12, effect: { type: 'cost_reduce', value: 0.7 },     branch: 'economy',    unlockAtPrestige: 15, requires: 're2' },

  // ── Prestige Branch ──
  { id: 'rp1', name: 'מורשת מתמשכת',    emoji: '📜', description: '+50% נקודות פרסטיג',        cost: 3,  effect: { type: 'all_multiply', value: 1 },      branch: 'prestige',   unlockAtPrestige: 3 },
  { id: 'rp2', name: 'שם עולמי',        emoji: '🌐', description: '+100% נקודות פרסטיג',       cost: 8,  effect: { type: 'all_multiply', value: 1 },      branch: 'prestige',   unlockAtPrestige: 10, requires: 'rp1' },

  // ── Events Branch ──
  { id: 'rv1', name: 'עין חדה',          emoji: '👁️', description: 'אירועים בתדירות גבוהה',    cost: 2,  effect: { type: 'all_multiply', value: 1 },      branch: 'events',     unlockAtPrestige: 2 },
  { id: 'rv2', name: 'קומבו מאסטר',     emoji: '🎵', description: 'x2 עוצמת קומבו לצמיתות',    cost: 4,  effect: { type: 'combo_power', value: 2 },       branch: 'events',     unlockAtPrestige: 4,  requires: 'rv1' },
]

// ── Prestige Config ──
// Formula: floor(sqrt(totalEarned / divisor))
// At 1M → ~31 stars, at 10M → ~100, at 100M → ~316
export const PRESTIGE_DIVISOR = 1000
export const PRESTIGE_UNLOCK_EARNED = 500000  // need 500K total earned to see prestige tab

// Prestige bonus from research rp1/rp2 (checked by id in engine)
export const PRESTIGE_RESEARCH_BONUS: Record<string, number> = {
  rp1: 1.5,   // +50%
  rp2: 2.0,   // +100% (multiplicative with rp1)
}

// Event frequency research (checked by id in engine)
export const EVENT_RESEARCH_FREQUENCY: Record<string, number> = {
  rv1: 0.6,  // 60% of normal interval (= more frequent)
}
