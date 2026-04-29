// ══════════════════════════════════════════════
// Water Tracker — Constants
// ══════════════════════════════════════════════

import type { DrinkType } from './types'

export const DEFAULT_DRINKS: DrinkType[] = [
  { id: 'water',  name: 'כוס מים',    emoji: '💧', defaultMl: 250, color: '#3b82f6', hydrationFactor: 1.0 },
  { id: 'bottle', name: 'בקבוק',      emoji: '🧴', defaultMl: 500, color: '#0ea5e9', hydrationFactor: 1.0 },
  { id: 'coffee', name: 'קפה',         emoji: '☕', defaultMl: 150, color: '#92400e', hydrationFactor: 0.6 },
  { id: 'tea',    name: 'תה',          emoji: '🍵', defaultMl: 200, color: '#16a34a', hydrationFactor: 0.9 },
  { id: 'juice',  name: 'מיץ',         emoji: '🧃', defaultMl: 200, color: '#f59e0b', hydrationFactor: 0.9 },
  { id: 'soda',   name: 'סודה',        emoji: '🥤', defaultMl: 330, color: '#ef4444', hydrationFactor: 0.7 },
]

export const DEFAULT_GOAL_ML = 2000
export const MIN_GOAL_ML = 500
export const MAX_GOAL_ML = 5000
export const GOAL_STEP_ML = 100

export const STORAGE_KEY = 'bishi_water_tracker'
export const HISTORY_DAYS_TO_KEEP = 90

// Custom amount quick picks
export const CUSTOM_AMOUNTS_ML = [100, 200, 250, 300, 500, 750, 1000]
