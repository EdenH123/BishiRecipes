// ══════════════════════════════════════════════
// Water Tracker — Type Definitions
// ══════════════════════════════════════════════

export interface DrinkType {
  id: string
  name: string         // "מים", "קפה"
  emoji: string        // 💧, ☕
  defaultMl: number    // 250, 150
  color: string        // hex color for chart
  hydrationFactor: number // 1 = full water, 0.8 = coffee, etc.
}

export interface DrinkEntry {
  id: string
  typeId: string
  ml: number
  timestamp: number    // Date.now()
}

export interface WaterState {
  dailyGoalMl: number              // 2000
  customDrinks: DrinkType[]        // user-added types (in addition to defaults)
  entries: Record<string, DrinkEntry[]>  // "2026-04-29" → entries
  lastReachedGoal: string | null   // last date goal reached (for celebration)
  streak: number                    // consecutive days hitting goal
  bestDay: { date: string; ml: number } | null
}

export type DateKey = string  // "YYYY-MM-DD"
