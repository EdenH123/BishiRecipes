'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import * as db from './db'
import type { HabitCharacter, HabitDefinition, HabitCompletion, NewHabit, UpdateHabit, Stat } from './types'
import { DIFFICULTY_VALUES, FREQUENCY_MULTIPLIERS } from './types'
import { getLevelForXP, getTier, LEVELS as LEVELS_IMPORT } from './levels'
import { runCatchUpRollover, type RolloverResult } from './rollover'
import { checkAchievements as checkAch, type AchievementContext } from './achievements'

// ── Date helpers ──

export function todayKey(tz: string = 'Asia/Jerusalem'): string {
  const d = new Date()
  const formatted = d.toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD
  return formatted
}

export function weekStart(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().split('T')[0]
}

export function weekEnd(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() + (6 - day))
  return d.toISOString().split('T')[0]
}

// ── Hook Return Type ──

export interface HabitEngine {
  // State
  loading: boolean
  userId: string | null
  character: HabitCharacter | null
  habits: HabitDefinition[]
  todayCompletions: Map<string, HabitCompletion> // habitId → completion
  needsOnboarding: boolean

  // Derived
  isPerfectDay: boolean
  levelInfo: { level: number; xpIntoLevel: number; xpForNext: number; title: string }
  weeklyProgress: Map<string, number>  // habitId → completions this week
  justLeveledUp: boolean
  rolloverResult: RolloverResult | null
  todayFrozen: boolean

  // Actions
  createNewCharacter: (name: string) => Promise<void>
  completeHabit: (habitId: string) => Promise<void>
  undoCompletion: (habitId: string) => Promise<void>
  addHabit: (data: NewHabit) => Promise<void>
  editHabit: (id: string, updates: UpdateHabit) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  activateFreeze: () => Promise<void>
  ascend: () => Promise<void>
  resetAll: () => Promise<void>
  unlockedAchievements: Set<string>
  newAchievement: string | null
  dismissAchievement: () => void
  refresh: () => Promise<void>
  clearLevelUp: () => void
  dismissRollover: () => void
}

export function useHabitEngine(): HabitEngine {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [character, setCharacter] = useState<HabitCharacter | null>(null)
  const [habits, setHabits] = useState<HabitDefinition[]>([])
  const [todayCompletions, setTodayCompletions] = useState<Map<string, HabitCompletion>>(new Map())
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [weeklyCompletions, setWeeklyCompletions] = useState<HabitCompletion[]>([])
  const [justLeveledUp, setJustLeveledUp] = useState(false)
  const [rolloverResult, setRolloverResult] = useState<RolloverResult | null>(null)
  const [todayFrozen, setTodayFrozen] = useState(false)
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set())
  const [newAchievement, setNewAchievement] = useState<string | null>(null)

  // ── Initial Load ──
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const char = await db.getCharacter(user.id)
      if (!char) {
        setNeedsOnboarding(true)
        setLoading(false)
        return
      }

      setCharacter(char)
      setNeedsOnboarding(false)

      const today = todayKey(char.timezone)
      const wStart = weekStart(today)
      const wEnd = weekEnd(today)

      const [habitList, completions, weekComps] = await Promise.all([
        db.getHabits(user.id),
        db.getCompletionsForDate(user.id, today),
        db.getCompletionsForDateRange(user.id, wStart, wEnd),
      ])

      setHabits(habitList)
      setWeeklyCompletions(weekComps)
      const map = new Map<string, HabitCompletion>()
      for (const c of completions) map.set(c.habit_id, c)
      setTodayCompletions(map)
      setJustLeveledUp(false)

      // Run catch-up rollover if needed
      if (char.last_rollover_date && char.last_rollover_date < today) {
        const result = await runCatchUpRollover(char, habitList, today)
        if (result.daysProcessed > 0) {
          setRolloverResult(result)
          // Reload character after rollover updated it
          const updated = await db.getCharacter(user.id)
          if (updated) setCharacter(updated)
        }
      }

      // Check if today is frozen
      const freeze = await db.getFreezeForDate(user.id, today)
      setTodayFrozen(!!freeze)

      // Load achievements
      const achs = await db.getAchievements(user.id)
      setUnlockedAchievements(new Set(achs.map(a => a.achievement_id)))
    } catch (err) {
      console.error('Habit engine load error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Actions ──

  const createNewCharacter = useCallback(async (name: string) => {
    if (!userId) return
    const char = await db.createCharacter(userId, name)
    setCharacter(char)
    setNeedsOnboarding(false)
  }, [userId])

  const completeHabit = useCallback(async (habitId: string) => {
    if (!character || !userId) return
    if (todayCompletions.has(habitId)) return // already done

    const habit = habits.find(h => h.id === habitId)
    if (!habit) return

    const diff = DIFFICULTY_VALUES[habit.difficulty]
    const freqMult = FREQUENCY_MULTIPLIERS[habit.frequency_type]
    const recoveryMult = character.recovery_multiplier_active ? 2 : 1
    const ascensionMult = 1 + character.ascension_level * 0.1

    const xp = Math.round(diff.xp * freqMult * recoveryMult * ascensionMult)
    const coins = Math.round(diff.coins * freqMult * recoveryMult)

    const statsEarned: Record<string, number> = { [habit.stat_primary]: 1 }
    if (habit.stat_secondary) statsEarned[habit.stat_secondary] = 1

    // Insert completion
    const completion = await db.insertCompletion(userId, habitId, todayKey(character.timezone), xp, coins, statsEarned)

    // Update character
    const statUpdates: Record<string, number> = {}
    statUpdates[`stat_${habit.stat_primary}`] = (character[`stat_${habit.stat_primary}` as keyof HabitCharacter] as number) + 1
    if (habit.stat_secondary) {
      statUpdates[`stat_${habit.stat_secondary}`] = (character[`stat_${habit.stat_secondary}` as keyof HabitCharacter] as number) + 1
    }

    const newXp = character.xp + xp
    const newCoins = character.coins + coins
    const updates: Record<string, unknown> = {
      xp: newXp,
      coins: newCoins,
      last_active_date: todayKey(character.timezone),
      ...statUpdates,
    }

    // Level-up check
    const oldLevel = getLevelForXP(character.xp)
    const newLevel = getLevelForXP(newXp)
    if (newLevel.level > oldLevel.level) {
      updates.level = newLevel.level
      updates.avatar_config = { ...character.avatar_config, tier: getTier(newLevel.level) }
      setJustLeveledUp(true)
    }

    // Perfect Day check: all daily habits completed after this one
    const dailyHabits = habits.filter(h => h.frequency_type === 'daily')
    const completedAfterThis = new Set(todayCompletions.keys())
    completedAfterThis.add(habitId)
    const isPerfect = dailyHabits.length > 0 && dailyHabits.every(h => completedAfterThis.has(h.id))
    if (isPerfect) {
      const healedHp = Math.min((character.hp || 0) + 10, 100)
      updates.hp = healedHp
    }

    // Perfect Day bonus XP/coins
    if (isPerfect) {
      updates.xp = (updates.xp as number) + 20
      updates.coins = (updates.coins as number) + 10
    }

    await db.updateCharacter(character.id, updates as Parameters<typeof db.updateCharacter>[1])

    setCharacter(prev => prev ? { ...prev, ...updates } as HabitCharacter : null)
    setTodayCompletions(prev => {
      const next = new Map(prev)
      next.set(habitId, completion)
      return next
    })
    setWeeklyCompletions(prev => [...prev, completion])

    // Check achievements
    const updatedChar = { ...character, ...updates } as HabitCharacter
    const ctx: AchievementContext = { totalCompletions: todayCompletions.size + 1, totalHabits: habits.length, perfectDays: 0 }
    const newAchs = checkAch(updatedChar, unlockedAchievements, ctx)
    for (const achId of newAchs) {
      await db.unlockAchievement(userId, achId)
      setUnlockedAchievements(prev => { const next = new Set(prev); next.add(achId); return next })
      setNewAchievement(achId)
    }
  }, [character, userId, habits, todayCompletions, unlockedAchievements])

  const undoCompletion = useCallback(async (habitId: string) => {
    if (!character || !userId) return
    const completion = todayCompletions.get(habitId)
    if (!completion) return

    await db.deleteCompletion(completion.id)

    // Reverse character changes
    const updates: Record<string, unknown> = {
      xp: Math.max(0, character.xp - completion.xp_earned),
      coins: Math.max(0, character.coins - completion.coins_earned),
    }
    for (const [stat, val] of Object.entries(completion.stats_earned)) {
      const key = `stat_${stat}` as keyof HabitCharacter
      updates[key] = Math.max(0, (character[key] as number) - val)
    }

    await db.updateCharacter(character.id, updates as Parameters<typeof db.updateCharacter>[1])

    setCharacter(prev => prev ? { ...prev, ...updates } as HabitCharacter : null)
    setTodayCompletions(prev => {
      const next = new Map(prev)
      next.delete(habitId)
      return next
    })
  }, [character, userId, todayCompletions])

  const addHabit = useCallback(async (data: NewHabit) => {
    if (!userId) return
    const habit = await db.createHabit(userId, data)
    setHabits(prev => [...prev, habit])
  }, [userId])

  const editHabit = useCallback(async (id: string, updates: Partial<HabitDefinition>) => {
    if (!userId) return
    await db.updateHabit(id, updates)
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }, [userId])

  const ascend = useCallback(async () => {
    if (!character || !userId) return
    const newAscension = character.ascension_level + 1
    await db.updateCharacter(character.id, {
      level: 1,
      xp: 0,
      ascension_level: newAscension,
      avatar_config: { ...character.avatar_config, tier: 1 },
    })
    setCharacter(prev => prev ? { ...prev, level: 1, xp: 0, ascension_level: newAscension, avatar_config: { ...prev.avatar_config, tier: 1 } } : null)
    // Check ascension achievement
    const updatedChar = { ...character, ascension_level: newAscension } as HabitCharacter
    const newAchs = checkAch(updatedChar, unlockedAchievements, { totalCompletions: 0, totalHabits: habits.length, perfectDays: 0 })
    for (const achId of newAchs) {
      await db.unlockAchievement(userId, achId)
      setUnlockedAchievements(prev => { const next = new Set(prev); next.add(achId); return next })
      setNewAchievement(achId)
    }
  }, [character, userId, habits, unlockedAchievements])

  const resetAll = useCallback(async () => {
    if (!userId) return
    // Delete all habit-rpg data for this user
    const supabase = (await import('@/lib/supabase')).createClient()
    await supabase.from('habit_completions').delete().eq('user_id', userId)
    await supabase.from('habit_definitions').delete().eq('user_id', userId)
    await supabase.from('habit_daily_logs').delete().eq('user_id', userId)
    await supabase.from('habit_freeze_used').delete().eq('user_id', userId)
    await supabase.from('habit_achievements').delete().eq('user_id', userId)
    await supabase.from('habit_inventory').delete().eq('user_id', userId)
    await supabase.from('habit_characters').delete().eq('user_id', userId)
    setCharacter(null)
    setHabits([])
    setTodayCompletions(new Map())
    setWeeklyCompletions([])
    setUnlockedAchievements(new Set())
    setNeedsOnboarding(true)
  }, [userId])

  const activateFreeze = useCallback(async () => {
    if (!character || !userId || todayFrozen) return
    if (character.freeze_tokens <= 0) return
    const today = todayKey(character.timezone)
    await db.insertFreeze(userId, today)
    await db.updateCharacter(character.id, { freeze_tokens: character.freeze_tokens - 1 })
    setCharacter(prev => prev ? { ...prev, freeze_tokens: prev.freeze_tokens - 1 } : null)
    setTodayFrozen(true)
  }, [character, userId, todayFrozen])

  const deleteHabit = useCallback(async (id: string) => {
    await db.softDeleteHabit(id)
    setHabits(prev => prev.filter(h => h.id !== id))
  }, [])

  // ── Derived values ──
  const dailyHabits = habits.filter(h => h.frequency_type === 'daily')
  const isPerfectDay = dailyHabits.length > 0 && dailyHabits.every(h => todayCompletions.has(h.id))

  const levelInfo = character ? (() => {
    const info = getLevelForXP(character.xp)
    const def = LEVELS_IMPORT[Math.min(info.level, 10) - 1]
    return { ...info, title: def?.title ?? 'Novice' }
  })() : { level: 1, xpIntoLevel: 0, xpForNext: 50, title: 'Novice' }

  const weeklyProgress = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of weeklyCompletions) {
      map.set(c.habit_id, (map.get(c.habit_id) || 0) + 1)
    }
    return map
  }, [weeklyCompletions])

  return {
    loading, userId, character, habits, todayCompletions, needsOnboarding,
    isPerfectDay, levelInfo, weeklyProgress, justLeveledUp,
    rolloverResult, todayFrozen,
    createNewCharacter, completeHabit, undoCompletion, addHabit, editHabit, deleteHabit,
    activateFreeze, ascend, resetAll,
    unlockedAchievements, newAchievement, dismissAchievement: () => setNewAchievement(null),
    refresh: loadAll, clearLevelUp: () => setJustLeveledUp(false),
    dismissRollover: () => setRolloverResult(null),
  }
}
