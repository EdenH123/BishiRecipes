// ══════════════════════════════════════════════════
// Habit RPG — TypeScript Types
// ══════════════════════════════════════════════════

// ── Enums (mirror CHECK constraints in DB) ──

export const CATEGORIES = ['workout', 'hygiene', 'self-development', 'mindfulness', 'relationships', 'nutrition'] as const
export type Category = typeof CATEGORIES[number]

export const STATS = ['strength', 'wisdom', 'vitality', 'spirit'] as const
export type Stat = typeof STATS[number]

export const FREQUENCY_TYPES = ['daily', 'weekly', 'x_per_week', 'monthly'] as const
export type FrequencyType = typeof FREQUENCY_TYPES[number]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = typeof DIFFICULTIES[number]

// Category → primary stat mapping (default, user can override)
export const CATEGORY_STAT_MAP: Record<Category, Stat> = {
  workout: 'strength',
  hygiene: 'vitality',
  'self-development': 'wisdom',
  mindfulness: 'spirit',
  relationships: 'spirit',
  nutrition: 'vitality',
}

export const CATEGORY_META: Record<Category, { label: string; emoji: string }> = {
  workout: { label: 'Workout', emoji: '💪' },
  hygiene: { label: 'Hygiene', emoji: '🚿' },
  'self-development': { label: 'Self-Development', emoji: '📚' },
  mindfulness: { label: 'Mindfulness', emoji: '🧘' },
  relationships: { label: 'Relationships', emoji: '❤️' },
  nutrition: { label: 'Nutrition', emoji: '🥗' },
}

export const STAT_META: Record<Stat, { label: string; icon: string }> = {
  strength: { label: 'Strength', icon: '⚔️' },
  wisdom: { label: 'Wisdom', icon: '📚' },
  vitality: { label: 'Vitality', icon: '❤️' },
  spirit: { label: 'Spirit', icon: '✨' },
}

// ── Difficulty → reward/penalty mapping ──

export const DIFFICULTY_VALUES: Record<Difficulty, { xp: number; coins: number; hpPenalty: number }> = {
  easy:   { xp: 5,  coins: 3,  hpPenalty: 5 },
  medium: { xp: 10, coins: 5,  hpPenalty: 10 },
  hard:   { xp: 20, coins: 10, hpPenalty: 20 },
}

// Frequency multipliers for weekly/monthly
export const FREQUENCY_MULTIPLIERS: Record<FrequencyType, number> = {
  daily: 1,
  weekly: 2.5,
  x_per_week: 1,  // same as daily per completion
  monthly: 5,
}

// ── DB Row Types ──

export interface HabitCharacter {
  id: string
  user_id: string
  name: string
  level: number
  xp: number
  hp: number
  coins: number
  stat_strength: number
  stat_wisdom: number
  stat_vitality: number
  stat_spirit: number
  streak: number
  longest_streak: number
  last_active_date: string | null
  last_rollover_date: string | null
  freeze_tokens: number
  ascension_level: number
  recovery_multiplier_active: boolean
  timezone: string
  avatar_config: AvatarConfig
  created_at: string
}

export interface AvatarConfig {
  tier: number
  equipped?: Record<string, string>  // slot → item_id
}

export interface HabitDefinition {
  id: string
  user_id: string
  title: string
  emoji: string
  category: Category
  stat_primary: Stat
  stat_secondary: Stat | null
  frequency_type: FrequencyType
  frequency_value: number
  frequency_day: number | null
  difficulty: Difficulty
  is_active: boolean
  sort_order: number
  depends_on: string | null
  created_at: string
}

export interface HabitCompletion {
  id: string
  user_id: string
  habit_id: string
  completed_at: string
  date_key: string
  xp_earned: number
  coins_earned: number
  stats_earned: Record<Stat, number>
}

export interface HabitFreezeUsed {
  id: string
  user_id: string
  date_key: string
  activated_at: string
}

export interface HabitDailyLog {
  id: string
  user_id: string
  date_key: string
  total_habits: number
  completed_habits: number
  hp_change: number
  xp_earned: number
  streak_value: number
  freeze_used: boolean
}

export interface HabitAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
}

export interface HabitInventoryItem {
  id: string
  user_id: string
  item_id: string
  equipped: boolean
  purchased_at: string
}

// ── Input types for mutations ──

export type NewHabit = Pick<HabitDefinition,
  'title' | 'emoji' | 'category' | 'stat_primary' | 'difficulty' | 'frequency_type'
> & {
  stat_secondary?: Stat | null
  frequency_value?: number
  frequency_day?: number | null
}

export type UpdateHabit = Partial<Pick<HabitDefinition,
  'title' | 'emoji' | 'category' | 'stat_primary' | 'stat_secondary' |
  'difficulty' | 'frequency_type' | 'frequency_value' | 'frequency_day' |
  'is_active' | 'sort_order'
>>
