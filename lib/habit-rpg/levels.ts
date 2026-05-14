// ══════════════════════════════════════════════════
// Habit RPG — Level & XP System
// ══════════════════════════════════════════════════

export interface LevelDef {
  level: number
  title: string
  xpRequired: number  // XP needed for THIS level (not cumulative)
  cumulative: number   // total XP at start of this level
  tier: number         // avatar tier
}

export const LEVELS: LevelDef[] = [
  { level: 1,  title: 'Novice',     xpRequired: 0,    cumulative: 0,    tier: 1 },
  { level: 2,  title: 'Apprentice', xpRequired: 50,   cumulative: 50,   tier: 1 },
  { level: 3,  title: 'Adept',      xpRequired: 120,  cumulative: 170,  tier: 2 },
  { level: 4,  title: 'Skilled',    xpRequired: 200,  cumulative: 370,  tier: 2 },
  { level: 5,  title: 'Expert',     xpRequired: 300,  cumulative: 670,  tier: 3 },
  { level: 6,  title: 'Veteran',    xpRequired: 420,  cumulative: 1090, tier: 3 },
  { level: 7,  title: 'Master',     xpRequired: 560,  cumulative: 1650, tier: 4 },
  { level: 8,  title: 'Champion',   xpRequired: 720,  cumulative: 2370, tier: 4 },
  { level: 9,  title: 'Legend',     xpRequired: 900,  cumulative: 3270, tier: 5 },
  { level: 10, title: 'Immortal',   xpRequired: 1100, cumulative: 4370, tier: 5 },
]

export const MAX_LEVEL = 10

export function getLevelDef(level: number): LevelDef {
  return LEVELS[Math.min(level, MAX_LEVEL) - 1]
}

export function getLevelForXP(totalXP: number): { level: number; xpIntoLevel: number; xpForNext: number } {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].cumulative) {
      const xpIntoLevel = totalXP - LEVELS[i].cumulative
      const xpForNext = i < LEVELS.length - 1 ? LEVELS[i + 1].xpRequired : 0
      return { level: LEVELS[i].level, xpIntoLevel, xpForNext }
    }
  }
  return { level: 1, xpIntoLevel: 0, xpForNext: LEVELS[1].xpRequired }
}

export function getTier(level: number): number {
  return getLevelDef(level).tier
}

export function canAscend(level: number, xp: number): boolean {
  return level >= MAX_LEVEL && xp >= LEVELS[MAX_LEVEL - 1].cumulative + LEVELS[MAX_LEVEL - 1].xpRequired
}
