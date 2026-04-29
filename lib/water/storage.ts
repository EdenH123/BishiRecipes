// ══════════════════════════════════════════════
// Water Tracker — Storage & Helpers
// ══════════════════════════════════════════════

import { DEFAULT_DRINKS, DEFAULT_GOAL_ML, STORAGE_KEY, HISTORY_DAYS_TO_KEEP } from './constants'
import type { DrinkType, DrinkEntry, WaterState, DateKey } from './types'

// ── Date helpers ──
export function dateKey(d: Date = new Date()): DateKey {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dateKeyFromTimestamp(ts: number): DateKey {
  return dateKey(new Date(ts))
}

export function lastNDays(n: number): DateKey[] {
  const out: DateKey[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push(dateKey(d))
  }
  return out
}

// ── State management ──
export function newWaterState(): WaterState {
  return {
    dailyGoalMl: DEFAULT_GOAL_ML,
    customDrinks: [],
    entries: {},
    lastReachedGoal: null,
    streak: 0,
    bestDay: null,
  }
}

export function loadState(): WaterState {
  if (typeof window === 'undefined') return newWaterState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return newWaterState()
    const data = JSON.parse(raw)
    const fresh = newWaterState()
    return {
      dailyGoalMl: data.dailyGoalMl ?? fresh.dailyGoalMl,
      customDrinks: data.customDrinks ?? [],
      entries: pruneOldEntries(data.entries ?? {}),
      lastReachedGoal: data.lastReachedGoal ?? null,
      streak: data.streak ?? 0,
      bestDay: data.bestDay ?? null,
    }
  } catch {
    return newWaterState()
  }
}

export function saveState(state: WaterState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

function pruneOldEntries(entries: Record<DateKey, DrinkEntry[]>): Record<DateKey, DrinkEntry[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - HISTORY_DAYS_TO_KEEP)
  const cutoffKey = dateKey(cutoff)
  const result: Record<DateKey, DrinkEntry[]> = {}
  for (const [key, list] of Object.entries(entries)) {
    if (key >= cutoffKey) result[key] = list
  }
  return result
}

// ── Calculations ──
export function getAllDrinks(state: WaterState): DrinkType[] {
  return [...DEFAULT_DRINKS, ...state.customDrinks]
}

export function findDrink(state: WaterState, typeId: string): DrinkType | undefined {
  return getAllDrinks(state).find(d => d.id === typeId)
}

export function getEntriesForDate(state: WaterState, key: DateKey): DrinkEntry[] {
  return state.entries[key] ?? []
}

/** Total ml drunk on a given day (raw, not hydration-adjusted) */
export function totalMl(entries: DrinkEntry[]): number {
  return entries.reduce((sum, e) => sum + e.ml, 0)
}

/** Hydration-adjusted ml (coffee counts less) */
export function hydrationMl(state: WaterState, entries: DrinkEntry[]): number {
  return entries.reduce((sum, e) => {
    const drink = findDrink(state, e.typeId)
    const factor = drink?.hydrationFactor ?? 1
    return sum + e.ml * factor
  }, 0)
}

export function progressPercent(currentMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0
  return Math.min(100, (currentMl / goalMl) * 100)
}

// ── Mutations ──
export function addEntry(state: WaterState, entry: Omit<DrinkEntry, 'id'>): WaterState {
  const id = `${entry.timestamp}_${Math.random().toString(36).slice(2, 7)}`
  const key = dateKeyFromTimestamp(entry.timestamp)
  const list = [...(state.entries[key] ?? []), { ...entry, id }]
  return { ...state, entries: { ...state.entries, [key]: list } }
}

export function removeEntry(state: WaterState, entryId: string): WaterState {
  const next = { ...state.entries }
  for (const [key, list] of Object.entries(next)) {
    const filtered = list.filter(e => e.id !== entryId)
    if (filtered.length !== list.length) {
      next[key] = filtered
      break
    }
  }
  return { ...state, entries: next }
}

export function updateGoal(state: WaterState, goalMl: number): WaterState {
  return { ...state, dailyGoalMl: goalMl }
}

export function addCustomDrink(state: WaterState, drink: DrinkType): WaterState {
  return { ...state, customDrinks: [...state.customDrinks, drink] }
}

export function removeCustomDrink(state: WaterState, drinkId: string): WaterState {
  return { ...state, customDrinks: state.customDrinks.filter(d => d.id !== drinkId) }
}

export function resetAllData(): WaterState {
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }
  return newWaterState()
}

// ── Stats ──
export function calcStreak(state: WaterState): number {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = dateKey(d)
    const ml = hydrationMl(state, getEntriesForDate(state, key))
    if (ml >= state.dailyGoalMl) streak++
    else if (i > 0) break // allow today to not yet be reached
    else break
  }
  return streak
}

export function calcBestDay(state: WaterState): { date: DateKey; ml: number } | null {
  let best: { date: DateKey; ml: number } | null = null
  for (const [date, entries] of Object.entries(state.entries)) {
    const ml = totalMl(entries)
    if (!best || ml > best.ml) best = { date, ml }
  }
  return best
}

export function weeklyTotals(state: WaterState): { date: DateKey; ml: number; hydrationMl: number }[] {
  return lastNDays(7).map(date => {
    const entries = getEntriesForDate(state, date)
    return { date, ml: totalMl(entries), hydrationMl: hydrationMl(state, entries) }
  })
}
