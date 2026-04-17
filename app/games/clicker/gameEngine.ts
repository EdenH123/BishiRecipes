// ══════════════════════════════════════════════════
// Culinary Empire — Game Engine (pure logic, no UI)
// ══════════════════════════════════════════════════

import {
  GENERATORS, UPGRADES, REPEATABLE_UPGRADES, ACHIEVEMENTS, RESEARCH, CHALLENGES,
  SYNERGY_THRESHOLD, SYNERGY_MULTIPLIER, SYNERGY_MAX_TIERS, GENERATOR_MAX_COUNT,
  PRESTIGE_DIVISOR, PRESTIGE_EXPONENT, PRESTIGE_RESEARCH_BONUS, PRESTIGE_SCALING,
  PRESTIGE_MILESTONES, PRESTIGE_GATED_GENERATORS,
  MAX_OFFLINE_SECONDS, BASE_OFFLINE_RATE,
  SAVE_KEY, COMBO_BASE_POWER, COMBO_MAX,
  PRESTIGE_STAR_BONUS, MAX_BUY_PER_CLICK,
  STORY_MESSAGES, DAILY_BONUS_BASE, DAILY_STREAK_BONUS, DAILY_STREAK_MAX, DAILY_STORAGE_KEY,
  AUTO_BUY_RESEARCH_ID,
  type UpgradeEffect, type ChallengeRestriction,
} from './gameConfig'

// ── Game State ──

export interface GameStats {
  bestCps: number
  totalCritClicks: number
  bestCombo: number
  totalOfflineEarned: number
  totalEventsClicked: number
  totalPlaytimeMs: number
  sessionStartedAt: number
}

export interface GameState {
  coins: number
  totalEarned: number
  totalClicks: number
  generators: Record<string, number>
  upgrades: Set<string>
  achievements: Set<string>
  research: Set<string>
  prestigePoints: number
  totalPrestigeEarned: number
  prestigeCount: number
  combo: number
  lastClickTime: number
  lastTick: number
  startedAt: number
  stats: GameStats
  repeatableUpgrades: Record<string, number>  // id → level
  lastStoryShown: number  // totalEarned threshold of last story message
  // Challenges
  completedChallenges: Set<string>
  activeChallenge: string | null
}

export function newGameState(): GameState {
  const now = Date.now()
  return {
    coins: 0, totalEarned: 0, totalClicks: 0,
    generators: {}, upgrades: new Set(), achievements: new Set(), research: new Set(),
    prestigePoints: 0, totalPrestigeEarned: 0, prestigeCount: 0,
    combo: 0, lastClickTime: 0, lastTick: now, startedAt: now,
    stats: { bestCps: 0, totalCritClicks: 0, bestCombo: 0, totalOfflineEarned: 0, totalEventsClicked: 0, totalPlaytimeMs: 0, sessionStartedAt: now },
    repeatableUpgrades: {}, lastStoryShown: 0,
    completedChallenges: new Set(), activeChallenge: null,
  }
}

// ── Serialization ──

interface SaveData {
  v: number
  coins: number; totalEarned: number; totalClicks: number
  generators: Record<string, number>
  upgrades: string[]; achievements: string[]; research: string[]
  prestigePoints: number; totalPrestigeEarned: number; prestigeCount: number
  lastTick: number; startedAt: number; stats: GameStats
  completedChallenges?: string[]; activeChallenge?: string | null
  repeatableUpgrades?: Record<string, number>; lastStoryShown?: number
}

export function saveGame(state: GameState): void {
  if (typeof window === 'undefined') return
  const data: SaveData = {
    v: 3, coins: state.coins, totalEarned: state.totalEarned, totalClicks: state.totalClicks,
    generators: state.generators,
    upgrades: Array.from(state.upgrades), achievements: Array.from(state.achievements), research: Array.from(state.research),
    prestigePoints: state.prestigePoints, totalPrestigeEarned: state.totalPrestigeEarned, prestigeCount: state.prestigeCount,
    lastTick: Date.now(), startedAt: state.startedAt,
    stats: { ...state.stats, totalPlaytimeMs: state.stats.totalPlaytimeMs + (Date.now() - state.stats.sessionStartedAt) },
    completedChallenges: Array.from(state.completedChallenges),
    activeChallenge: state.activeChallenge,
    repeatableUpgrades: state.repeatableUpgrades,
    lastStoryShown: state.lastStoryShown,
  }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)) } catch {}
}

export function loadGame(): { state: GameState; offlineSeconds: number } {
  const fresh = newGameState()
  if (typeof window === 'undefined') return { state: fresh, offlineSeconds: 0 }
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return { state: fresh, offlineSeconds: 0 }
    const d: SaveData = JSON.parse(raw)
    const state: GameState = {
      coins: d.coins || 0, totalEarned: d.totalEarned || 0, totalClicks: d.totalClicks || 0,
      generators: d.generators || {},
      upgrades: new Set(d.upgrades || []), achievements: new Set(d.achievements || []), research: new Set(d.research || []),
      prestigePoints: d.prestigePoints || 0, totalPrestigeEarned: d.totalPrestigeEarned || 0, prestigeCount: d.prestigeCount || 0,
      combo: 0, lastClickTime: 0, lastTick: d.lastTick || Date.now(), startedAt: d.startedAt || Date.now(),
      stats: d.stats || fresh.stats,
      repeatableUpgrades: d.repeatableUpgrades || {},
      lastStoryShown: d.lastStoryShown || 0,
      completedChallenges: new Set(d.completedChallenges || []),
      activeChallenge: d.activeChallenge || null,
    }
    state.stats.sessionStartedAt = Date.now()
    const offlineSeconds = Math.min(Math.max(0, (Date.now() - state.lastTick) / 1000), MAX_OFFLINE_SECONDS)
    return { state, offlineSeconds }
  } catch { return { state: fresh, offlineSeconds: 0 } }
}

export function resetSave(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(SAVE_KEY) } catch {}
}

// ── Multiplier Helpers ──

function collectMultiplier(state: GameState, targetType: string, generatorId?: string): number {
  let mult = 1
  for (const uid of Array.from(state.upgrades)) {
    const def = UPGRADES.find(u => u.id === uid)
    if (!def) continue
    const e = def.effect
    if (e.type === targetType) {
      if (e.type === 'generator_multiply' && (e as { generatorId: string }).generatorId !== generatorId) continue
      mult *= e.value
    }
  }
  for (const rid of Array.from(state.research)) {
    const def = RESEARCH.find(r => r.id === rid)
    if (!def) continue
    const e = def.effect
    if (e.type === targetType) {
      if (e.type === 'generator_multiply' && (e as { generatorId: string }).generatorId !== generatorId) continue
      mult *= e.value
    }
  }
  // Repeatable upgrades (applied level times)
  for (const [rpId, level] of Object.entries(state.repeatableUpgrades)) {
    if (level <= 0) continue
    const def = REPEATABLE_UPGRADES.find(r => r.id === rpId)
    if (def && def.effect.type === targetType) mult *= Math.pow(def.effect.value, level)
  }
  return mult
}

function collectAdditive(state: GameState, targetType: string): number {
  let total = 0
  for (const uid of Array.from(state.upgrades)) {
    const def = UPGRADES.find(u => u.id === uid)
    if (def && def.effect.type === targetType) total += def.effect.value
  }
  for (const rid of Array.from(state.research)) {
    const def = RESEARCH.find(r => r.id === rid)
    if (def && def.effect.type === targetType) total += def.effect.value
  }
  for (const [rpId, level] of Object.entries(state.repeatableUpgrades)) {
    if (level <= 0) continue
    const def = REPEATABLE_UPGRADES.find(r => r.id === rpId)
    if (def && def.effect.type === targetType) total += def.effect.value * level
  }
  return total
}

function getAchievementMult(state: GameState, type: 'multiply_all' | 'multiply_click'): number {
  let m = 1
  for (const aid of Array.from(state.achievements)) {
    const def = ACHIEVEMENTS.find(a => a.id === aid)
    if (def && def.reward.type === type) m *= def.reward.value
  }
  return m
}

/** Cost reduction multiplier from upgrades + research */
function getCostReduction(state: GameState): number {
  let m = 1
  for (const uid of Array.from(state.upgrades)) {
    const def = UPGRADES.find(u => u.id === uid)
    if (def && def.effect.type === 'cost_reduce') m *= def.effect.value
  }
  for (const rid of Array.from(state.research)) {
    const def = RESEARCH.find(r => r.id === rid)
    if (def && def.effect.type === 'cost_reduce') m *= def.effect.value
  }
  return m
}

/** Synergy multiplier: for each generator ABOVE this one that has ≥ threshold, apply 2x */
function getSynergyMult(state: GameState, genId: string): number {
  const idx = GENERATORS.findIndex(g => g.id === genId)
  let mult = 1
  for (let i = idx + 1; i < GENERATORS.length; i++) {
    const count = state.generators[GENERATORS[i].id] || 0
    const tiers = Math.min(Math.floor(count / SYNERGY_THRESHOLD), SYNERGY_MAX_TIERS)
    mult *= Math.pow(SYNERGY_MULTIPLIER, tiers)
  }
  return mult
}

function prestigeStarBonus(state: GameState): number {
  return 1 + state.totalPrestigeEarned * PRESTIGE_STAR_BONUS
}

// ── Public Calculations ──

export function getGeneratorCost(genId: string, owned: number, state?: GameState): number {
  const def = GENERATORS.find(g => g.id === genId)
  if (!def) return Infinity
  const raw = def.baseCost * Math.pow(def.growthRate, owned)
  const reduction = state ? getCostReduction(state) : 1
  const challengeMult = state ? getChallengeCostMult(state) : 1
  return Math.floor(raw * reduction * challengeMult)
}

export function getGeneratorBulkCost(genId: string, owned: number, count: number, state?: GameState): number {
  // Closed-form geometric series for efficiency
  const def = GENERATORS.find(g => g.id === genId)
  if (!def) return Infinity
  const r = def.growthRate
  const reduction = state ? getCostReduction(state) : 1
  const challengeMult = state ? getChallengeCostMult(state) : 1
  const base = def.baseCost * Math.pow(r, owned) * reduction * challengeMult
  if (Math.abs(r - 1) < 0.001) return Math.floor(base * count)
  return Math.floor(base * (Math.pow(r, count) - 1) / (r - 1))
}

export function getMaxAffordable(genId: string, owned: number, coins: number, state?: GameState): number {
  // Binary search for max count affordable
  let lo = 0, hi = 1000
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (getGeneratorBulkCost(genId, owned, mid, state) <= coins) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function getClickValue(state: GameState): number {
  const baseAdd = 1 + collectAdditive(state, 'click_add')
  const clickMult = collectMultiplier(state, 'click_multiply')
  const achMult = getAchievementMult(state, 'multiply_click')
  const r = getActiveRestriction(state)
  if (r && r.type === 'no_click') return 0
  return baseAdd * clickMult * achMult * prestigeStarBonus(state) * getChallengeRewardMult(state, 'click')
}

export function getComboMultiplier(state: GameState): number {
  const comboPower = COMBO_BASE_POWER * collectMultiplier(state, 'combo_power')
  return 1 + Math.min(state.combo, COMBO_MAX) * comboPower
}

export function getCritInfo(state: GameState): { chance: number; multiplier: number } {
  return {
    chance: Math.min(collectAdditive(state, 'crit_chance'), 0.75),
    multiplier: Math.max(collectMultiplier(state, 'crit_multiply'), 3),
  }
}

export function getGeneratorIncome(state: GameState, genId: string): number {
  const def = GENERATORS.find(g => g.id === genId)
  if (!def) return 0
  const count = state.generators[genId] || 0
  if (count === 0) return 0
  const genMult = collectMultiplier(state, 'generator_multiply', genId)
  const allMult = collectMultiplier(state, 'all_multiply')
  const achMult = getAchievementMult(state, 'multiply_all')
  const synergy = getSynergyMult(state, genId)
  return count * def.baseIncome * genMult * allMult * achMult * synergy * prestigeStarBonus(state) * getPrestigeMilestoneMult(state) * getChallengeIncomeMult(state) * getChallengeRewardMult(state, 'all')
}

export function getTotalCPS(state: GameState): number {
  let total = 0
  for (const gen of GENERATORS) total += getGeneratorIncome(state, gen.id)
  return total
}

export function getOfflineMultiplier(state: GameState): number {
  return BASE_OFFLINE_RATE * collectMultiplier(state, 'offline_multiply')
}

export function calcOfflineEarnings(state: GameState, seconds: number): number {
  return getTotalCPS(state) * seconds * getOfflineMultiplier(state)
}

export function getTotalGenerators(state: GameState): number {
  return Object.values(state.generators).reduce((a, b) => a + b, 0)
}

// ── Prestige ──

export function calcPrestigeReward(state: GameState): number {
  if (state.totalEarned < 2000000) return 0
  // Scaling: each prestige makes the next one harder
  const effectiveDivisor = PRESTIGE_DIVISOR * (1 + state.prestigeCount * PRESTIGE_SCALING)
  let reward = Math.floor(Math.pow(state.totalEarned / effectiveDivisor, PRESTIGE_EXPONENT))
  for (const [rid, bonus] of Object.entries(PRESTIGE_RESEARCH_BONUS)) {
    if (state.research.has(rid)) reward = Math.floor(reward * bonus)
  }
  reward = Math.floor(reward * getChallengeRewardMult(state, 'prestige'))
  return Math.max(reward, 0)
}

export function getPrestigeMilestoneMult(state: GameState): number {
  let mult = 1
  for (const m of PRESTIGE_MILESTONES) {
    if (state.prestigeCount >= m.count) mult *= m.reward
  }
  return mult
}

export function canPrestige(state: GameState): boolean {
  return calcPrestigeReward(state) > 0
}

export function doPrestige(state: GameState): number {
  const reward = calcPrestigeReward(state)
  if (reward <= 0) return 0
  state.prestigePoints += reward
  state.totalPrestigeEarned += reward
  state.prestigeCount++
  state.coins = 0; state.totalEarned = 0; state.totalClicks = 0
  state.generators = {}; state.upgrades = new Set()
  state.combo = 0; state.lastClickTime = 0; state.lastTick = Date.now()
  return reward
}

// ── Actions ──

export function processClick(state: GameState): { gained: number; isCrit: boolean } {
  const base = getClickValue(state) * getComboMultiplier(state)
  const { chance, multiplier } = getCritInfo(state)
  const isCrit = Math.random() < chance
  const gained = isCrit ? base * multiplier : base
  state.coins += gained; state.totalEarned += gained; state.totalClicks++
  state.combo++; state.lastClickTime = Date.now()
  if (isCrit) state.stats.totalCritClicks++
  if (state.combo > state.stats.bestCombo) state.stats.bestCombo = state.combo
  return { gained, isCrit }
}

export function buyGenerator(state: GameState, genId: string, count = 1): boolean {
  if (!canBuyGeneratorInChallenge(state, genId)) return false
  // Check prestige gate
  const prestigeReq = PRESTIGE_GATED_GENERATORS[genId]
  if (prestigeReq !== undefined && state.prestigeCount < prestigeReq) return false
  const owned = state.generators[genId] || 0
  // Enforce cap
  const actualCount = Math.min(count, GENERATOR_MAX_COUNT - owned, MAX_BUY_PER_CLICK)
  if (actualCount <= 0) return false
  const cost = getGeneratorBulkCost(genId, owned, actualCount, state)
  if (state.coins < cost) return false
  state.coins -= cost; state.generators[genId] = owned + actualCount
  return true
}

export function buyUpgrade(state: GameState, upgradeId: string): boolean {
  const r = getActiveRestriction(state)
  if (r && r.type === 'no_upgrades') return false
  if (state.upgrades.has(upgradeId)) return false
  const def = UPGRADES.find(u => u.id === upgradeId)
  if (!def || state.coins < def.cost) return false
  if (def.requires && !state.upgrades.has(def.requires)) return false
  state.coins -= def.cost; state.upgrades.add(upgradeId)
  return true
}

export function buyResearch(state: GameState, researchId: string): boolean {
  if (state.research.has(researchId)) return false
  const def = RESEARCH.find(r => r.id === researchId)
  if (!def || state.prestigePoints < def.cost) return false
  if (def.requires && !state.research.has(def.requires)) return false
  state.prestigePoints -= def.cost; state.research.add(researchId)
  return true
}

export function tick(state: GameState, deltaMs: number): number {
  const cps = getTotalCPS(state)
  const gained = cps * (deltaMs / 1000)
  state.coins += gained; state.totalEarned += gained; state.lastTick = Date.now()
  if (cps > state.stats.bestCps) state.stats.bestCps = cps
  return gained
}

export function checkAchievements(state: GameState): string[] {
  const cps = getTotalCPS(state)
  const totalGens = getTotalGenerators(state)
  const newlyUnlocked: string[] = []
  for (const ach of ACHIEVEMENTS) {
    if (state.achievements.has(ach.id)) continue
    let met = false
    const c = ach.condition
    switch (c.type) {
      case 'total_earned':     met = state.totalEarned >= c.amount; break
      case 'total_clicks':     met = state.totalClicks >= c.amount; break
      case 'generator_count':  met = (state.generators[c.generatorId] || 0) >= c.amount; break
      case 'total_generators': met = totalGens >= c.amount; break
      case 'cps':              met = cps >= c.amount; break
      case 'prestige_count':   met = state.prestigeCount >= c.amount; break
      case 'combo':            met = state.stats.bestCombo >= c.amount; break
      case 'crit_count':       met = state.stats.totalCritClicks >= c.amount; break
    }
    if (met) {
      state.achievements.add(ach.id)
      if (ach.reward.type === 'bonus_coins') { state.coins += ach.reward.value; state.totalEarned += ach.reward.value }
      newlyUnlocked.push(ach.id)
    }
  }
  return newlyUnlocked
}

// ── Challenges ──

export function getActiveRestriction(state: GameState): ChallengeRestriction | null {
  if (!state.activeChallenge) return null
  const ch = CHALLENGES.find(c => c.id === state.activeChallenge)
  return ch?.restriction || null
}

export function startChallenge(state: GameState, challengeId: string): boolean {
  if (state.activeChallenge) return false
  if (state.completedChallenges.has(challengeId)) return false
  const ch = CHALLENGES.find(c => c.id === challengeId)
  if (!ch || state.prestigeCount < ch.unlockAtPrestige) return false
  // Reset run progress for challenge
  state.coins = 0; state.totalEarned = 0; state.totalClicks = 0
  state.generators = {}; state.upgrades = new Set()
  state.combo = 0; state.lastClickTime = 0
  state.activeChallenge = challengeId
  return true
}

export function abandonChallenge(state: GameState): void {
  if (!state.activeChallenge) return
  // Reset run, lose progress
  state.coins = 0; state.totalEarned = 0; state.totalClicks = 0
  state.generators = {}; state.upgrades = new Set()
  state.combo = 0; state.lastClickTime = 0
  state.activeChallenge = null
}

export function checkChallengeComplete(state: GameState): string | null {
  if (!state.activeChallenge) return null
  const ch = CHALLENGES.find(c => c.id === state.activeChallenge)
  if (!ch) return null
  if (state.totalEarned >= ch.targetEarned) {
    state.completedChallenges.add(ch.id)
    // Apply reward
    const r = ch.reward
    if (r.type === 'bonus_stars') {
      state.prestigePoints += r.value
      state.totalPrestigeEarned += r.value
    }
    state.activeChallenge = null
    // Reset run after challenge
    state.coins = 0; state.totalEarned = 0; state.totalClicks = 0
    state.generators = {}; state.upgrades = new Set()
    state.combo = 0; state.lastClickTime = 0
    return ch.id
  }
  return null
}

/** Check if a generator buy is allowed under current challenge restriction */
export function canBuyGeneratorInChallenge(state: GameState, genId: string): boolean {
  const r = getActiveRestriction(state)
  if (!r) return true
  if (r.type === 'generator_only') return genId === r.generatorId
  if (r.type === 'max_generator_types') {
    const ownedTypes = Object.keys(state.generators).filter(k => state.generators[k] > 0)
    if (ownedTypes.includes(genId)) return true // already own this type
    return ownedTypes.length < r.value
  }
  return true
}

/** Get challenge cost multiplier */
export function getChallengeCostMult(state: GameState): number {
  const r = getActiveRestriction(state)
  if (!r) return 1
  if (r.type === 'expensive') return r.value
  return 1
}

/** Get challenge income multiplier */
export function getChallengeIncomeMult(state: GameState): number {
  const r = getActiveRestriction(state)
  if (!r) return 1
  if (r.type === 'half_income') return 0.5
  return 1
}

/** Get permanent challenge reward multipliers */
export function getChallengeRewardMult(state: GameState, type: 'all' | 'click' | 'prestige'): number {
  let mult = 1
  for (const chId of Array.from(state.completedChallenges)) {
    const ch = CHALLENGES.find(c => c.id === chId)
    if (!ch) continue
    const r = ch.reward
    if (type === 'all' && r.type === 'permanent_multiply_all') mult *= r.value
    if (type === 'click' && r.type === 'permanent_multiply_click') mult *= r.value
    if (type === 'prestige' && r.type === 'permanent_prestige_bonus') mult *= r.value
  }
  return mult
}

// ── Repeatable Upgrades ──

export function getRepeatableCost(rpId: string, level: number): number {
  const def = REPEATABLE_UPGRADES.find(r => r.id === rpId)
  if (!def) return Infinity
  return Math.floor(def.baseCost * Math.pow(def.costMultiplier, level))
}

export function buyRepeatableUpgrade(state: GameState, rpId: string): boolean {
  const def = REPEATABLE_UPGRADES.find(r => r.id === rpId)
  if (!def) return false
  const level = state.repeatableUpgrades[rpId] || 0
  if (level >= def.maxLevel) return false
  const cost = getRepeatableCost(rpId, level)
  if (state.coins < cost) return false
  state.coins -= cost
  state.repeatableUpgrades[rpId] = level + 1
  return true
}

// ── Generator Unlock Check ──

export function isGeneratorUnlocked(state: GameState, genId: string): boolean {
  const def = GENERATORS.find(g => g.id === genId)
  if (!def) return false
  if (state.totalEarned < def.unlockAt && (state.generators[genId] || 0) === 0) return false
  const prestigeReq = PRESTIGE_GATED_GENERATORS[genId]
  if (prestigeReq !== undefined && state.prestigeCount < prestigeReq) return false
  return true
}

// ── Story Messages ──

export function checkStoryMessage(state: GameState): { message: string; emoji: string } | null {
  for (let i = STORY_MESSAGES.length - 1; i >= 0; i--) {
    const sm = STORY_MESSAGES[i]
    if (state.totalEarned >= sm.totalEarned && state.lastStoryShown < sm.totalEarned) {
      state.lastStoryShown = sm.totalEarned
      return sm
    }
  }
  return null
}

// ── Daily Bonus ──

export function getDailyBonus(state: GameState): { available: boolean; amount: number; streak: number } {
  if (typeof window === 'undefined') return { available: false, amount: 0, streak: 0 }
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : { lastClaim: 0, streak: 0 }
    const now = Date.now()
    const hoursSince = (now - (data.lastClaim || 0)) / (1000 * 60 * 60)
    const available = hoursSince >= 20
    const streak = hoursSince < 48 ? Math.min(data.streak || 0, DAILY_STREAK_MAX) : 0
    const cps = getTotalCPS(state)
    const baseAmount = cps * 3600 * DAILY_BONUS_BASE
    const streakMult = 1 + streak * DAILY_STREAK_BONUS
    return { available, amount: baseAmount * streakMult, streak }
  } catch { return { available: false, amount: 0, streak: 0 } }
}

export function claimDailyBonus(state: GameState): number {
  const bonus = getDailyBonus(state)
  if (!bonus.available || bonus.amount <= 0) return 0
  state.coins += bonus.amount
  state.totalEarned += bonus.amount
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : { lastClaim: 0, streak: 0 }
    const hoursSince = (Date.now() - (data.lastClaim || 0)) / (1000 * 60 * 60)
    const newStreak = hoursSince < 48 ? Math.min((data.streak || 0) + 1, DAILY_STREAK_MAX) : 1
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify({ lastClaim: Date.now(), streak: newStreak }))
  } catch {}
  return bonus.amount
}

// ── Auto-buy (research-gated) ──

export function hasAutoBuy(state: GameState): boolean {
  return state.research.has(AUTO_BUY_RESEARCH_ID)
}

export function autoBuyBest(state: GameState): boolean {
  if (!hasAutoBuy(state)) return false
  let bestId: string | null = null
  let bestEfficiency = 0
  for (const gen of GENERATORS) {
    if (!isGeneratorUnlocked(state, gen.id)) continue
    const owned = state.generators[gen.id] || 0
    if (owned >= GENERATOR_MAX_COUNT) continue
    const cost = getGeneratorCost(gen.id, owned, state)
    if (cost > state.coins) continue
    const efficiency = gen.baseIncome / cost
    if (efficiency > bestEfficiency) { bestEfficiency = efficiency; bestId = gen.id }
  }
  if (bestId) return buyGenerator(state, bestId, 1)
  return false
}

// ── Prestige Skin ──

export function getCurrentSkin(state: GameState): { emoji: string; label: string } {
  const { PRESTIGE_SKINS } = require('./gameConfig')
  let best = PRESTIGE_SKINS[0]
  for (const skin of PRESTIGE_SKINS) {
    if (state.prestigeCount >= skin.minPrestige) best = skin
  }
  return best
}
