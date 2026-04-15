'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameLoop, GENERATORS, UPGRADES, ACHIEVEMENTS, RESEARCH, PRESTIGE_UNLOCK_EARNED } from './useGameLoop'
import { fmt, fmtInt, fmtTime } from './formatNumber'

type Tab = 'generators' | 'upgrades' | 'achievements' | 'prestige' | 'stats'
type BuyAmount = 1 | 10 | 100 | 'max'

export default function ClickerGame() {
  const router = useRouter()
  const g = useGameLoop()
  const [tab, setTab] = useState<Tab>('generators')
  const [buyAmt, setBuyAmt] = useState<BuyAmount>(1)

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
    <motion.button initial={{ scale: 0, rotate: -180 }} animate={{ scale: [1, 1.1, 1], rotate: 0 }}
      transition={{ scale: { repeat: Infinity, duration: 0.6 }, rotate: { duration: 0.5 } }}
      onClick={g.handleGoldenClick}
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 text-6xl drop-shadow-[0_0_20px_rgba(255,200,0,0.8)]">
      🍽️<span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-amber-300 font-bold">{g.goldenTimer}s</span>
    </motion.button>
  )

  // ── Visibility filters ──
  const visGens = GENERATORS.filter(gen => g.totalEarned >= gen.unlockAt || (g.generators[gen.id] || 0) > 0)
  const visUpgrades = UPGRADES.filter(u => !g.upgrades.has(u.id) && g.totalEarned >= u.unlockAt * 0.5 && (!u.requires || g.upgrades.has(u.requires)))
  const boughtUpgrades = UPGRADES.filter(u => g.upgrades.has(u.id))
  const showPrestige = g.totalEarned >= PRESTIGE_UNLOCK_EARNED || g.prestigeCount > 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0f00] via-[#2a1500] to-[#1a0a00] font-rubik select-none" dir="rtl">
      {floats}{offlineModal}<AnimatePresence>{achPopup}</AnimatePresence>{golden}

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
                g.handleClick(pe.clientX ?? window.innerWidth / 2, pe.clientY ?? window.innerHeight / 3)
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
                🍳
              </motion.span>

              {/* Inner shine */}
              <div className="absolute top-3 left-5 w-8 h-4 rounded-full bg-white/20 blur-sm rotate-[-20deg]" />
            </motion.button>
          </div>

          {/* Click power label */}
          <p className="text-amber-400/30 text-xs mt-3">
            {g.combo > 0 ? `🔥 x${g.comboMultiplier.toFixed(1)}` : 'לחצו לבשל!'}
          </p>

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
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-0.5 mb-3 bg-[#1a0a00] rounded-xl p-1 overflow-x-auto hide-scrollbar">
          {([
            { key: 'generators' as Tab, label: 'עסקים', icon: '🏪' },
            { key: 'upgrades' as Tab, label: 'שדרוגים', icon: '⬆️' },
            { key: 'achievements' as Tab, label: 'הישגים', icon: '🏆' },
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
                <p className="text-center text-amber-400/30 py-8 text-sm">לחצו כדי להרוויח ולפתוח עסקים!</p>
              ) : visGens.map(gen => {
                const owned = g.generators[gen.id] || 0
                const count = buyAmt === 'max' ? g.getGenMaxAffordable(gen.id) : (buyAmt as number)
                const cost = buyAmt === 'max' ? (count > 0 ? g.getGenBulkCost(gen.id, count) : g.getGenCost(gen.id)) : g.getGenBulkCost(gen.id, count)
                const canAfford = g.coins >= cost && count > 0
                const income = g.getGenIncome(gen.id)
                return (
                  <button key={gen.id} disabled={!canAfford}
                    onClick={() => buyAmt === 'max' ? g.handleBuyMaxGenerator(gen.id) : g.handleBuyGenerator(gen.id, buyAmt as number)}
                    className={`w-full flex items-center gap-3 rounded-xl p-3 text-right transition-all ${canAfford ? 'bg-amber-900/30 border border-amber-700/30 active:scale-[0.98]' : 'bg-amber-950/20 border border-amber-900/10 opacity-40'}`}>
                    <span className="text-2xl">{gen.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-amber-100 truncate">{gen.name}</p>
                        {owned > 0 && <span className="bg-amber-700/40 text-amber-200 text-[10px] px-1.5 py-0.5 rounded font-bold">{owned}</span>}
                      </div>
                      <p className="text-[10px] text-amber-400/40">{gen.description}</p>
                      {owned > 0 && <p className="text-[10px] text-green-400/50">{fmt(income)}/שנייה</p>}
                    </div>
                    <div className="text-left shrink-0">
                      <p className={`text-sm font-bold ${canAfford ? 'text-amber-300' : 'text-amber-600'}`}>{fmt(cost)} 🪙</p>
                      {buyAmt !== 1 && <p className="text-[9px] text-amber-500/40">{buyAmt === 'max' ? `x${count}` : `x${buyAmt}`}</p>}
                    </div>
                  </button>
                )
              })}
            </motion.div>
          )}

          {/* UPGRADES */}
          {tab === 'upgrades' && (
            <motion.div key="upg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {visUpgrades.length === 0 && boughtUpgrades.length === 0 ? (
                <p className="text-center text-amber-400/30 py-8 text-sm">שדרוגים יפתחו בהמשך</p>
              ) : (
                <>
                  {visUpgrades.map(u => {
                    const canAfford = g.coins >= u.cost
                    return (
                      <button key={u.id} onClick={() => g.handleBuyUpgrade(u.id)} disabled={!canAfford}
                        className={`w-full flex items-center gap-3 rounded-xl p-3 text-right transition-all ${canAfford ? 'bg-blue-900/20 border border-blue-700/30 active:scale-[0.98]' : 'bg-blue-950/10 border border-blue-900/10 opacity-40'}`}>
                        <span className="text-2xl">{u.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-blue-100 truncate">{u.name}</p>
                          <p className="text-[10px] text-blue-300/40">{u.description}</p>
                        </div>
                        <p className={`text-sm font-bold shrink-0 ${canAfford ? 'text-blue-300' : 'text-blue-600'}`}>{fmt(u.cost)} 🪙</p>
                      </button>
                    )
                  })}
                  {boughtUpgrades.length > 0 && (
                    <div className="pt-3 border-t border-amber-900/20">
                      <p className="text-[10px] text-amber-400/25 mb-2">נרכשו ({boughtUpgrades.length}):</p>
                      <div className="flex flex-wrap gap-1.5">{boughtUpgrades.map(u => <span key={u.id} className="text-lg" title={u.name}>{u.emoji}</span>)}</div>
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
                <button onClick={() => { if (confirm('לאפס תמורת כוכבי מישלן? עסקים ושדרוגים יאופסו, מחקרים נשארים.')) g.handlePrestige() }}
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
      </div>
    </div>
  )
}
