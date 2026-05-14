// ══════════════════════════════════════════════════
// Habit RPG — Supabase Client Wrapper
// ══════════════════════════════════════════════════
// Thin layer over Supabase queries. No business logic here —
// that lives in useHabitEngine. This is just typed DB access.

import { createClient } from '@/lib/supabase'
import type {
  HabitCharacter, HabitDefinition, HabitCompletion,
  HabitFreezeUsed, HabitDailyLog, HabitAchievement,
  HabitInventoryItem, NewHabit, UpdateHabit, AvatarConfig,
} from './types'

function supabase() {
  return createClient()
}

// ── Character ──

export async function getCharacter(userId: string): Promise<HabitCharacter | null> {
  const { data } = await supabase()
    .from('habit_characters')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data as HabitCharacter | null
}

export async function createCharacter(userId: string, name: string = 'Hero'): Promise<HabitCharacter> {
  const { data, error } = await supabase()
    .from('habit_characters')
    .insert({ user_id: userId, name })
    .select()
    .single()
  if (error) throw error
  return data as HabitCharacter
}

export async function updateCharacter(
  characterId: string,
  updates: Partial<Omit<HabitCharacter, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase()
    .from('habit_characters')
    .update(updates)
    .eq('id', characterId)
  if (error) throw error
}

// ── Habits ──

export async function getHabits(userId: string, activeOnly = true): Promise<HabitDefinition[]> {
  let query = supabase()
    .from('habit_definitions')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as HabitDefinition[]
}

export async function createHabit(userId: string, habit: NewHabit): Promise<HabitDefinition> {
  const { data, error } = await supabase()
    .from('habit_definitions')
    .insert({
      user_id: userId,
      title: habit.title,
      emoji: habit.emoji,
      category: habit.category,
      stat_primary: habit.stat_primary,
      stat_secondary: habit.stat_secondary ?? null,
      frequency_type: habit.frequency_type,
      frequency_value: habit.frequency_value ?? 1,
      frequency_day: habit.frequency_day ?? null,
      difficulty: habit.difficulty,
    })
    .select()
    .single()
  if (error) throw error
  return data as HabitDefinition
}

export async function updateHabit(habitId: string, updates: UpdateHabit): Promise<void> {
  const { error } = await supabase()
    .from('habit_definitions')
    .update(updates)
    .eq('id', habitId)
  if (error) throw error
}

export async function softDeleteHabit(habitId: string): Promise<void> {
  await updateHabit(habitId, { is_active: false })
}

// ── Completions ──

export async function getCompletionsForDate(userId: string, dateKey: string): Promise<HabitCompletion[]> {
  const { data, error } = await supabase()
    .from('habit_completions')
    .select('*')
    .eq('user_id', userId)
    .eq('date_key', dateKey)
  if (error) throw error
  return (data ?? []) as HabitCompletion[]
}

export async function getCompletionsForDateRange(
  userId: string, startDate: string, endDate: string
): Promise<HabitCompletion[]> {
  const { data, error } = await supabase()
    .from('habit_completions')
    .select('*')
    .eq('user_id', userId)
    .gte('date_key', startDate)
    .lte('date_key', endDate)
  if (error) throw error
  return (data ?? []) as HabitCompletion[]
}

export async function insertCompletion(
  userId: string, habitId: string, dateKey: string,
  xpEarned: number, coinsEarned: number, statsEarned: Record<string, number>
): Promise<HabitCompletion> {
  const { data, error } = await supabase()
    .from('habit_completions')
    .insert({
      user_id: userId,
      habit_id: habitId,
      date_key: dateKey,
      xp_earned: xpEarned,
      coins_earned: coinsEarned,
      stats_earned: statsEarned,
    })
    .select()
    .single()
  if (error) throw error
  return data as HabitCompletion
}

export async function deleteCompletion(completionId: string): Promise<void> {
  const { error } = await supabase()
    .from('habit_completions')
    .delete()
    .eq('id', completionId)
  if (error) throw error
}

// ── Freeze ──

export async function getFreezeForDate(userId: string, dateKey: string): Promise<HabitFreezeUsed | null> {
  const { data } = await supabase()
    .from('habit_freeze_used')
    .select('*')
    .eq('user_id', userId)
    .eq('date_key', dateKey)
    .single()
  return data as HabitFreezeUsed | null
}

export async function insertFreeze(userId: string, dateKey: string): Promise<void> {
  const { error } = await supabase()
    .from('habit_freeze_used')
    .insert({ user_id: userId, date_key: dateKey })
  if (error) throw error
}

// ── Daily Logs ──

export async function upsertDailyLog(userId: string, log: Omit<HabitDailyLog, 'id' | 'user_id'>): Promise<void> {
  const { error } = await supabase()
    .from('habit_daily_logs')
    .upsert({
      user_id: userId,
      ...log,
    }, { onConflict: 'user_id,date_key' })
  if (error) throw error
}

export async function getDailyLogs(userId: string, limit = 30): Promise<HabitDailyLog[]> {
  const { data, error } = await supabase()
    .from('habit_daily_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date_key', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as HabitDailyLog[]
}

// ── Achievements ──

export async function getAchievements(userId: string): Promise<HabitAchievement[]> {
  const { data, error } = await supabase()
    .from('habit_achievements')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as HabitAchievement[]
}

export async function unlockAchievement(userId: string, achievementId: string): Promise<void> {
  const { error } = await supabase()
    .from('habit_achievements')
    .insert({ user_id: userId, achievement_id: achievementId })
  if (error && !error.message.includes('duplicate')) throw error
}

// ── Inventory ──

export async function getInventory(userId: string): Promise<HabitInventoryItem[]> {
  const { data, error } = await supabase()
    .from('habit_inventory')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as HabitInventoryItem[]
}

export async function buyItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase()
    .from('habit_inventory')
    .insert({ user_id: userId, item_id: itemId })
  if (error) throw error
}

export async function equipItem(itemId: string, equipped: boolean): Promise<void> {
  const { error } = await supabase()
    .from('habit_inventory')
    .update({ equipped })
    .eq('id', itemId)
  if (error) throw error
}
