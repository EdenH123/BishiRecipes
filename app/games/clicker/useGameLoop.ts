'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  type GameState, newGameState, loadGame, saveGame,
  processClick, buyGenerator, buyUpgrade, buyResearch,
  doPrestige, canPrestige, calcPrestigeReward,
  tick, checkAchievements, getTotalCPS, getClickValue,
  getCritInfo, getGeneratorCost, getGeneratorIncome,
  getTotalGenerators, calcOfflineEarnings,
} from './gameEngine'
import { GENERATORS, UPGRADES, ACHIEVEMENTS, RESEARCH, AUTO_SAVE_INTERVAL, GOLDEN_MIN_INTERVAL, GOLDEN_MAX_INTERVAL, GOLDEN_DURATION, GOLDEN_REWARD_CPS_SECONDS } from './gameConfig'

export interface FloatingText {
  id: number
  x: number
  y: number
  text: string
  isCrit: boolean
}

export interface GameUI {
  // State
  coins: number
  totalEarned: number
  totalClicks: number
  cps: number
  clickValue: number
  critChance: number
  critMultiplier: number
  generators: Record<string, number>
  upgrades: Set<string>
  achievements: Set<string>
  research: Set<string>
  prestigePoints: number
  totalPrestigeEarned: number
  prestigeCount: number
  prestigeReward: number
  canPrestige: boolean
  totalGenerators: number

  // UI
  floatingTexts: FloatingText[]
  newAchievements: string[]
  offlineEarnings: number | null
  goldenActive: boolean
  goldenTimer: number

  // Actions
  handleClick: (clientX: number, clientY: number) => void
  handleBuyGenerator: (id: string, count?: number) => void
  handleBuyUpgrade: (id: string) => void
  handleBuyResearch: (id: string) => void
  handlePrestige: () => void
  handleGoldenClick: () => void
  dismissOffline: () => void
  dismissAchievement: () => void
  resetGame: () => void
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
  const goldenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextFloatId = useRef(0)

  // ── Load game on mount ──
  useEffect(() => {
    const { state, offlineSeconds } = loadGame()
    stateRef.current = state

    if (offlineSeconds > 5) {
      const earned = calcOfflineEarnings(state, offlineSeconds)
      if (earned > 0) {
        state.coins += earned
        state.totalEarned += earned
        setOfflineEarnings(earned)
      }
    }
    rerender()
  }, [rerender])

  // ── Game tick (10 times/sec) ──
  useEffect(() => {
    const interval = setInterval(() => {
      const s = stateRef.current
      tick(s, 100)
      const newAch = checkAchievements(s)
      if (newAch.length > 0) {
        setNewAchievements(prev => [...prev, ...newAch])
      }
      rerender()
    }, 100)
    return () => clearInterval(interval)
  }, [rerender])

  // ── Auto-save ──
  useEffect(() => {
    const interval = setInterval(() => saveGame(stateRef.current), AUTO_SAVE_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  // ── Save on unmount ──
  useEffect(() => {
    return () => saveGame(stateRef.current)
  }, [])

  // ── Golden falafel timer ──
  useEffect(() => {
    function scheduleGolden() {
      const delay = (GOLDEN_MIN_INTERVAL + Math.random() * (GOLDEN_MAX_INTERVAL - GOLDEN_MIN_INTERVAL)) * 1000
      goldenTimeoutRef.current = setTimeout(() => {
        if (getTotalCPS(stateRef.current) > 0) {
          setGoldenActive(true)
          setGoldenTimer(GOLDEN_DURATION)
          // Auto-expire
          const expire = setTimeout(() => setGoldenActive(false), GOLDEN_DURATION * 1000)
          // Countdown
          const countdown = setInterval(() => {
            setGoldenTimer(t => {
              if (t <= 1) { clearInterval(countdown); return 0 }
              return t - 1
            })
          }, 1000)
          goldenTimeoutRef.current = setTimeout(() => {
            clearInterval(countdown)
            clearTimeout(expire)
            scheduleGolden()
          }, GOLDEN_DURATION * 1000)
        } else {
          scheduleGolden()
        }
      }, delay)
    }
    scheduleGolden()
    return () => { if (goldenTimeoutRef.current) clearTimeout(goldenTimeoutRef.current) }
  }, [])

  // ── Clean up floating texts ──
  useEffect(() => {
    if (floatingTexts.length === 0) return
    const timer = setTimeout(() => {
      setFloatingTexts(prev => prev.slice(1))
    }, 800)
    return () => clearTimeout(timer)
  }, [floatingTexts])

  // ── Actions ──
  const handleClick = useCallback((clientX: number, clientY: number) => {
    const s = stateRef.current
    const { gained, isCrit } = processClick(s)
    const id = nextFloatId.current++
    setFloatingTexts(prev => [...prev.slice(-8), { id, x: clientX, y: clientY, text: `+${gained < 100 ? gained.toFixed(1) : Math.floor(gained)}`, isCrit }])
    rerender()
  }, [rerender])

  const handleBuyGenerator = useCallback((genId: string, count = 1) => {
    if (buyGenerator(stateRef.current, genId, count)) rerender()
  }, [rerender])

  const handleBuyUpgrade = useCallback((id: string) => {
    if (buyUpgrade(stateRef.current, id)) rerender()
  }, [rerender])

  const handleBuyResearch = useCallback((id: string) => {
    if (buyResearch(stateRef.current, id)) rerender()
  }, [rerender])

  const handlePrestige = useCallback(() => {
    const reward = doPrestige(stateRef.current)
    if (reward > 0) {
      saveGame(stateRef.current)
      rerender()
    }
  }, [rerender])

  const handleGoldenClick = useCallback(() => {
    if (!goldenActive) return
    const s = stateRef.current
    const reward = getTotalCPS(s) * GOLDEN_REWARD_CPS_SECONDS
    s.coins += reward
    s.totalEarned += reward
    setGoldenActive(false)
    setFloatingTexts(prev => [...prev.slice(-8), {
      id: nextFloatId.current++,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      text: `GOLDEN +${Math.floor(reward)}`,
      isCrit: true,
    }])
    rerender()
  }, [goldenActive, rerender])

  const dismissOffline = useCallback(() => setOfflineEarnings(null), [])
  const dismissAchievement = useCallback(() => setNewAchievements(prev => prev.slice(1)), [])

  const resetGame = useCallback(() => {
    stateRef.current = newGameState()
    saveGame(stateRef.current)
    setFloatingTexts([])
    setNewAchievements([])
    setOfflineEarnings(null)
    rerender()
  }, [rerender])

  const s = stateRef.current
  return {
    coins: s.coins,
    totalEarned: s.totalEarned,
    totalClicks: s.totalClicks,
    cps: getTotalCPS(s),
    clickValue: getClickValue(s),
    critChance: getCritInfo(s).chance,
    critMultiplier: getCritInfo(s).multiplier,
    generators: s.generators,
    upgrades: s.upgrades,
    achievements: s.achievements,
    research: s.research,
    prestigePoints: s.prestigePoints,
    totalPrestigeEarned: s.totalPrestigeEarned,
    prestigeCount: s.prestigeCount,
    prestigeReward: calcPrestigeReward(s),
    canPrestige: canPrestige(s),
    totalGenerators: getTotalGenerators(s),
    floatingTexts,
    newAchievements,
    offlineEarnings,
    goldenActive,
    goldenTimer,
    handleClick,
    handleBuyGenerator,
    handleBuyUpgrade,
    handleBuyResearch,
    handlePrestige,
    handleGoldenClick,
    dismissOffline,
    dismissAchievement,
    resetGame,
  }
}

// Re-export config for UI usage
export { GENERATORS, UPGRADES, ACHIEVEMENTS, RESEARCH }
export { getGeneratorCost, getGeneratorIncome, getGeneratorBulkCost } from './gameEngine'
export { PRESTIGE_UNLOCK_EARNED } from './gameConfig'
