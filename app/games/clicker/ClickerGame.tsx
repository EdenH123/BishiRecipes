'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameLoop, GENERATORS, UPGRADES, REPEATABLE_UPGRADES, ACHIEVEMENTS, RESEARCH, CHALLENGES, PRESTIGE_UNLOCK_EARNED, PRESTIGE_MILESTONES, GENERATOR_MAX_COUNT } from './useGameLoop'
import { SYNERGY_THRESHOLD } from './gameConfig'
import { fmt, fmtInt, fmtTime } from './formatNumber'

type Tab = 'generators' | 'upgrades' | 'achievements' | 'challenges' | 'prestige' | 'stats'
type BuyAmount = 1 | 10 | 100 | 'max'

export default function ClickerGame() {
  const router = useRouter()
  const g = useGameLoop()
  const [tab, setTab] = useState<Tab>('generators')
  const [buyAmt, setBuyAmt] = useState<BuyAmount>(1)
  const [screenShake, setScreenShake] = useState(false)
  const [showPrestigeAnim, setShowPrestigeAnim] = useState(false)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number; emoji: string }[]>([])
  const particleId = useRef(0)

  // Flavor text rotation
  const FLAVOR_TEXTS = ['💡 טיפ: קומבו מהיר מכפיל הכנסה', '🧆 ידעת? פלאפל הוא המאכל הלאומי', '⭐ כוכבי מישלן = כוח לצמיתות', '🔥 קריטי = ג׳קפוט!', '🌙 גם כשאתה ישן, המטבח עובד', '🎯 אתגרים נותנים בונוסים קבועים', '💪 שדרוגים חוזרים = כוח אינסופי', '🔄 פרסטיג = התחלה חדשה וחזקה']
  const [flavorIdx, setFlavorIdx] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setFlavorIdx(i => (i + 1) % FLAVOR_TEXTS.length), 8000)
    return () => clearInterval(interval)
  }, [FLAVOR_TEXTS.length])

  // Vibrate helper
  const vibrate = useCallback((ms: number) => {
    try { navigator?.vibrate?.(ms) } catch {}
  }, [])

  // Spawn particles from click
  const spawnParticles = useCallback((x: number, y: number, isCrit: boolean) => {
    const count = isCrit ? 12 : 5
    const emojis = isCrit ? ['⭐', '✨', '💥', '🔥'] : ['🍳', '🔥', '✨']
    const newP = Array.from({ length: count }, () => ({
      id: particleId.current++,
      x, y,
      vx: (Math.random() - 0.5) * (isCrit ? 8 : 4),
      vy: -2 - Math.random() * (isCrit ? 6 : 3),
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }))
    setParticles(prev => [...prev.slice(-20), ...newP])
  }, [])

  // Particle cleanup
  useEffect(() => {
    if (particles.length === 0) return
    const timer = setTimeout(() => setParticles(prev => prev.slice(Math.min(5, prev.length))), 600)
    return () => clearTimeout(timer)
  }, [particles])

  // ── Floating texts ──
  const floats = (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {g.floatingTexts.map(ft => (
          <motion.div key={ft.id}
            initial={{ opacity: 1, x: ft.x - 30, y: ft.y - 20, scale: 1 }}
            animate={{ opacity: 0, y: ft.y - 80, scale: ft.isCrit ? 1.8 : 1.2 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
            className={`absolute font-bold pointer-events-none ${ft.isCrit ? 'text-yellow-300 text-xl' : 'text-white text-lg'}`}
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
          >{ft.text}</motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  // ── Offline modal ──
  const offlineModal = g.offlineEarnings !== null && (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-[#2a1a0a] rounded-3xl p-6 text-center max-w-sm w-full border border-amber-500/30">
        <span className="text-5xl block mb-3">🌙</span>
        <h2 className="text-xl font-bold text-amber-100 mb-2">ברוכים השבים!</h2>
        <p className="text-amber-200/60 text-sm mb-4">המטבח המשיך לעבוד בזמן שלא היית</p>
        <p className="text-3xl font-bold text-amber-300 mb-4">+{fmt(g.offlineEarnings)} 🪙</p>
        <button onClick={g.dismissOffline} className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold active:scale-95 transition-transform">אחלה!</button>
      </motion.div>
    </motion.div>
  )

  // ── Achievement popup ──
  const achPopup = g.newAchievements.length > 0 && (() => {
    const def = ACHIEVEMENTS.find(a => a.id === g.newAchievements[0])
    if (!def) return null
    return (
      <motion.div key={def.id} initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
        className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm">
        <div className="bg-[#2a1a0a] border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 shadow-xl cursor-pointer" onClick={g.dismissAchievement}>
          <span className="text-3xl">{def.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-400 font-bold">הישג חדש!</p>
            <p className="text-sm text-amber-100 font-bold truncate">{def.name}</p>
            <p className="text-xs text-amber-200/50">{def.description}</p>
          </div>
        </div>
      </motion.div>
    )
  })()

  // ── Golden dish ──
  const golden = g.goldenActive && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 pointer-events-none"
    >
      {/* Subtle background shimmer */}
      <motion.div
        animate={{ opacity: [0, 0.15, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent"
      />
      <motion.button
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
        transition={{ scale: { repeat: Infinity, duration: 0.7 }, rotate: { repeat: Infinity, duration: 1.2 } }}
        onClick={g.handleGoldenClick}
        className="pointer-events-auto absolute bottom-36 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
      >
        <span className="text-7xl drop-shadow-[0_0_30px_rgba(255,200,0,0.9)]">🍽️</span>
        <div className="bg-amber-900/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
          <span className="text-amber-300 text-xs font-bold">מנה מוזהבת!</span>
          <span className="text-amber-400/60 text-[10px]">{g.goldenTimer}s</span>
        </div>
      </motion.button>
    </motion.div>
  )

  // ── Tutorial hint ──
  const showTutorial = g.totalClicks < 5 && g.totalEarned === 0

  // ── Visibility filters ──
  const visGens = GENERATORS.filter(gen => g.isGenUnlocked(gen.id))
  const visUpgrades = UPGRADES.filter(u => !g.upgrades.has(u.id) && g.totalEarned >= u.unlockAt * 0.5 && (!u.requires || g.upgrades.has(u.requires)))
  const boughtUpgrades = UPGRADES.filter(u => g.upgrades.has(u.id))
  const showPrestige = g.totalEarned >= PRESTIGE_UNLOCK_EARNED || g.prestigeCount > 0

  return (
    <motion.div
      animate={screenShake ? { x: [0, -3, 3, -2, 2, 0], y: [0, -2, 2, -1, 0] } : {}}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-b from-[#1a0f00] via-[#2a1500] to-[#1a0a00] font-rubik select-none" dir="rtl">

      {/* Particles layer */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {particles.map(p => (
            <motion.span key={p.id}
              initial={{ x: p.x - 10, y: p.y - 10, opacity: 1, scale: 1 }}
              animate={{ x: p.x + p.vx * 30, y: p.y + p.vy * 30, opacity: 0, scale: 0.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="absolute text-lg pointer-events-none"
            >{p.emoji}</motion.span>
          ))}
        </AnimatePresence>
      </div>
      {floats}{offlineModal}<AnimatePresence>{achPopup}</AnimatePresence>{golden}

      {/* Prestige animation */}
      <AnimatePresence>
        {showPrestigeAnim && (
          <motion.div key="prestige-anim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.span key={i}
                initial={{ x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400), y: -30, rotate: 0, opacity: 1 }}
                animate={{ y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50, rotate: Math.random() * 720 - 360, opacity: [1, 1, 0] }}
                transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.8, ease: 'easeIn' }}
                className="absolute text-2xl"
              >⭐</motion.span>
            ))}
            <motion.p initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2, times: [0, 0.3, 0.7, 1] }}
              className="absolute top-1/3 left-0 right-0 text-center text-4xl font-bold text-yellow-300 drop-shadow-lg">
              ⭐ פרסטיג! ⭐
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story message toast */}
      <AnimatePresence>
        {g.storyMessage && (
          <motion.div key="story" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            onClick={g.dismissStory}
            className="fixed bottom-28 left-4 right-4 z-50 mx-auto max-w-sm cursor-pointer">
            <div className="bg-[#2a1a0a] border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-xl">
              <span className="text-3xl">{g.storyMessage.emoji}</span>
              <p className="text-sm text-amber-200 font-bold flex-1">{g.storyMessage.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenge complete popup */}
      <AnimatePresence>
        {g.challengeCompleted && (() => {
          const ch = CHALLENGES.find(c => c.id === g.challengeCompleted)
          if (!ch) return null
          return (
            <motion.div key="ch-complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-[#2a1a0a] rounded-3xl p-6 text-center max-w-sm w-full border border-green-500/30">
                <span className="text-5xl block mb-3">🎯</span>
                <h2 className="text-xl font-bold text-green-300 mb-2">אתגר הושלם!</h2>
                <p className="text-amber-200/70 text-sm mb-1">{ch.name}</p>
                <p className="text-green-400/60 text-xs mb-4">{ch.reward.type === 'bonus_stars' ? `+${ch.reward.value} ⭐` : `x${ch.reward.value} קבוע`}</p>
                <button onClick={g.dismissChallengeComplete} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold active:scale-95 transition-transform">מעולה!</button>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Active challenge banner */}
      {g.activeChallenge && (() => {
        const ch = CHALLENGES.find(c => c.id === g.activeChallenge)
        if (!ch) return null
        const progress = Math.min(g.totalEarned / ch.targetEarned * 100, 100)
        return (
          <div className="sticky top-[52px] z-20 bg-red-900/30 border-b border-red-700/30 px-4 py-1.5">
            <div className="max-w-lg mx-auto flex items-center gap-2 text-xs">
              <span>🎯</span>
              <span className="text-red-200 font-bold flex-1 truncate">{ch.name}</span>
              <span className="text-red-300/60 tabular-nums">{Math.floor(progress)}%</span>
              <button onClick={() => { if (confirm('לוותר על האתגר?')) g.handleAbandonChallenge() }} className="text-red-400/40 text-[10px] hover:text-red-300">ויתור</button>
            </div>
            <div className="max-w-lg mx-auto h-0.5 mt-1 rounded-full bg-red-900/30 overflow-hidden">
              <div className="h-full bg-red-500/60 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )
      })()}

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-[#1a0f00] to-[#1a0f00]/90 backdrop-blur-md border-b border-amber-800/20 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => { router.push('/games') }} className="text-amber-400/50 active:scale-90 p-1">
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-lg">🪙</span>
              <motion.p
                key={Math.floor(g.coins)}
                initial={{ y: -4, opacity: 0.7 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-bold text-amber-100 tabular-nums"
              >
                {fmt(g.coins)}
              </motion.p>
            </div>
            <div className="flex items-center justify-center gap-3 text-[10px] text-amber-500/50 mt-0.5">
              <span className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[10px] text-green-500/50">trending_up</span>
                {fmt(g.cps)}/שנייה
              </span>
              <span className="text-amber-800">·</span>
              <span>לחיצה: {fmt(g.clickValue)}</span>
              {g.prestigeCount > 0 && (
                <>
                  <span className="text-amber-800">·</span>
                  <span className="text-purple-400/50">⭐{g.prestigePoints}</span>
                </>
              )}
            </div>
          </div>
          <div className="w-8" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-32">
        {/* ── Click Area ── */}
        <div className="flex flex-col items-center py-6 relative">
          {/* Outer glow ring - pulses with combo */}
          <div className="relative">
            {g.combo > 5 && (
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, rgba(255,180,0,${Math.min(g.combo / 50, 0.4)}) 0%, transparent 70%)`,
                  transform: 'scale(1.8)',
                }}
              />
            )}

            <motion.button
              whileTap={{ scale: 0.85, rotate: -5 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              onTap={(e) => {
                const pe = e as unknown as PointerEvent
                const cx = pe.clientX ?? window.innerWidth / 2
                const cy = pe.clientY ?? window.innerHeight / 3
                g.handleClick(cx, cy)
                vibrate(15)
                // Check if last click was crit (hacky but works - check if float text has isCrit)
                const isCrit = g.critChance > 0 && Math.random() < g.critChance
                spawnParticles(cx, cy, isCrit)
                if (isCrit) { setScreenShake(true); setTimeout(() => setScreenShake(false), 300) }
              }}
              className="relative w-36 h-36 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 35% 35%, #fbbf24, #d97706, #92400e)`,
                boxShadow: `0 0 ${30 + g.combo}px rgba(255,160,0,${0.3 + Math.min(g.combo * 0.01, 0.3)}), inset 0 -4px 12px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.15)`,
              }}
            >
              <motion.span
                className="text-6xl drop-shadow-lg"
                animate={g.combo > 20 ? { rotate: [0, -3, 3, 0] } : {}}
                transition={{ duration: 0.3, repeat: Infinity }}
              >
                {g.currentSkin.emoji}
              </motion.span>

              {/* Inner shine */}
              <div className="absolute top-3 left-5 w-8 h-4 rounded-full bg-white/20 blur-sm rotate-[-20deg]" />
            </motion.button>
          </div>

          {/* Click power label / tutorial */}
          {showTutorial ? (
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="mt-3 text-center"
            >
              <p className="text-amber-300/60 text-sm font-bold">👆 לחצו על המחבת!</p>
              <p className="text-amber-500/30 text-[10px] mt-0.5">כל לחיצה מרוויחה מטבעות שף</p>
            </motion.div>
          ) : (
            <p className="text-amber-400/30 text-xs mt-3">
              {g.combo > 0 ? `🔥 x${g.comboMultiplier.toFixed(1)}` : g.cps > 0 ? `${fmt(g.cps)}/שנייה` : 'לחצו לבשל!'}
            </p>
          )}

          {/* Combo bar */}
          <AnimatePresence>
            {g.combo > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scaleX: 0.5 }}
                animate={{ opacity: 1, y: 0, scaleX: 1 }}
                exit={{ opacity: 0, y: 5 }}
                className="mt-2 w-56"
              >
                <div className="flex items-center justify-between text-[10px] mb-0.5 px-1">
                  <span className={`font-bold ${g.combo >= 25 ? 'text-orange-300' : 'text-amber-400'}`}>
                    קומבו {g.combo}
                  </span>
                  <span className="text-amber-500/50">
                    {g.combo >= 50 ? 'MAX!' : `x${g.comboMultiplier.toFixed(2)}`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-amber-900/30 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      g.combo >= 40 ? 'bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300' :
                      g.combo >= 20 ? 'bg-gradient-to-r from-orange-500 to-amber-400' :
                      'bg-gradient-to-r from-amber-600 to-amber-400'
                    }`}
                    animate={{ width: `${Math.min(g.combo / 50 * 100, 100)}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Crit info */}
          {g.critChance > 0 && (
            <p className="text-amber-500/25 text-[9px] mt-2">
              ⚡ קריטי: {Math.round(g.critChance * 100)}% · x{g.critMultiplier}
            </p>
          )}

          {/* Boost button */}
          <motion.button
            onClick={g.handleBoost}
            disabled={g.boostActive || g.boostCooldown}
            whileTap={{ scale: 0.9 }}
            animate={g.boostActive ? { borderColor: ['rgba(234,179,8,0.5)', 'rgba(234,179,8,1)', 'rgba(234,179,8,0.5)'] } : {}}
            transition={g.boostActive ? { duration: 1, repeat: Infinity } : {}}
            className={`mt-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              g.boostActive ? 'bg-yellow-600/30 border border-yellow-500/50 text-yellow-200' :
              g.boostCooldown ? 'bg-amber-950/20 border border-amber-900/10 text-amber-600/30' :
              'bg-amber-800/25 border border-amber-600/30 text-amber-300 active:scale-95'
            }`}
          >
            {g.boostActive ? '🚀 x5 פעיל!' : g.boostCooldown ? '⏳ מתקרר...' : '🚀 בוסט x5'}
          </motion.button>

          {/* Quest indicator */}
          {g.activeQuest && g.cps > 0 && (
            <div className="mt-2 w-56">
              <div className="flex items-center justify-between text-[9px] px-1">
                <span className="text-amber-400/40">{g.activeQuest.emoji} {g.activeQuest.description}</span>
                <span className="text-amber-500/30">{Math.min(g.questProgress, g.activeQuest.target)}/{g.activeQuest.target}</span>
              </div>
              <div className="h-1 mt-0.5 rounded-full bg-amber-900/20 overflow-hidden">
                <div className="h-full bg-amber-500/40 rounded-full transition-all" style={{ width: `${Math.min(g.questProgress / g.activeQuest.target * 100, 100)}%` }} />
              </div>
              {g.questProgress >= g.activeQuest.target && (
                <button onClick={g.handleClaimQuest} className="mt-1 w-full text-[10px] bg-green-800/30 text-green-300 rounded py-1 font-bold active:scale-95">
                  🎁 אסוף תגמול!
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-0.5 mb-3 bg-[#1a0a00] rounded-xl p-1 overflow-x-auto hide-scrollbar">
          {([
            { key: 'generators' as Tab, label: 'עסקים', icon: '🏪' },
            { key: 'upgrades' as Tab, label: 'שדרוגים', icon: '⬆️' },
            { key: 'achievements' as Tab, label: 'הישגים', icon: '🏆' },
            ...(g.prestigeCount > 0 ? [{ key: 'challenges' as Tab, label: 'אתגרים', icon: '🎯' }] : []),
            ...(showPrestige ? [{ key: 'prestige' as Tab, label: 'מישלן', icon: '⭐' }] : []),
            { key: 'stats' as Tab, label: 'סטטיסטיקות', icon: '📊' },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${tab === t.key ? 'bg-amber-700/50 text-amber-100' : 'text-amber-400/40'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {/* GENERATORS */}
          {tab === 'generators' && (
            <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {/* Buy amount selector */}
              <div className="flex gap-1 mb-2">
                {([1, 10, 100, 'max'] as BuyAmount[]).map(amt => (
                  <button key={String(amt)} onClick={() => setBuyAmt(amt)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${buyAmt === amt ? 'bg-amber-600/60 text-amber-100' : 'bg-amber-900/20 text-amber-500/40'}`}>
                    {amt === 'max' ? 'MAX' : `x${amt}`}
                  </button>
                ))}
              </div>

              {visGens.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <span className="text-4xl">🍳</span>
                  <p className="text-amber-400/30 text-sm">לחצו כדי להרוויח ולפתוח עסקים!</p>
                </div>
              ) : visGens.map(gen => {
                const owned = g.generators[gen.id] || 0
                const count = buyAmt === 'max' ? g.getGenMaxAffordable(gen.id) : (buyAmt as number)
                const cost = buyAmt === 'max' ? (count > 0 ? g.getGenBulkCost(gen.id, count) : g.getGenCost(gen.id)) : g.getGenBulkCost(gen.id, count)
                const atCap = owned >= GENERATOR_MAX_COUNT
                const canAfford = !atCap && g.coins >= cost && count > 0 && g.canBuyGen(gen.id)
                const income = g.getGenIncome(gen.id)
                const synergyTiers = Math.min(Math.floor(owned / SYNERGY_THRESHOLD), 5)
                const nextSynergy = SYNERGY_THRESHOLD - (owned % SYNERGY_THRESHOLD)
                const justBought = g.lastPurchaseId === gen.id
                return (
                  <motion.button key={gen.id} disabled={!canAfford}
                    animate={justBought ? { borderColor: ['rgba(34,197,94,0.6)', 'rgba(217,119,6,0.25)'] } : {}}
                    transition={{ duration: 0.4 }}
                    whileTap={canAfford ? { scale: 0.97 } : {}}
                    onClick={() => buyAmt === 'max' ? g.handleBuyMaxGenerator(gen.id) : g.handleBuyGenerator(gen.id, buyAmt as number)}
                    className={`w-full flex items-center gap-3 rounded-2xl p-3.5 text-right transition-all ${canAfford ? 'bg-amber-900/25 border border-amber-700/25 hover:bg-amber-900/35' : 'bg-amber-950/15 border border-amber-900/10 opacity-40'}`}>
                    <div className="relative">
                      <span className="text-3xl">{gen.emoji}</span>
                      {synergyTiers > 0 && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-[8px] text-white font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {synergyTiers}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-amber-100 truncate">{gen.name}</p>
                        {owned > 0 && (
                          <span className="bg-amber-700/40 text-amber-200 text-[10px] px-1.5 py-0.5 rounded-md font-bold tabular-nums">{owned}</span>
                        )}
                      </div>
                      {owned > 0 ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-green-400/60">{fmt(income)}/שנייה</span>
                          {owned < 200 && (
                            <span className="text-[9px] text-amber-600/40">סינרג׳י עוד {nextSynergy}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-400/35 mt-0.5">{gen.description}</p>
                      )}
                      {/* Synergy progress mini-bar */}
                      {owned > 0 && owned < 200 && (
                        <div className="h-0.5 mt-1 rounded-full bg-amber-900/20 overflow-hidden w-full">
                          <div className="h-full bg-amber-600/40 rounded-full" style={{ width: `${(owned % SYNERGY_THRESHOLD) / SYNERGY_THRESHOLD * 100}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="text-left shrink-0">
                      {atCap ? (
                        <p className="text-xs text-amber-500/40 font-bold">MAX</p>
                      ) : (
                        <>
                          <p className={`text-sm font-bold tabular-nums ${canAfford ? 'text-amber-300' : 'text-amber-600'}`}>{fmt(cost)}</p>
                          <p className="text-[9px] text-amber-500/30">{buyAmt === 'max' ? (count > 0 ? `x${count}` : '') : buyAmt !== 1 ? `x${buyAmt}` : ''}</p>
                        </>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          )}

          {/* UPGRADES */}
          {tab === 'upgrades' && (
            <motion.div key="upg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {visUpgrades.length === 0 && boughtUpgrades.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <span className="text-4xl">⬆️</span>
                  <p className="text-amber-400/30 text-sm">שדרוגים יפתחו בהמשך</p>
                </div>
              ) : (
                <>
                  {/* Group by category */}
                  {(['click', 'generator', 'global', 'crit', 'combo', 'offline'] as const).map(cat => {
                    const catUpgrades = visUpgrades.filter(u => u.category === cat)
                    if (catUpgrades.length === 0) return null
                    const catLabels: Record<string, string> = { click: '👆 לחיצה', generator: '🏪 עסקים', global: '🌍 כלכלה', crit: '⚡ קריטי', combo: '🔥 קומבו', offline: '🌙 אופליין' }
                    return (
                      <div key={cat}>
                        <p className="text-[10px] text-amber-500/30 font-bold mb-1.5 px-1">{catLabels[cat]}</p>
                        <div className="space-y-1.5">
                          {catUpgrades.map(u => {
                            const canAfford = g.coins >= u.cost
                            return (
                              <motion.button key={u.id} onClick={() => g.handleBuyUpgrade(u.id)} disabled={!canAfford}
                                whileTap={canAfford ? { scale: 0.97 } : {}}
                                className={`w-full flex items-center gap-3 rounded-2xl p-3 text-right transition-all ${canAfford ? 'bg-blue-900/15 border border-blue-700/25 hover:bg-blue-900/25' : 'bg-blue-950/10 border border-blue-900/8 opacity-40'}`}>
                                <span className="text-2xl">{u.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-blue-100 truncate">{u.name}</p>
                                  <p className="text-[10px] text-blue-300/35">{u.description}</p>
                                </div>
                                <p className={`text-sm font-bold shrink-0 tabular-nums ${canAfford ? 'text-blue-300' : 'text-blue-700'}`}>{fmt(u.cost)}</p>
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  {boughtUpgrades.length > 0 && (
                    <div className="pt-3 border-t border-amber-900/15">
                      <p className="text-[10px] text-amber-400/25 mb-2">נרכשו ({boughtUpgrades.length}/{UPGRADES.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {boughtUpgrades.map(u => (
                          <span key={u.id} className="text-lg opacity-80 hover:opacity-100 transition-opacity" title={`${u.name}: ${u.description}`}>{u.emoji}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Repeatable upgrades */}
                  {REPEATABLE_UPGRADES.filter(rp => g.totalEarned >= rp.unlockAt).length > 0 && (
                    <div className="pt-3 border-t border-amber-900/15">
                      <p className="text-[10px] text-amber-500/30 font-bold mb-1.5 px-1">🔄 שדרוגים חוזרים</p>
                      <div className="space-y-1.5">
                        {REPEATABLE_UPGRADES.filter(rp => g.totalEarned >= rp.unlockAt).map(rp => {
                          const level = g.repeatableUpgrades[rp.id] || 0
                          const maxed = level >= rp.maxLevel
                          const cost = g.getRepeatCost(rp.id)
                          const canAfford = !maxed && g.coins >= cost
                          return (
                            <motion.button key={rp.id} onClick={() => g.handleBuyRepeatable(rp.id)} disabled={!canAfford && !maxed}
                              whileTap={canAfford ? { scale: 0.97 } : {}}
                              className={`w-full flex items-center gap-3 rounded-2xl p-3 text-right transition-all ${maxed ? 'bg-green-900/10 border border-green-700/15' : canAfford ? 'bg-amber-900/15 border border-amber-700/20 hover:bg-amber-900/25' : 'bg-amber-950/10 border border-amber-900/8 opacity-40'}`}>
                              <span className="text-2xl">{rp.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-amber-100 truncate">{rp.name}</p>
                                  <span className="text-[10px] bg-amber-700/30 text-amber-200 px-1.5 py-0.5 rounded font-bold">{level}/{rp.maxLevel}</span>
                                </div>
                                <p className="text-[10px] text-amber-400/35">{rp.description}</p>
                              </div>
                              {maxed ? <span className="text-green-400 text-xs">MAX</span> : <p className={`text-sm font-bold shrink-0 tabular-nums ${canAfford ? 'text-amber-300' : 'text-amber-600'}`}>{fmt(cost)}</p>}
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Daily bonus */}
                  {g.dailyAmount > 0 && (
                    <div className="pt-3 border-t border-amber-900/15">
                      <motion.button
                        onClick={g.handleClaimDaily}
                        disabled={!g.dailyAvailable}
                        animate={g.dailyAvailable ? { borderColor: ['rgba(234,179,8,0.3)', 'rgba(234,179,8,0.6)', 'rgba(234,179,8,0.3)'] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-full rounded-2xl p-4 text-center transition-all ${g.dailyAvailable ? 'bg-yellow-900/20 border border-yellow-600/30' : 'bg-amber-950/10 border border-amber-900/10 opacity-40'}`}>
                        <p className="text-lg mb-1">🎁</p>
                        <p className="text-sm font-bold text-yellow-200">{g.dailyAvailable ? 'בונוס יומי!' : 'בונוס יומי (נאסף)'}</p>
                        <p className="text-xs text-yellow-300/50">+{fmt(g.dailyAmount)} 🪙 {g.dailyStreak > 0 && `(סטריק: ${g.dailyStreak} ימים)`}</p>
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ACHIEVEMENTS */}
          {tab === 'achievements' && (
            <motion.div key="ach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
              {ACHIEVEMENTS.filter(a => !a.hidden || g.achievements.has(a.id)).map(ach => {
                const unlocked = g.achievements.has(ach.id)
                return (
                  <div key={ach.id} className={`flex items-center gap-3 rounded-xl p-3 ${unlocked ? 'bg-amber-900/20 border border-amber-700/20' : 'bg-amber-950/10 border border-amber-900/5 opacity-30'}`}>
                    <span className="text-xl">{unlocked ? ach.emoji : '🔒'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${unlocked ? 'text-amber-100' : 'text-amber-500/40'}`}>{ach.name}</p>
                      <p className="text-[10px] text-amber-400/35">{ach.description}</p>
                    </div>
                    {unlocked && <span className="text-green-400 text-xs">✓</span>}
                  </div>
                )
              })}
              <p className="text-center text-[10px] text-amber-500/25 pt-2">{g.achievements.size}/{ACHIEVEMENTS.length} הישגים</p>
            </motion.div>
          )}

          {/* CHALLENGES */}
          {tab === 'challenges' && (
            <motion.div key="chal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {g.activeChallenge && (
                <div className="bg-red-900/20 border border-red-700/20 rounded-2xl p-3 text-center mb-3">
                  <p className="text-red-300/60 text-xs">אתגר פעיל - {CHALLENGES.find(c => c.id === g.activeChallenge)?.name}</p>
                  <p className="text-red-200 text-sm font-bold mt-1">{fmt(g.totalEarned)} / {fmt(CHALLENGES.find(c => c.id === g.activeChallenge)?.targetEarned || 0)}</p>
                </div>
              )}
              {CHALLENGES.filter(ch => g.prestigeCount >= ch.unlockAtPrestige || g.completedChallenges.has(ch.id)).map(ch => {
                const completed = g.completedChallenges.has(ch.id)
                const isActive = g.activeChallenge === ch.id
                const canStart = !g.activeChallenge && !completed
                return (
                  <div key={ch.id} className={`rounded-2xl p-3.5 border transition-all ${completed ? 'bg-green-900/15 border-green-700/20' : isActive ? 'bg-red-900/15 border-red-700/20' : 'bg-amber-900/15 border-amber-800/15'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{ch.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${completed ? 'text-green-200' : 'text-amber-100'}`}>{ch.name}</p>
                        <p className="text-[10px] text-amber-400/40">{ch.description}</p>
                        <p className="text-[9px] text-amber-500/30 mt-0.5">
                          תגמול: {ch.reward.type === 'bonus_stars' ? `+${ch.reward.value} ⭐` : ch.reward.type === 'permanent_multiply_all' ? `x${ch.reward.value} הכנסה קבועה` : ch.reward.type === 'permanent_multiply_click' ? `x${ch.reward.value} לחיצה קבועה` : `x${ch.reward.value} פרסטיג קבוע`}
                        </p>
                      </div>
                      {completed ? (
                        <span className="text-green-400 text-sm">✓</span>
                      ) : canStart ? (
                        <button
                          onClick={() => { if (confirm(`להתחיל את "${ch.name}"? ההתקדמות הנוכחית תאופס.`)) g.handleStartChallenge(ch.id) }}
                          className="shrink-0 bg-amber-700/40 text-amber-200 text-xs px-3 py-1.5 rounded-lg font-bold active:scale-95">
                          התחל
                        </button>
                      ) : isActive ? (
                        <span className="text-red-400/60 text-xs font-bold">פעיל</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
              {CHALLENGES.filter(ch => g.prestigeCount >= ch.unlockAtPrestige || g.completedChallenges.has(ch.id)).length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10">
                  <span className="text-4xl">🎯</span>
                  <p className="text-amber-400/30 text-sm">אתגרים נפתחים אחרי פרסטיג ראשון</p>
                </div>
              )}
            </motion.div>
          )}

          {/* PRESTIGE */}
          {tab === 'prestige' && (
            <motion.div key="prs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-4 text-center">
                <p className="text-purple-300/60 text-xs mb-1">כוכבי מישלן</p>
                <p className="text-3xl font-bold text-purple-200">{fmtInt(g.prestigePoints)} ⭐</p>
                {g.totalPrestigeEarned > 0 && <p className="text-[9px] text-purple-400/40 mt-1">סה״כ: {fmtInt(g.totalPrestigeEarned)} · איפוסים: {g.prestigeCount}</p>}
              </div>
              <div className="bg-purple-900/10 border border-purple-800/20 rounded-xl p-4 text-center">
                <p className="text-purple-300/50 text-xs mb-2">אפס התקדמות ← כוכבי מישלן קבועים</p>
                <p className="text-lg font-bold text-purple-200 mb-3">{g.canPrestige ? `+${fmtInt(g.prestigeReward)} ⭐` : `צריך ${fmt(PRESTIGE_UNLOCK_EARNED)} סה"כ`}</p>
                <button onClick={() => { if (confirm('לאפס תמורת כוכבי מישלן? עסקים ושדרוגים יאופסו, מחקרים נשארים.')) { g.handlePrestige(); setShowPrestigeAnim(true); vibrate(100); setTimeout(() => setShowPrestigeAnim(false), 2500) } }}
                  disabled={!g.canPrestige}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${g.canPrestige ? 'bg-purple-600 text-white active:scale-95' : 'bg-purple-900/20 text-purple-600/30'}`}>
                  פרסטיג!
                </button>
              </div>

              {/* Research */}
              {(RESEARCH.some(r => !g.research.has(r.id) && g.totalPrestigeEarned >= r.unlockAtPrestige && (!r.requires || g.research.has(r.requires))) || g.research.size > 0) && (
                <div>
                  <p className="text-purple-300/50 text-xs mb-2 font-bold">🔬 מחקר קבוע</p>
                  {['click', 'automation', 'economy', 'prestige', 'events'].map(branch => {
                    const items = RESEARCH.filter(r => r.branch === branch && (g.research.has(r.id) || (g.totalPrestigeEarned >= r.unlockAtPrestige && (!r.requires || g.research.has(r.requires)))))
                    if (items.length === 0) return null
                    const branchLabels: Record<string, string> = { click: '👆 לחיצה', automation: '🤖 אוטומציה', economy: '📦 כלכלה', prestige: '⭐ פרסטיג', events: '🎲 אירועים' }
                    return (
                      <div key={branch} className="mb-3">
                        <p className="text-[10px] text-purple-400/30 mb-1">{branchLabels[branch]}</p>
                        <div className="space-y-1.5">
                          {items.map(r => {
                            const purchased = g.research.has(r.id)
                            const canAfford = !purchased && g.prestigePoints >= r.cost
                            return (
                              <button key={r.id} onClick={() => !purchased && g.handleBuyResearch(r.id)} disabled={purchased || !canAfford}
                                className={`w-full flex items-center gap-3 rounded-xl p-2.5 text-right transition-all ${purchased ? 'bg-purple-800/15 border border-purple-600/20' : canAfford ? 'bg-purple-900/15 border border-purple-700/25 active:scale-[0.98]' : 'bg-purple-950/10 border border-purple-900/5 opacity-40'}`}>
                                <span className="text-lg">{r.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-purple-200 truncate">{r.name}</p>
                                  <p className="text-[9px] text-purple-400/35">{r.description}</p>
                                </div>
                                {purchased ? <span className="text-green-400 text-[10px]">✓</span> : <p className={`text-xs font-bold shrink-0 ${canAfford ? 'text-purple-300' : 'text-purple-600'}`}>{r.cost} ⭐</p>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Prestige milestones */}
              <div>
                <p className="text-purple-300/50 text-xs mb-2 font-bold">🏅 אבני דרך</p>
                <div className="flex flex-wrap gap-2">
                  {PRESTIGE_MILESTONES.map(m => {
                    const reached = g.prestigeCount >= m.count
                    return (
                      <div key={m.count} className={`rounded-xl px-3 py-2 text-center ${reached ? 'bg-purple-800/20 border border-purple-600/20' : 'bg-purple-950/10 border border-purple-900/10 opacity-30'}`}>
                        <span className="text-lg">{m.emoji}</span>
                        <p className="text-[9px] text-purple-300/50 mt-0.5">{m.label}</p>
                        <p className="text-[8px] text-purple-400/30">פרסטיג x{m.count}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Auto-buy indicator */}
              {g.autoBuyEnabled && (
                <div className="bg-green-900/15 border border-green-700/20 rounded-xl p-3 text-center">
                  <p className="text-green-300/60 text-xs">🔄 קנייה אוטומטית פעילה</p>
                  <p className="text-[10px] text-green-400/40">קונה את העסק הכי יעיל כל 2 שניות</p>
                </div>
              )}
            </motion.div>
          )}

          {/* STATS */}
          {tab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  {[
                    ['סה״כ הרווחת', fmt(g.totalEarned)],
                    ['סה״כ לחיצות', fmtInt(g.totalClicks)],
                    ['הכנסה/שנייה', fmt(g.cps)],
                    ['כוח לחיצה', fmt(g.clickValue)],
                    ['שיא הכנסה/שנייה', fmt(g.stats.bestCps)],
                    ['שיא קומבו', String(g.stats.bestCombo)],
                    ['לחיצות קריטיות', fmtInt(g.stats.totalCritClicks)],
                    ['סה״כ עסקים', String(g.totalGenerators)],
                    ['שדרוגים', String(g.upgrades.size)],
                    ['הישגים', `${g.achievements.size}/${ACHIEVEMENTS.length}`],
                    ['מחקרים', `${g.research.size}/${RESEARCH.length}`],
                    ['כוכבי מישלן', fmtInt(g.totalPrestigeEarned)],
                    ['איפוסים', String(g.prestigeCount)],
                    ['הכנסה אופליין', fmt(g.stats.totalOfflineEarned)],
                    ['אירועים', String(g.stats.totalEventsClicked)],
                    ['זמן משחק', fmtTime(g.stats.totalPlaytimeMs / 1000 + (Date.now() - g.stats.sessionStartedAt) / 1000)],
                  ].map(([label, value]) => (
                    <><div key={label} className="text-amber-400/35">{label}</div><div className="text-amber-200 text-left">{value}</div></>
                  ))}
                </div>
              </div>
              <button onClick={() => { if (confirm('למחוק הכל? בלתי הפיך!')) { if (confirm('בטוח?')) g.resetGame() } }}
                className="w-full mt-4 py-2 rounded-xl border border-red-900/30 text-red-400/30 text-xs hover:text-red-400 transition-colors">
                מחק שמירה
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flavor text */}
        <AnimatePresence mode="wait">
          <motion.p key={flavorIdx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-center text-[10px] text-amber-600/25 mt-6 pb-4">
            {FLAVOR_TEXTS[flavorIdx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
