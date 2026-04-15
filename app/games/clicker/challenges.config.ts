// ══════════════════════════════════════════════════
// Culinary Empire — Challenge Definitions
// ══════════════════════════════════════════════════
//
// Challenges are optional runs with restrictions and rewards.
// Player activates a challenge, gets restricted, and if they
// reach the goal they earn a permanent reward.
// Challenges persist through prestige and can only be completed once.

export interface ChallengeDef {
  id: string
  name: string
  emoji: string
  description: string
  goal: string               // human-readable goal
  targetEarned: number        // total earned needed to complete
  restriction: ChallengeRestriction
  reward: ChallengeReward
  unlockAtPrestige: number    // min prestige count to show
}

export type ChallengeRestriction =
  | { type: 'max_generator_types'; value: number }   // can only buy N different generators
  | { type: 'no_upgrades' }                           // cannot buy upgrades
  | { type: 'no_click' }                              // clicking gives 0 (idle only)
  | { type: 'generator_only'; generatorId: string }   // can only buy one specific generator
  | { type: 'half_income' }                           // all income halved
  | { type: 'expensive'; value: number }              // all costs multiplied

export type ChallengeReward =
  | { type: 'permanent_multiply_all'; value: number }
  | { type: 'permanent_multiply_click'; value: number }
  | { type: 'permanent_prestige_bonus'; value: number }
  | { type: 'bonus_stars'; value: number }

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'ch_3gen',
    name: 'מטבח מינימליסטי',
    emoji: '🥄',
    description: 'הגיע ל-500K עם 3 סוגי עסקים בלבד',
    goal: '500K מטבעות שף',
    targetEarned: 500000,
    restriction: { type: 'max_generator_types', value: 3 },
    reward: { type: 'permanent_multiply_all', value: 1.15 },
    unlockAtPrestige: 1,
  },
  {
    id: 'ch_no_upgrade',
    name: 'בישול טבעי',
    emoji: '🌿',
    description: 'הגיע ל-200K בלי לקנות שדרוגים',
    goal: '200K מטבעות שף',
    targetEarned: 200000,
    restriction: { type: 'no_upgrades' },
    reward: { type: 'permanent_multiply_click', value: 1.2 },
    unlockAtPrestige: 1,
  },
  {
    id: 'ch_idle',
    name: 'שף ישן',
    emoji: '😴',
    description: 'הגיע ל-1M בלי ללחוץ (רק הכנסה פסיבית)',
    goal: '1M מטבעות שף',
    targetEarned: 1000000,
    restriction: { type: 'no_click' },
    reward: { type: 'permanent_multiply_all', value: 1.2 },
    unlockAtPrestige: 2,
  },
  {
    id: 'ch_spoon_only',
    name: 'רק כף עץ',
    emoji: '🥄',
    description: 'הגיע ל-100K רק עם כפות עץ',
    goal: '100K מטבעות שף',
    targetEarned: 100000,
    restriction: { type: 'generator_only', generatorId: 'spoon' },
    reward: { type: 'bonus_stars', value: 5 },
    unlockAtPrestige: 1,
  },
  {
    id: 'ch_expensive',
    name: 'אינפלציה',
    emoji: '📈',
    description: 'הגיע ל-2M כשהכל עולה פי 3',
    goal: '2M מטבעות שף',
    targetEarned: 2000000,
    restriction: { type: 'expensive', value: 3 },
    reward: { type: 'permanent_multiply_all', value: 1.25 },
    unlockAtPrestige: 3,
  },
  {
    id: 'ch_half',
    name: 'חצי מנה',
    emoji: '🍽️',
    description: 'הגיע ל-1M כשכל ההכנסה חצי',
    goal: '1M מטבעות שף',
    targetEarned: 1000000,
    restriction: { type: 'half_income' },
    reward: { type: 'permanent_prestige_bonus', value: 1.3 },
    unlockAtPrestige: 2,
  },
  {
    id: 'ch_5gen',
    name: 'חמש אצבעות',
    emoji: '🖐️',
    description: 'הגיע ל-5M עם 5 סוגי עסקים בלבד',
    goal: '5M מטבעות שף',
    targetEarned: 5000000,
    restriction: { type: 'max_generator_types', value: 5 },
    reward: { type: 'permanent_multiply_all', value: 1.3 },
    unlockAtPrestige: 4,
  },
  {
    id: 'ch_expensive2',
    name: 'היפר-אינפלציה',
    emoji: '🔥',
    description: 'הגיע ל-10M כשהכל עולה פי 5',
    goal: '10M מטבעות שף',
    targetEarned: 10000000,
    restriction: { type: 'expensive', value: 5 },
    reward: { type: 'permanent_multiply_all', value: 1.5 },
    unlockAtPrestige: 5,
  },
]
