// ══════════════════════════════════════════════════
// Habit RPG — Client-Side Rollover
// ══════════════════════════════════════════════════
// Runs on app open if last_rollover_date < today.
// Processes each missed day sequentially.

import * as db from './db'
import type { HabitCharacter, HabitDefinition } from './types'
import { DIFFICULTY_VALUES } from './types'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function isEndOfWeek(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDay() === 6 // Saturday
}

function getWeekStartForDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

export interface RolloverResult {
  daysProcessed: number
  totalHpChange: number
  streakBroke: boolean
  newStreak: number
}

export async function runCatchUpRollover(
  character: HabitCharacter,
  habits: HabitDefinition[],
  todayKey: string,
): Promise<RolloverResult> {
  const lastRollover = character.last_rollover_date || todayKey
  if (lastRollover >= todayKey) {
    return { daysProcessed: 0, totalHpChange: 0, streakBroke: false, newStreak: character.streak }
  }

  let hp = character.hp
  let streak = character.streak
  let longestStreak = character.longest_streak
  let recoveryActive = character.recovery_multiplier_active
  let freezeTokens = character.freeze_tokens
  let daysProcessed = 0
  let totalHpChange = 0
  let streakBroke = false

  const dailyHabits = habits.filter(h => h.frequency_type === 'daily' && h.is_active)

  // Process each day from last_rollover_date+1 to yesterday
  let day = addDays(lastRollover, 1)
  const yesterday = addDays(todayKey, -1)

  while (day <= yesterday) {
    daysProcessed++

    // Check freeze for this day
    const freeze = await db.getFreezeForDate(character.user_id, day)
    const freezeUsed = !!freeze

    // Get completions for this day
    const completions = await db.getCompletionsForDate(character.user_id, day)
    const completedIds = new Set(completions.map(c => c.habit_id))

    let dayHpChange = 0
    let perfectDay = true

    // HP penalties for missed daily habits
    for (const habit of dailyHabits) {
      if (!completedIds.has(habit.id)) {
        perfectDay = false
        if (!freezeUsed) {
          const penalty = DIFFICULTY_VALUES[habit.difficulty].hpPenalty
          dayHpChange -= penalty
        }
      }
    }

    // Perfect Day heal
    if (perfectDay && dailyHabits.length > 0) {
      dayHpChange += 10
    }

    // Weekly boundary check
    if (isEndOfWeek(day)) {
      const weekStart = getWeekStartForDate(day)
      const weekEnd = day
      const weekCompletions = await db.getCompletionsForDateRange(character.user_id, weekStart, weekEnd)

      const weeklyHabits = habits.filter(h =>
        (h.frequency_type === 'weekly' || h.frequency_type === 'x_per_week') && h.is_active
      )

      for (const habit of weeklyHabits) {
        const count = weekCompletions.filter(c => c.habit_id === habit.id).length
        const required = habit.frequency_value
        if (count < required && !freezeUsed) {
          dayHpChange -= 20
        }
      }
    }

    // Streak
    const totalCompletions = completions.length
    if (totalCompletions === 0 && !freezeUsed) {
      if (streak > 0) {
        recoveryActive = true
        streakBroke = true
      }
      streak = 0
    } else if (totalCompletions > 0) {
      streak++
    }

    longestStreak = Math.max(longestStreak, streak)

    // Comeback multiplier clears at streak 7
    if (recoveryActive && streak >= 7) {
      recoveryActive = false
    }

    // Freeze token grant (1st of month)
    const dayDate = new Date(day + 'T00:00:00')
    if (dayDate.getDate() === 1) {
      freezeTokens = Math.min(freezeTokens + 1, 3)
    }

    // Apply HP
    hp = Math.max(0, Math.min(100, hp + dayHpChange))
    totalHpChange += dayHpChange

    // Log
    await db.upsertDailyLog(character.user_id, {
      date_key: day,
      total_habits: dailyHabits.length,
      completed_habits: completedIds.size,
      hp_change: dayHpChange,
      xp_earned: completions.reduce((sum, c) => sum + c.xp_earned, 0),
      streak_value: streak,
      freeze_used: freezeUsed,
    })

    day = addDays(day, 1)
  }

  // Update character
  if (daysProcessed > 0) {
    await db.updateCharacter(character.id, {
      hp,
      streak,
      longest_streak: longestStreak,
      recovery_multiplier_active: recoveryActive,
      freeze_tokens: freezeTokens,
      last_rollover_date: yesterday,
    })
  }

  return { daysProcessed, totalHpChange, streakBroke, newStreak: streak }
}
