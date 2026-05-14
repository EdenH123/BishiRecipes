// ══════════════════════════════════════════════════
// Habit RPG — Achievement Definitions
// ══════════════════════════════════════════════════

import type { HabitCharacter } from './types'

export interface AchievementDef {
  id: string
  name: string
  emoji: string
  description: string
  check: (char: HabitCharacter, extra: AchievementContext) => boolean
  hidden?: boolean
}

export interface AchievementContext {
  totalCompletions: number
  totalHabits: number
  perfectDays: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Streak
  { id: 'streak_7',   name: 'Week Warrior',      emoji: '🔥', description: '7-day streak',           check: (c) => c.streak >= 7 },
  { id: 'streak_30',  name: 'Monthly Master',     emoji: '💪', description: '30-day streak',          check: (c) => c.streak >= 30 },
  { id: 'streak_100', name: 'Centurion',          emoji: '🏛️', description: '100-day streak',         check: (c) => c.streak >= 100, hidden: true },

  // Level
  { id: 'level_5',    name: 'Rising Star',        emoji: '⭐', description: 'Reach Level 5',          check: (c) => c.level >= 5 },
  { id: 'level_10',   name: 'Legendary',          emoji: '👑', description: 'Reach Level 10',         check: (c) => c.level >= 10 },

  // Stats
  { id: 'stat_10',    name: 'Balanced',           emoji: '⚖️', description: 'All 4 stats at 10+',     check: (c) => c.stat_strength >= 10 && c.stat_wisdom >= 10 && c.stat_vitality >= 10 && c.stat_spirit >= 10 },
  { id: 'stat_25',    name: 'Well-Rounded',       emoji: '🎯', description: 'All 4 stats at 25+',     check: (c) => c.stat_strength >= 25 && c.stat_wisdom >= 25 && c.stat_vitality >= 25 && c.stat_spirit >= 25, hidden: true },

  // Completions
  { id: 'comp_50',    name: 'Getting Hooked',     emoji: '🎣', description: '50 total completions',    check: (_, x) => x.totalCompletions >= 50 },
  { id: 'comp_500',   name: 'Habitual',           emoji: '🧠', description: '500 total completions',   check: (_, x) => x.totalCompletions >= 500 },

  // Ascension
  { id: 'ascend_1',   name: 'Reborn',             emoji: '🔄', description: 'First ascension',         check: (c) => c.ascension_level >= 1 },

  // HP
  { id: 'full_hp',    name: 'Invincible',         emoji: '💚', description: 'Reach 100 HP after being below 30', check: (c) => c.hp >= 100 && c.longest_streak > 0 },

  // Perfect
  { id: 'perfect_7',  name: 'Flawless Week',      emoji: '🌟', description: '7 perfect days',          check: (_, x) => x.perfectDays >= 7 },
]

export function checkAchievements(
  char: HabitCharacter,
  unlocked: Set<string>,
  context: AchievementContext,
): string[] {
  const newlyUnlocked: string[] = []
  for (const ach of ACHIEVEMENTS) {
    if (unlocked.has(ach.id)) continue
    if (ach.check(char, context)) {
      newlyUnlocked.push(ach.id)
    }
  }
  return newlyUnlocked
}
