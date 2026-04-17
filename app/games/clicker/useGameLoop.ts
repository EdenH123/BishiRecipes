'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  type GameState, newGameState, loadGame, saveGame,
  processClick, buyGenerator, buyUpgrade, buyResearch,
  doPrestige, canPrestige, calcPrestigeReward,
  tick, checkAchievements, getTotalCPS, getClickValue,
  getCritInfo, getComboMultiplier, getGeneratorCost, getGeneratorIncome,
  getTotalGenerators, calcOfflineEarnings, getMaxAffordable, getGeneratorBulkCost,
  startChallenge, abandonChallenge, checkChallengeComplete, canBuyGeneratorInChallenge,
  buyRepeatableUpgrade, getRepeatableCost, isGeneratorUnlocked,
  checkStoryMessage, getDailyBonus, claimDailyBonus, hasAutoBuy, autoBuyBest,
  getPrestigeMilestoneMult,
} from './gameEngine'
import {
  GENERATORS, UPGRADES, REPEATABLE_UPGRADES, ACHIEVEMENTS, RESEARCH, CHALLENGES,
  AUTO_SAVE_INTERVAL, COMBO_DECAY_MS, AUTO_BUY_INTERVAL, PRESTIGE_MILESTONES, GENERATOR_MAX_COUNT,
  GOLDEN_MIN_INTERVAL, GOLDEN_MAX_INTERVAL, GOLDEN_DURATION, GOLDEN_REWARD_CPS_SECONDS,
  PRESTIGE_UNLOCK_EARNED, EVENT_RESEARCH_FREQUENCY,
} from './gameConfig'

export interface FloatingText {
  id: number; x: number; y: number; text: string; isCrit: boolean
}

export interface GameUI {
  coins: number; totalEarned: number; totalClicks: number
  cps: number; clickValue: number; comboMultiplier: number; combo: number
  critChance: number; critMultiplier: number
  generators: Record<string, number>
  upgrades: Set<string>; achievements: Set<string>; research: Set<string>
  prestigePoints: number; totalPrestigeEarned: number; prestigeCount: number
  prestigeReward: number; canPrestige: boolean; totalGenerators: number
  stats: GameState['stats']
  floatingTexts: FloatingText[]; newAchievements: string[]
  offlineEarnings: number | null; goldenActive: boolean; goldenTimer: number
  // Actions
  handleClick: (cx: number, cy: number) => void
  handleBuyGenerator: (id: string, count?: number) => void
  handleBuyMaxGenerator: (id: string) => void
  handleBuyUpgrade: (id: string) => void
  handleBuyResearch: (id: string) => void
  handlePrestige: () => void
  handleGoldenClick: () => void
  handleStartChallenge: (id: string) => void
  handleAbandonChallenge: () => void
  completedChallenges: Set<string>
  activeChallenge: string | null
  challengeCompleted: string | null  // just-completed challenge id for popup
  dismissChallengeComplete: () => void
  canBuyGen: (id: string) => boolean
  isGenUnlocked: (id: string) => boolean
  // Repeatable
  repeatableUpgrades: Record<string, number>
  handleBuyRepeatable: (id: string) => void
  getRepeatCost: (id: string) => number
  // Daily
  dailyAvailable: boolean; dailyAmount: number; dailyStreak: number
  handleClaimDaily: () => void
  // Story
  storyMessage: { message: string; emoji: string } | null
  dismissStory: () => void
  // Auto-buy
  autoBuyEnabled: boolean
  // Purchase flash
  lastPurchaseId: string | null
  dismissOffline: () => void; dismissAchievement: () => void; resetGame: () => void
  // Helpers
  getGenCost: (id: string) => number
  getGenBulkCost: (id: string, count: number) => number
  getGenIncome: (id: string) => number
  getGenMaxAffordable: (id: string) => number
}

export function useGameLoop(): GameUI {
  const stateRef = useRef<GameState>(newGameState())
  const [, forceUpdate] = useState(0)
  const rerender = useCallback(() => forceUpdate(n => n + 1), [])

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([])
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [offlineEarnings, setOfflineEarnings] = useState<number | null>(null)
  const [goldenActive, setGoldenActive] = useState(false)
  const [goldenTimer, setGoldenTimer] = useState(0)
  const [challengeCompleted, setChallengeCompleted] = useState<string | null>(null)
  const [storyMessage, setStoryMessage] = useState<{ message: string; emoji: string } | null>(null)
  const [lastPurchaseId, setLastPurchaseId] = useState<string | null>(null)
  const goldenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextFloatId = useRef(0)

  // Load on mount
  useEffect(() => {
    const { state, offlineSeconds } = loadGame()
    stateRef.current = state
    if (offlineSeconds > 5) {
      const earned = calcOfflineEarnings(state, offlineSeconds)
      if (earned > 0) {
        state.coins += earned; state.totalEarned += earned
        state.stats.totalOfflineEarned += earned
        setOfflineEarnings(earned)
      }
    }
    rerender()
  }, [rerender])

  // Game tick (10/sec) + combo decay
  useEffect(() => {
    const interval = setInterval(() => {
      const s = stateRef.current
      tick(s, 100)
      // Combo decay
      if (s.combo > 0 && Date.now() - s.lastClickTime > COMBO_DECAY_MS) {
        s.combo = 0
      }
      const newAch = checkAchievements(s)
      if (newAch.length > 0) setNewAchievements(prev => [...prev, ...newAch])
      const chComplete = checkChallengeComplete(s)
      if (chComplete) setChallengeCompleted(chComplete)
      const story = checkStoryMessage(s)
      if (story) setStoryMessage(story)
      rerender()
    }, 100)
    return () => clearInterval(interval)
  }, [rerender])

  // Auto-save + save on unmount
  useEffect(() => {
    const interval = setInterval(() => saveGame(stateRef.current), AUTO_SAVE_INTERVAL)
    return () => { clearInterval(interval); saveGame(stateRef.current) }
  }, [])

  // Auto-buy interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasAutoBuy(stateRef.current)) {
        if (autoBuyBest(stateRef.current)) rerender()
      }
    }, AUTO_BUY_INTERVAL)
    return () => clearInterval(interval)
  }, [rerender])

  // Golden dish event
  useEffect(() => {
    function scheduleGolden() {
      const freqMult = Array.from(Object.entries(EVENT_RESEARCH_FREQUENCY))
        .reduce((m, [rid, f]) => stateRef.current.research.has(rid) ? m * f : m, 1)
      const delay = (GOLDEN_MIN_INTERVAL + Math.random() * (GOLDEN_MAX_INTERVAL - GOLDEN_MIN_INTERVAL)) * 1000 * freqMult
      goldenTimeoutRef.current = setTimeout(() => {
        if (getTotalCPS(stateRef.current) > 0) {
          setGoldenActive(true); setGoldenTimer(GOLDEN_DURATION)
          const countdown = setInterval(() => {
            setGoldenTimer(t => { if (t <= 1) { clearInterval(countdown); setGoldenActive(false); return 0 }; return t - 1 })
          }, 1000)
          goldenTimeoutRef.current = setTimeout(() => { clearInterval(countdown); scheduleGolden() }, GOLDEN_DURATION * 1000)
        } else { scheduleGolden() }
      }, delay)
    }
    scheduleGolden()
    return () => { if (goldenTimeoutRef.current) clearTimeout(goldenTimeoutRef.current) }
  }, [])

  // Floating text cleanup
  useEffect(() => {
    if (floatingTexts.length === 0) return
    const timer = setTimeout(() => setFloatingTexts(prev => prev.slice(1)), 800)
    return () => clearTimeout(timer)
  }, [floatingTexts])

  // ── Actions ──
  const handleClick = useCallback((cx: number, cy: number) => {
    const { gained, isCrit } = processClick(stateRef.current)
    const text = gained < 100 ? `+${gained.toFixed(1)}` : `+${Math.floor(gained)}`
    setFloatingTexts(prev => [...prev.slice(-8), { id: nextFloatId.current++, x: cx, y: cy, text, isCrit }])
    rerender()
  }, [rerender])

  const handleBuyGenerator = useCallback((id: string, count = 1) => {
    if (buyGenerator(stateRef.current, id, count)) { setLastPurchaseId(id); setTimeout(() => setLastPurchaseId(null), 400); rerender() }
  }, [rerender])

  const handleBuyMaxGenerator = useCallback((id: string) => {
    const s = stateRef.current
    const max = getMaxAffordable(id, s.generators[id] || 0, s.coins, s)
    if (max > 0 && buyGenerator(s, id, max)) { setLastPurchaseId(id); setTimeout(() => setLastPurchaseId(null), 400); rerender() }
  }, [rerender])

  const handleBuyUpgrade = useCallback((id: string) => {
    if (buyUpgrade(stateRef.current, id)) rerender()
  }, [rerender])

  const handleBuyResearch = useCallback((id: string) => {
    if (buyResearch(stateRef.current, id)) rerender()
  }, [rerender])

  const handlePrestige = useCallback(() => {
    const reward = doPrestige(stateRef.current)
    if (reward > 0) { saveGame(stateRef.current); rerender() }
  }, [rerender])

  const handleGoldenClick = useCallback(() => {
    if (!goldenActive) return
    const s = stateRef.current
    const reward = getTotalCPS(s) * GOLDEN_REWARD_CPS_SECONDS
    s.coins += reward; s.totalEarned += reward; s.stats.totalEventsClicked++
    setGoldenActive(false)
    setFloatingTexts(prev => [...prev.slice(-8), { id: nextFloatId.current++, x: window.innerWidth / 2, y: window.innerHeight / 3, text: `+${Math.floor(reward)}`, isCrit: true }])
    rerender()
  }, [goldenActive, rerender])

  const handleStartChallenge = useCallback((id: string) => {
    if (startChallenge(stateRef.current, id)) { saveGame(stateRef.current); rerender() }
  }, [rerender])

  const handleAbandonChallenge = useCallback(() => {
    abandonChallenge(stateRef.current); saveGame(stateRef.current); rerender()
  }, [rerender])

  const dismissChallengeComplete = useCallback(() => setChallengeCompleted(null), [])

  const canBuyGen = useCallback((id: string) => canBuyGeneratorInChallenge(stateRef.current, id), [])
  const isGenUnlocked = useCallback((id: string) => isGeneratorUnlocked(stateRef.current, id), [])

  const handleBuyRepeatable = useCallback((id: string) => {
    if (buyRepeatableUpgrade(stateRef.current, id)) { setLastPurchaseId(id); setTimeout(() => setLastPurchaseId(null), 400); rerender() }
  }, [rerender])

  const getRepeatCost = useCallback((id: string) => getRepeatableCost(id, stateRef.current.repeatableUpgrades[id] || 0), [])

  const handleClaimDaily = useCallback(() => {
    const earned = claimDailyBonus(stateRef.current)
    if (earned > 0) rerender()
  }, [rerender])

  const dismissStory = useCallback(() => setStoryMessage(null), [])

  const dismissOffline = useCallback(() => setOfflineEarnings(null), [])
  const dismissAchievement = useCallback(() => setNewAchievements(prev => prev.slice(1)), [])
  const resetGame = useCallback(() => {
    stateRef.current = newGameState(); saveGame(stateRef.current)
    setFloatingTexts([]); setNewAchievements([]); setOfflineEarnings(null); rerender()
  }, [rerender])

  // ── Derived helpers ──
  const s = stateRef.current
  const getGenCost = useCallback((id: string) => getGeneratorCost(id, s.generators[id] || 0, s), [s])
  const getGenBulkCost = useCallback((id: string, count: number) => getGeneratorBulkCost(id, s.generators[id] || 0, count, s), [s])
  const getGenIncome = useCallback((id: string) => getGeneratorIncome(s, id), [s])
  const getGenMaxAffordable = useCallback((id: string) => getMaxAffordable(id, s.generators[id] || 0, s.coins, s), [s])

  return {
    coins: s.coins, totalEarned: s.totalEarned, totalClicks: s.totalClicks,
    cps: getTotalCPS(s), clickValue: getClickValue(s),
    comboMultiplier: getComboMultiplier(s), combo: s.combo,
    critChance: getCritInfo(s).chance, critMultiplier: getCritInfo(s).multiplier,
    generators: s.generators, upgrades: s.upgrades, achievements: s.achievements, research: s.research,
    prestigePoints: s.prestigePoints, totalPrestigeEarned: s.totalPrestigeEarned, prestigeCount: s.prestigeCount,
    prestigeReward: calcPrestigeReward(s), canPrestige: canPrestige(s),
    totalGenerators: getTotalGenerators(s), stats: s.stats,
    floatingTexts, newAchievements, offlineEarnings, goldenActive, goldenTimer,
    handleClick, handleBuyGenerator, handleBuyMaxGenerator, handleBuyUpgrade, handleBuyResearch,
    handlePrestige, handleGoldenClick,
    handleStartChallenge, handleAbandonChallenge, completedChallenges: s.completedChallenges,
    activeChallenge: s.activeChallenge, challengeCompleted, dismissChallengeComplete,
    canBuyGen, isGenUnlocked,
    repeatableUpgrades: s.repeatableUpgrades, handleBuyRepeatable, getRepeatCost,
    dailyAvailable: getDailyBonus(s).available, dailyAmount: getDailyBonus(s).amount, dailyStreak: getDailyBonus(s).streak,
    handleClaimDaily,
    storyMessage, dismissStory,
    autoBuyEnabled: hasAutoBuy(s),
    lastPurchaseId,
    dismissOffline, dismissAchievement, resetGame,
    getGenCost, getGenBulkCost, getGenIncome, getGenMaxAffordable,
  }
}

export { GENERATORS, UPGRADES, REPEATABLE_UPGRADES, ACHIEVEMENTS, RESEARCH, CHALLENGES, PRESTIGE_UNLOCK_EARNED, PRESTIGE_MILESTONES, GENERATOR_MAX_COUNT }
