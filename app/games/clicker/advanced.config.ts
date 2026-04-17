// ══════════════════════════════════════════════════
// Culinary Empire — Advanced Mechanics Config
// ══════════════════════════════════════════════════

// ── Generator Evolution (prestige-gated visual upgrades) ──
export const GENERATOR_EVOLUTIONS: Record<string, { minPrestige: number; name: string; emoji: string }[]> = {
  spoon:     [{ minPrestige: 3, name: 'כף טיטניום', emoji: '🥈' }, { minPrestige: 8, name: 'כף אלוהית', emoji: '🪄' }],
  knife:     [{ minPrestige: 3, name: 'סכין דמשק', emoji: '⚔️' }, { minPrestige: 8, name: 'סכין לייזר', emoji: '🔦' }],
  oven:      [{ minPrestige: 5, name: 'תנור סולארי', emoji: '☀️' }],
  linecook:  [{ minPrestige: 5, name: 'שף כוכב', emoji: '🌟' }],
  restaurant:[{ minPrestige: 5, name: 'מסעדת מישלן', emoji: '🏅' }],
}

// ── Combo Freeze (research-gated, slows decay) ──
export const COMBO_FREEZE_RESEARCH_ID = 'rv_freeze'
export const COMBO_FREEZE_DECAY_MULTIPLIER = 2.5  // decay time x2.5

// ── Critical Streak ──
export const CRIT_STREAK_THRESHOLD = 3  // 3 crits in a row
export const CRIT_STREAK_BONUS = 5      // x5 bonus on streak

// ── Boss Fights ──
export interface BossDef {
  name: string
  emoji: string
  clicksRequired: number
  timeLimit: number       // seconds
  rewardCpsSeconds: number // reward = CPS * this
}

export const BOSSES: BossDef[] = [
  { name: 'ביצה עקשנית',      emoji: '🥚', clicksRequired: 30,  timeLimit: 10, rewardCpsSeconds: 120 },
  { name: 'בצק מורד',         emoji: '🫓', clicksRequired: 50,  timeLimit: 12, rewardCpsSeconds: 180 },
  { name: 'סטייק עיקש',       emoji: '🥩', clicksRequired: 80,  timeLimit: 15, rewardCpsSeconds: 300 },
  { name: 'סופלה רועד',       emoji: '🍮', clicksRequired: 120, timeLimit: 15, rewardCpsSeconds: 600 },
  { name: 'המבורגר ענק',      emoji: '🍔', clicksRequired: 200, timeLimit: 20, rewardCpsSeconds: 1200 },
]
export const BOSS_MIN_INTERVAL = 300   // seconds between bosses
export const BOSS_MAX_INTERVAL = 600

// ── Timed Challenges ──
export interface TimedChallenge {
  description: string
  emoji: string
  targetEarned: number
  timeLimit: number  // seconds
  rewardMultiplier: number
}

export const TIMED_CHALLENGES: TimedChallenge[] = [
  { description: 'הרווח 10K תוך 60 שניות',  emoji: '⏱️', targetEarned: 10000,    timeLimit: 60,  rewardMultiplier: 2 },
  { description: 'הרווח 500K תוך 90 שניות',  emoji: '⏱️', targetEarned: 500000,   timeLimit: 90,  rewardMultiplier: 3 },
  { description: 'הרווח 10M תוך 120 שניות',  emoji: '⏱️', targetEarned: 10000000, timeLimit: 120, rewardMultiplier: 5 },
]

// ── Generator Level-up Milestones ──
export const GENERATOR_MILESTONES = [25, 50, 100, 250, 500]

// ── In-game Notification Types ──
export interface GameNotification {
  id: string
  text: string
  emoji: string
  type: 'info' | 'success' | 'reward'
}

// ── Night Mode (time-based background) ──
export function getTimeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'day'
  if (h >= 18 && h < 22) return 'evening'
  return 'night'
}

export const TIME_BACKGROUNDS: Record<string, string> = {
  morning: 'from-[#2a1a08] via-[#3a2510] to-[#2a1500]',
  day:     'from-[#1a0f00] via-[#2a1500] to-[#1a0a00]',
  evening: 'from-[#1a0a15] via-[#25100a] to-[#150808]',
  night:   'from-[#0a0a15] via-[#101020] to-[#080810]',
}

// ── Game Completion Progress ──
export function calcCompletionPercent(
  achievements: number, totalAchievements: number,
  research: number, totalResearch: number,
  challenges: number, totalChallenges: number,
  generators: number, totalGenerators: number,
): number {
  const achWeight = 30
  const resWeight = 25
  const chalWeight = 25
  const genWeight = 20
  return Math.min(100, Math.round(
    (achievements / Math.max(totalAchievements, 1)) * achWeight +
    (research / Math.max(totalResearch, 1)) * resWeight +
    (challenges / Math.max(totalChallenges, 1)) * chalWeight +
    (generators >= totalGenerators ? genWeight : (generators / totalGenerators) * genWeight)
  ))
}
