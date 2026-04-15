import { describe, it, expect, beforeEach } from 'vitest'
import {
  newGameState, processClick, buyGenerator, buyUpgrade, buyResearch,
  tick, getClickValue, getTotalCPS, getGeneratorCost, getGeneratorBulkCost,
  getMaxAffordable, getGeneratorIncome, getComboMultiplier, getCritInfo,
  calcPrestigeReward, doPrestige, canPrestige, checkAchievements,
  calcOfflineEarnings, getTotalGenerators, saveGame, loadGame,
  type GameState,
} from '../app/games/clicker/gameEngine'

let state: GameState

beforeEach(() => {
  state = newGameState()
  if (typeof localStorage !== 'undefined') localStorage.clear()
})

describe('Click mechanics', () => {
  it('base click gives 1 coin', () => {
    const { gained } = processClick(state)
    expect(gained).toBeGreaterThanOrEqual(1) // may crit if crit_chance > 0 from default
    expect(state.totalClicks).toBe(1)
    expect(state.coins).toBeGreaterThanOrEqual(1)
  })

  it('click upgrades multiply click value', () => {
    state.upgrades.add('c1') // x2
    const val = getClickValue(state)
    expect(val).toBe(2)
  })

  it('additive + multiplicative click stacks', () => {
    state.upgrades.add('c7') // +5 base
    state.upgrades.add('c1') // x2
    const val = getClickValue(state)
    expect(val).toBe(12) // (1+5) * 2
  })

  it('combo increases click multiplier', () => {
    state.combo = 10
    const mult = getComboMultiplier(state)
    expect(mult).toBeGreaterThan(1)
    expect(mult).toBeLessThan(2) // 10 * 0.04 = 0.4 → 1.4
  })

  it('crit info is zero by default', () => {
    const { chance, multiplier } = getCritInfo(state)
    expect(chance).toBe(0)
    expect(multiplier).toBe(3) // min crit mult
  })

  it('crit upgrades stack additively for chance', () => {
    state.upgrades.add('cr1') // +5%
    state.upgrades.add('cr2') // +8%
    const { chance } = getCritInfo(state)
    expect(chance).toBeCloseTo(0.13)
  })
})

describe('Generator cost scaling', () => {
  it('first spoon costs 10', () => {
    const cost = getGeneratorCost('spoon', 0)
    expect(cost).toBe(10)
  })

  it('cost increases with ownership', () => {
    const c0 = getGeneratorCost('spoon', 0)
    const c5 = getGeneratorCost('spoon', 5)
    expect(c5).toBeGreaterThan(c0)
  })

  it('bulk cost equals sum of individual costs approximately', () => {
    const bulk = getGeneratorBulkCost('spoon', 0, 3)
    const sum = getGeneratorCost('spoon', 0) + getGeneratorCost('spoon', 1) + getGeneratorCost('spoon', 2)
    expect(Math.abs(bulk - sum)).toBeLessThan(2) // rounding tolerance
  })

  it('cost reduction lowers prices', () => {
    state.upgrades.add('d1') // x0.9
    const normal = getGeneratorCost('spoon', 0, state)
    expect(normal).toBe(9) // floor(10 * 0.9)
  })

  it('getMaxAffordable returns correct count', () => {
    state.coins = 100
    const max = getMaxAffordable('spoon', 0, state.coins, state)
    expect(max).toBeGreaterThanOrEqual(1)
    // Verify we can afford max but not max+1
    const costMax = getGeneratorBulkCost('spoon', 0, max, state)
    expect(costMax).toBeLessThanOrEqual(100)
    if (max < 100) {
      const costMore = getGeneratorBulkCost('spoon', 0, max + 1, state)
      expect(costMore).toBeGreaterThan(100)
    }
  })
})

describe('Generator income', () => {
  it('no income with 0 generators', () => {
    expect(getTotalCPS(state)).toBe(0)
  })

  it('spoon generates base income', () => {
    state.generators['spoon'] = 1
    const income = getGeneratorIncome(state, 'spoon')
    expect(income).toBe(0.5) // base income
  })

  it('income scales with count', () => {
    state.generators['spoon'] = 5
    const income = getGeneratorIncome(state, 'spoon')
    expect(income).toBe(2.5) // 5 * 0.5
  })

  it('generator upgrade multiplies income', () => {
    state.generators['spoon'] = 1
    state.upgrades.add('g_spoon') // x3
    const income = getGeneratorIncome(state, 'spoon')
    expect(income).toBe(1.5) // 1 * 0.5 * 3
  })

  it('global multiplier affects all generators', () => {
    state.generators['spoon'] = 1
    state.upgrades.add('m1') // x2 global
    const income = getGeneratorIncome(state, 'spoon')
    expect(income).toBe(1) // 1 * 0.5 * 2
  })
})

describe('Purchase logic', () => {
  it('can buy generator when affordable', () => {
    state.coins = 100
    expect(buyGenerator(state, 'spoon')).toBe(true)
    expect(state.generators['spoon']).toBe(1)
    expect(state.coins).toBe(90)
  })

  it('cannot buy generator when too expensive', () => {
    state.coins = 5
    expect(buyGenerator(state, 'spoon')).toBe(false)
    expect(state.generators['spoon']).toBeUndefined()
    expect(state.coins).toBe(5)
  })

  it('can buy upgrade once', () => {
    state.coins = 100
    expect(buyUpgrade(state, 'c1')).toBe(true)
    expect(state.upgrades.has('c1')).toBe(true)
  })

  it('cannot buy same upgrade twice', () => {
    state.coins = 200
    buyUpgrade(state, 'c1')
    expect(buyUpgrade(state, 'c1')).toBe(false)
  })

  it('cannot buy upgrade without prerequisite', () => {
    state.coins = 100000
    expect(buyUpgrade(state, 'c2')).toBe(false) // requires c1
  })

  it('bulk buy deducts correct cost', () => {
    state.coins = 1000
    const cost = getGeneratorBulkCost('spoon', 0, 5, state)
    buyGenerator(state, 'spoon', 5)
    expect(state.generators['spoon']).toBe(5)
    expect(state.coins).toBeCloseTo(1000 - cost, 0)
  })
})

describe('Passive income (tick)', () => {
  it('tick adds income based on CPS', () => {
    state.generators['spoon'] = 10 // 10 * 0.5 = 5/sec
    const earned = tick(state, 1000) // 1 second
    expect(earned).toBeCloseTo(5, 1)
    expect(state.coins).toBeCloseTo(5, 1)
  })

  it('tick tracks totalEarned', () => {
    state.generators['spoon'] = 10
    tick(state, 1000)
    expect(state.totalEarned).toBeCloseTo(5, 1)
  })
})

describe('Prestige system', () => {
  it('no prestige reward below threshold', () => {
    state.totalEarned = 100
    expect(calcPrestigeReward(state)).toBe(0)
  })

  it('prestige reward at 2M earned is small', () => {
    state.totalEarned = 2000000
    const reward = calcPrestigeReward(state)
    // floor((2000000 / 2000000) ^ 0.45) = floor(1) = 1
    expect(reward).toBe(1)
  })

  it('prestige reward scales with exponent', () => {
    state.totalEarned = 200000000 // 200M
    const reward = calcPrestigeReward(state)
    // floor((200000000 / 2000000) ^ 0.45) = floor(100^0.45) = floor(7.94) = 7
    expect(reward).toBeGreaterThanOrEqual(5)
    expect(reward).toBeLessThanOrEqual(15)
  })

  it('prestige resets run progress', () => {
    state.coins = 50000000
    state.totalEarned = 50000000
    state.generators['spoon'] = 50
    state.upgrades.add('c1')
    const reward = doPrestige(state)
    expect(reward).toBeGreaterThan(0)
    expect(state.coins).toBe(0)
    expect(state.totalEarned).toBe(0)
    expect(state.generators['spoon']).toBeUndefined()
    expect(state.upgrades.size).toBe(0)
    expect(state.prestigePoints).toBe(reward)
    expect(state.prestigeCount).toBe(1)
  })

  it('prestige keeps research and achievements', () => {
    state.totalEarned = 5000000
    state.research.add('rc1')
    state.achievements.add('e_1k')
    doPrestige(state)
    expect(state.research.has('rc1')).toBe(true)
    expect(state.achievements.has('e_1k')).toBe(true)
  })

  it('research bought with prestige points', () => {
    state.prestigePoints = 5
    expect(buyResearch(state, 'rc1')).toBe(true) // costs 3
    expect(state.prestigePoints).toBe(2)
    expect(state.research.has('rc1')).toBe(true)
  })

  it('prestige research bonus multiplies reward', () => {
    state.totalEarned = 200000000 // 200M for meaningful reward
    const base = calcPrestigeReward(state)
    state.research.add('rp1') // 1.25x bonus
    const boosted = calcPrestigeReward(state)
    expect(boosted).toBe(Math.floor(base * 1.25))
  })
})

describe('Offline earnings', () => {
  it('calculates offline earnings correctly', () => {
    state.generators['spoon'] = 10 // 5/sec CPS
    const earned = calcOfflineEarnings(state, 3600) // 1 hour
    // 5/sec * 3600s * 0.25 (base offline rate) = 4500
    expect(earned).toBeCloseTo(4500, 0)
  })

  it('offline multiplier upgrade increases earnings', () => {
    state.generators['spoon'] = 10
    state.upgrades.add('o1') // x2 offline
    const earned = calcOfflineEarnings(state, 3600)
    // 5/sec * 3600s * 0.25 * 2 = 9000
    expect(earned).toBeCloseTo(9000, 0)
  })
})

describe('Achievements', () => {
  it('unlocks achievement when condition met', () => {
    state.totalEarned = 1500
    const unlocked = checkAchievements(state)
    expect(unlocked).toContain('e_1k')
    expect(state.achievements.has('e_1k')).toBe(true)
  })

  it('does not double-unlock', () => {
    state.totalEarned = 1500
    checkAchievements(state)
    const second = checkAchievements(state)
    expect(second).not.toContain('e_1k')
  })

  it('combo achievement checks bestCombo', () => {
    state.stats.bestCombo = 12
    const unlocked = checkAchievements(state)
    expect(unlocked).toContain('cb_10')
  })
})

describe('Total generators', () => {
  it('counts all generators', () => {
    state.generators['spoon'] = 5
    state.generators['knife'] = 3
    expect(getTotalGenerators(state)).toBe(8)
  })
})
