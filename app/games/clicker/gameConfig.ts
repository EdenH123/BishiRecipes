// ══════════════════════════════════════════════════
// Culinary Empire — Master Config (re-exports + globals)
// ══════════════════════════════════════════════════

// Re-export all config modules
export { GENERATORS, SYNERGY_THRESHOLD, SYNERGY_MULTIPLIER, SYNERGY_MAX_TIERS, GENERATOR_MAX_COUNT } from './generators.config'
export type { GeneratorDef } from './generators.config'

export { UPGRADES, REPEATABLE_UPGRADES } from './upgrades.config'
export type { UpgradeDef, UpgradeEffect, RepeatableUpgradeDef } from './upgrades.config'

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

// Prestige-gated generators: require minimum prestige count
export const PRESTIGE_GATED_GENERATORS: Record<string, number> = {
  quantum: 3,
  time: 5,
  multiverse: 8,
}

// Generator max buy per click (prevents buying thousands at once)
export const MAX_BUY_PER_CLICK = 500

// Prestige difficulty scaling: each prestige makes next one need more
// Effective divisor = PRESTIGE_DIVISOR * (1 + prestigeCount * PRESTIGE_SCALING)
export const PRESTIGE_SCALING = 0.05  // +5% harder per prestige

// Daily bonus
export const DAILY_BONUS_BASE = 0.1    // 10% of current CPS * 3600 (1 hour worth)
export const DAILY_STREAK_BONUS = 0.05 // +5% per consecutive day (cap at 7)
export const DAILY_STREAK_MAX = 7
export const DAILY_STORAGE_KEY = 'bishi_daily_bonus'

// Prestige milestones: special bonuses at specific prestige counts
export const PRESTIGE_MILESTONES: { count: number; label: string; emoji: string; reward: number }[] = [
  { count: 3,  label: 'שף מקומי',     emoji: '🏠', reward: 1.1 },
  { count: 5,  label: 'שף ארצי',      emoji: '🇮🇱', reward: 1.15 },
  { count: 10, label: 'שף בינלאומי',  emoji: '🌍', reward: 1.2 },
  { count: 25, label: 'שף אגדי',      emoji: '👑', reward: 1.3 },
  { count: 50, label: 'אל הבישול',    emoji: '⚡', reward: 1.5 },
]

// Story messages that appear at milestones
export const STORY_MESSAGES: { totalEarned: number; message: string; emoji: string }[] = [
  { totalEarned: 100,        message: 'התחלת לבשל! המסע מתחיל...', emoji: '🥄' },
  { totalEarned: 1000,       message: 'המטבח שלך מתחמם!', emoji: '🔥' },
  { totalEarned: 10000,      message: 'השכנים מריחים את הבישול!', emoji: '👃' },
  { totalEarned: 100000,     message: 'פתחת עסק! שף אמיתי!', emoji: '👨‍🍳' },
  { totalEarned: 1000000,    message: 'מיליונר קולינרי!', emoji: '💰' },
  { totalEarned: 10000000,   message: 'הטלוויזיה רוצה ראיון!', emoji: '📺' },
  { totalEarned: 100000000,  message: 'כוכב מישלן ראשון!', emoji: '⭐' },
  { totalEarned: 1000000000, message: 'מיליארד! אתה מגנאט מזון!', emoji: '💎' },
  { totalEarned: 1e12,       message: 'אימפריית מזון עולמית!', emoji: '🌍' },
  { totalEarned: 1e15,       message: 'בישול מעבר לזמן ולמרחב!', emoji: '🌌' },
]

// Auto-buy config (unlocked via research)
export const AUTO_BUY_RESEARCH_ID = 'ra_auto'
export const AUTO_BUY_INTERVAL = 2000

// Boost ability
export const BOOST_DURATION = 30000      // 30 seconds
export const BOOST_COOLDOWN = 180000     // 3 minute cooldown
export const BOOST_MULTIPLIER = 5        // x5 all income during boost

// Prestige skins for the main click button
export const PRESTIGE_SKINS: { minPrestige: number; emoji: string; label: string }[] = [
  { minPrestige: 0,  emoji: '🍳', label: 'מחבת' },
  { minPrestige: 2,  emoji: '🥘', label: 'סיר גורמה' },
  { minPrestige: 5,  emoji: '🍲', label: 'קדירה מלכותית' },
  { minPrestige: 10, emoji: '🔱', label: 'שלשול הזהב' },
  { minPrestige: 20, emoji: '👑', label: 'כתר השף' },
  { minPrestige: 50, emoji: '💎', label: 'יהלום קולינרי' },
]

// Synergy names (shown when reaching threshold)
export const SYNERGY_NAMES: string[] = [
  'שותפות מטבח!',
  'קומבינציה מנצחת!',
  'סינרג׳י מושלם!',
  'כוח משולב!',
  'אימפריה מאוחדת!',
]

// Mini quests (rotate daily)
export interface MiniQuest {
  id: string
  description: string
  emoji: string
  type: 'clicks' | 'earn' | 'buy_generators' | 'combo'
  target: number
  rewardCoins: number  // multiplier of current CPS * 60
}

export const MINI_QUESTS: MiniQuest[] = [
  { id: 'q_click50',  description: '50 לחיצות',          emoji: '👆', type: 'clicks',         target: 50,     rewardCoins: 120 },
  { id: 'q_click200', description: '200 לחיצות',         emoji: '🖱️', type: 'clicks',         target: 200,    rewardCoins: 300 },
  { id: 'q_earn10k',  description: 'הרווח 10K',          emoji: '💰', type: 'earn',           target: 10000,  rewardCoins: 60 },
  { id: 'q_earn1m',   description: 'הרווח 1M',           emoji: '💎', type: 'earn',           target: 1000000, rewardCoins: 180 },
  { id: 'q_buy5',     description: 'קנה 5 עסקים',        emoji: '🏪', type: 'buy_generators', target: 5,      rewardCoins: 90 },
  { id: 'q_buy20',    description: 'קנה 20 עסקים',       emoji: '🏢', type: 'buy_generators', target: 20,     rewardCoins: 240 },
  { id: 'q_combo15',  description: 'הגע לקומבו 15',      emoji: '🔥', type: 'combo',          target: 15,     rewardCoins: 150 },
  { id: 'q_combo30',  description: 'הגע לקומבו 30',      emoji: '💥', type: 'combo',          target: 30,     rewardCoins: 300 },
]

// Secret achievements (added to achievements config but shown separately)
export const SECRET_ACHIEVEMENT_IDS = ['cb_50', 'ct_1k']
