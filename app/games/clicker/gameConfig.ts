// ══════════════════════════════════════════════════
// Culinary Empire — Master Config (re-exports + globals)
// ══════════════════════════════════════════════════

// Re-export all config modules
export { GENERATORS, SYNERGY_THRESHOLD, SYNERGY_MULTIPLIER } from './generators.config'
export type { GeneratorDef } from './generators.config'

export { UPGRADES } from './upgrades.config'
export type { UpgradeDef, UpgradeEffect } from './upgrades.config'

export { ACHIEVEMENTS } from './achievements.config'
export type { AchievementDef, AchievementCondition, AchievementReward } from './achievements.config'

export {
  RESEARCH, PRESTIGE_DIVISOR, PRESTIGE_EXPONENT, PRESTIGE_UNLOCK_EARNED,
  PRESTIGE_RESEARCH_BONUS, EVENT_RESEARCH_FREQUENCY,
} from './prestige.config'
export type { ResearchDef } from './prestige.config'

export { CHALLENGES } from './challenges.config'
export type { ChallengeDef, ChallengeRestriction, ChallengeReward } from './challenges.config'

// ── Global Constants ──

// Offline
export const MAX_OFFLINE_SECONDS = 28800  // 8 hours
export const BASE_OFFLINE_RATE = 0.25     // 25% of income offline (upgradeable)

// Golden Dish event
export const GOLDEN_MIN_INTERVAL = 45     // seconds between events
export const GOLDEN_MAX_INTERVAL = 240
export const GOLDEN_DURATION = 10         // seconds to click
export const GOLDEN_REWARD_CPS_SECONDS = 90  // reward = 90s of CPS

// Combo system
export const COMBO_DECAY_MS = 1200        // combo resets after 1.2s no click
export const COMBO_MAX = 50               // max combo multiplier
export const COMBO_BASE_POWER = 0.04      // each combo step = +4% click power

// Save
export const SAVE_KEY = 'bishi_culinary_empire'
export const AUTO_SAVE_INTERVAL = 10000

// Prestige bonus per lifetime star
export const PRESTIGE_STAR_BONUS = 0.002   // +0.2% all income per lifetime star
