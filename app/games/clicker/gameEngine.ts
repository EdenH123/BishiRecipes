// ══════════════════════════════════════════════
// Cooking Empire — Game Engine
// ══════════════════════════════════════════════

import {
  GENERATORS, UPGRADES, ACHIEVEMENTS, RESEARCH,
  PRESTIGE_UNLOCK_EARNED, PRESTIGE_FORMULA_BASE,
  MAX_OFFLINE_SECONDS, BASE_OFFLINE_RATE,
  SAVE_KEY,
  type UpgradeEffect, type AchievementCondition,
} from './gameConfig'

// ── Game State ──
export interface GameState {
  coins: number
  totalEarned: number
  totalClicks: number
  generators: Record<string, number>   // id → count
  upgrades: Set<string>                // purchased upgrade ids
  achievements: Set<string>            // unlocked achievement ids
  research: Set<string>                // purchased research ids
  prestigePoints: number               // current spendable
  totalPrestigeEarned: number          // lifetime total
  prestigeCount: number                // number of resets
  lastTick: number                     // timestamp for offline calc
  startedAt: number
}

export function newGameState(): GameState {
  return {
    coins: 0,
    totalEarned: 0,
    totalClicks: 0,
    generators: {},
    upgrades: new Set(),
    achievements: new Set(),
    research: new Set(),
    prestigePoints: 0,
    totalPrestigeEarned: 0,
    prestigeCount: 0,
    lastTick: Date.now(),
    startedAt: Date.now(),
  }
}

// ── Serialization ──
interface SaveData {
  coins: number
  totalEarned: number
  totalClicks: number
  generators: Record<string, number>
  upgrades: string[]
  achievements: string[]
  research: string[]
  prestigePoints: number
  totalPrestigeEarned: number
  prestigeCount: number
  lastTick: number
  startedAt: number
  version: number
}

const SAVE_VERSION = 1

export function saveGame(state: GameState): void {
  if (typeof window === 'undefined') return
  const data: SaveData = {
    coins: state.coins,
    totalEarned: state.totalEarned,
    totalClicks: state.totalClicks,
    generators: state.generators,
    upgrades: Array.from(state.upgrades),
    achievements: Array.from(state.achievements),
    research: Array.from(state.research),
    prestigePoints: state.prestigePoints,
    totalPrestigeEarned: state.totalPrestigeEarned,
    prestigeCount: state.prestigeCount,
    lastTick: Date.now(),
    startedAt: state.startedAt,
    version: SAVE_VERSION,
  }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)) } catch {}
}

export function loadGame(): { state: GameState; offlineSeconds: number } {
  const fresh = newGameState()
  if (typeof window === 'undefined') return { state: fresh, offlineSeconds: 0 }
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return { state: fresh, offlineSeconds: 0 }
    const data: SaveData = JSON.parse(raw)
    const state: GameState = {
      coins: data.coins || 0,
      totalEarned: data.totalEarned || 0,
      totalClicks: data.totalClicks || 0,
      generators: data.generators || {},
      upgrades: new Set(data.upgrades || []),
      achievements: new Set(data.achievements || []),
      research: new Set(data.research || []),
      prestigePoints: data.prestigePoints || 0,
      totalPrestigeEarned: data.totalPrestigeEarned || 0,
      prestigeCount: data.prestigeCount || 0,
      lastTick: data.lastTick || Date.now(),
      startedAt: data.startedAt || Date.now(),
    }
    const offlineSeconds = Math.min(
      Math.max(0, (Date.now() - state.lastTick) / 1000),
      MAX_OFFLINE_SECONDS
    )
    return { state, offlineSeconds }
  } catch {
    return { state: fresh, offlineSeconds: 0 }
  }
}

export function resetSave(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(SAVE_KEY) } catch {}
}

// ── Calculations ──

/** Get the cost of the next unit of a generator */
export function getGeneratorCost(genId: string, owned: number): number {
  const def = GENERATORS.find(g => g.id === genId)
  if (!def) return Infinity
  return Math.floor(def.baseCost * Math.pow(def.costMultiplier, owned))
}

/** Get cost to buy N more of a generator */
export function getGeneratorBulkCost(genId: string, owned: number, count: number): number {
  let total = 0
  for (let i = 0; i < count; i++) {
    total += getGeneratorCost(genId, owned + i)
  }
  return total
}

/** Calculate the multiplier from upgrades + research + achievements for a specific effect type */
function collectMultiplier(state: GameState, targetType: string, generatorId?: string): number {
  let mult = 1

  // Upgrades
  for (const uid of Array.from(state.upgrades)) {
    const def = UPGRADES.find(u => u.id === uid)
    if (!def) continue
    const e = def.effect
    if (e.type === targetType) {
      if (e.type === 'generator_multiply' && e.generatorId !== generatorId) continue
      mult *= e.value
    }
  }

  // Research (persists through prestige)
  for (const rid of Array.from(state.research)) {
    const def = RESEARCH.find(r => r.id === rid)
    if (!def) continue
    const e = def.effect
    if (e.type === targetType) {
      if (e.type === 'generator_multiply' && e.generatorId !== generatorId) continue
      mult *= e.value
    }
  }

  return mult
}

function collectAdditive(state: GameState, targetType: string): number {
  let total = 0
  for (const uid of Array.from(state.upgrades)) {
    const def = UPGRADES.find(u => u.id === uid)
    if (!def) continue
    if (def.effect.type === targetType) total += def.effect.value
  }
  for (const rid of Array.from(state.research)) {
    const def = RESEARCH.find(r => r.id === rid)
    if (!def) continue
    if (def.effect.type === targetType) total += def.effect.value
  }
  return total
}

/** Get achievement multiplier */
function getAchievementMultiplier(state: GameState, type: 'multiply_all' | 'multiply_click'): number {
  let mult = 1
  for (const aid of Array.from(state.achievements)) {
    const def = ACHIEVEMENTS.find(a => a.id === aid)
    if (!def) continue
    if (def.reward.type === type) mult *= def.reward.value
  }
  return mult
}

/** Get click value */
export function getClickValue(state: GameState): number {
  const baseClick = 1
  const clickMult = collectMultiplier(state, 'click_multiply')
  const achievementMult = getAchievementMultiplier(state, 'multiply_click')
  const prestigeMult = 1 + state.totalPrestigeEarned * 0.01  // 1% per prestige point ever earned
  return baseClick * clickMult * achievementMult * prestigeMult
}

/** Get critical click info */
export function getCritInfo(state: GameState): { chance: number; multiplier: number } {
  const chance = Math.min(collectAdditive(state, 'crit_chance'), 0.75)  // cap at 75%
  const multiplier = Math.max(collectMultiplier(state, 'crit_multiply'), 3)  // min 3x crit
  return { chance, multiplier }
}

/** Get income per second for a specific generator */
export function getGeneratorIncome(state: GameState, genId: string): number {
  const def = GENERATORS.find(g => g.id === genId)
  if (!def) return 0
  const count = state.generators[genId] || 0
  if (count === 0) return 0
  const genMult = collectMultiplier(state, 'generator_multiply', genId)
  const allMult = collectMultiplier(state, 'all_multiply')
  const achievementMult = getAchievementMultiplier(state, 'multiply_all')
  const prestigeMult = 1 + state.totalPrestigeEarned * 0.01
  return count * def.baseIncome * genMult * allMult * achievementMult * prestigeMult
}

/** Get total coins per second */
export function getTotalCPS(state: GameState): number {
  let total = 0
  for (const gen of GENERATORS) {
    total += getGeneratorIncome(state, gen.id)
  }
  return total
}

/** Get offline earnings multiplier */
export function getOfflineMultiplier(state: GameState): number {
  return BASE_OFFLINE_RATE * collectMultiplier(state, 'offline_multiply')
}

/** Calculate offline earnings */
export function calcOfflineEarnings(state: GameState, seconds: number): number {
  const cps = getTotalCPS(state)
  const offlineMult = getOfflineMultiplier(state)
  return cps * seconds * offlineMult
}

// ── Actions ──

/** Process a click. Returns the coins gained and whether it was critical. */
export function processClick(state: GameState): { gained: number; isCrit: boolean } {
  const base = getClickValue(state)
  const { chance, multiplier } = getCritInfo(state)
  const isCrit = Math.random() < chance
  const gained = isCrit ? base * multiplier : base

  state.coins += gained
  state.totalEarned += gained
  state.totalClicks++
  return { gained, isCrit }
}

/** Attempt to buy a generator. Returns true if successful. */
export function buyGenerator(state: GameState, genId: string, count: number = 1): boolean {
  const owned = state.generators[genId] || 0
  const cost = getGeneratorBulkCost(genId, owned, count)
  if (state.coins < cost) return false
  state.coins -= cost
  state.generators[genId] = owned + count
  return true
}

/** Attempt to buy an upgrade. Returns true if successful. */
export function buyUpgrade(state: GameState, upgradeId: string): boolean {
  if (state.upgrades.has(upgradeId)) return false
  const def = UPGRADES.find(u => u.id === upgradeId)
  if (!def) return false
  if (state.coins < def.cost) return false
  if (def.requires && !state.upgrades.has(def.requires)) return false
  state.coins -= def.cost
  state.upgrades.add(upgradeId)
  return true
}

/** Attempt to buy research. Returns true if successful. */
export function buyResearch(state: GameState, researchId: string): boolean {
  if (state.research.has(researchId)) return false
  const def = RESEARCH.find(r => r.id === researchId)
  if (!def) return false
  if (state.prestigePoints < def.cost) return false
  if (def.requires && !state.research.has(def.requires)) return false
  state.prestigePoints -= def.cost
  state.research.add(researchId)
  return true
}

/** Calculate prestige points that would be earned from current run */
export function calcPrestigeReward(state: GameState): number {
  if (state.totalEarned < PRESTIGE_UNLOCK_EARNED) return 0
  return Math.floor(Math.sqrt(state.totalEarned / PRESTIGE_FORMULA_BASE))
}

/** Can prestige? */
export function canPrestige(state: GameState): boolean {
  return calcPrestigeReward(state) > 0
}

/** Execute prestige. Returns points gained. */
export function doPrestige(state: GameState): number {
  const reward = calcPrestigeReward(state)
  if (reward <= 0) return 0

  // Keep: research, prestige points, prestige count, achievements, startedAt
  state.prestigePoints += reward
  state.totalPrestigeEarned += reward
  state.prestigeCount++

  // Reset run progress
  state.coins = 0
  state.totalEarned = 0
  state.totalClicks = 0
  state.generators = {}
  state.upgrades = new Set()
  state.lastTick = Date.now()

  return reward
}

/** Tick passive income. deltaMs = milliseconds since last tick. */
export function tick(state: GameState, deltaMs: number): number {
  const cps = getTotalCPS(state)
  const gained = cps * (deltaMs / 1000)
  state.coins += gained
  state.totalEarned += gained
  state.lastTick = Date.now()
  return gained
}

/** Check and unlock new achievements. Returns list of newly unlocked. */
export function checkAchievements(state: GameState): string[] {
  const cps = getTotalCPS(state)
  const totalGens = Object.values(state.generators).reduce((a, b) => a + b, 0)
  const newlyUnlocked: string[] = []

  for (const ach of ACHIEVEMENTS) {
    if (state.achievements.has(ach.id)) continue

    let met = false
    const c = ach.condition
    switch (c.type) {
      case 'total_earned':    met = state.totalEarned >= c.amount; break
      case 'total_clicks':    met = state.totalClicks >= c.amount; break
      case 'generator_count': met = (state.generators[c.generatorId] || 0) >= c.amount; break
      case 'total_generators': met = totalGens >= c.amount; break
      case 'cps':             met = cps >= c.amount; break
      case 'prestige_count':  met = state.prestigeCount >= c.amount; break
    }

    if (met) {
      state.achievements.add(ach.id)
      // Apply bonus coins reward immediately
      if (ach.reward.type === 'bonus_coins') {
        state.coins += ach.reward.value
        state.totalEarned += ach.reward.value
      }
      newlyUnlocked.push(ach.id)
    }
  }

  return newlyUnlocked
}

/** Get total generators owned */
export function getTotalGenerators(state: GameState): number {
  return Object.values(state.generators).reduce((a, b) => a + b, 0)
}
