'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useGameLoop, GENERATORS, UPGRADES, ACHIEVEMENTS, RESEARCH,
  getGeneratorCost, getGeneratorIncome, PRESTIGE_UNLOCK_EARNED,
} from './useGameLoop'
import { fmt, fmtInt } from './formatNumber'

type Tab = 'generators' | 'upgrades' | 'achievements' | 'prestige'

export default function ClickerGame() {
  const router = useRouter()
  const game = useGameLoop()
  const [tab, setTab] = useState<Tab>('generators')

  // ── Floating click texts (portal-style, fixed position) ──
  const floatingTexts = (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {game.floatingTexts.map(ft => (
          <motion.div
            key={ft.id}
            initial={{ opacity: 1, x: ft.x - 30, y: ft.y - 20, scale: 1 }}
            animate={{ opacity: 0, y: ft.y - 80, scale: ft.isCrit ? 1.8 : 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`absolute text-lg font-bold pointer-events-none ${ft.isCrit ? 'text-yellow-300' : 'text-white'}`}
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
          >
            {ft.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  // ── Offline earnings modal ──
  const offlineModal = game.offlineEarnings !== null && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#2a1a0a] rounded-3xl p-6 text-center max-w-sm w-full border border-amber-500/30"
      >
        <span className="text-5xl block mb-3">🌙</span>
        <h2 className="text-xl font-bold text-amber-100 mb-2">ברוכים השבים!</h2>
        <p className="text-amber-200/70 text-sm mb-4">בזמן שלא היית, המטבח המשיך לעבוד</p>
        <p className="text-3xl font-bold text-amber-300 mb-4">+{fmt(game.offlineEarnings)} 🪙</p>
        <button
          onClick={game.dismissOffline}
          className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold active:scale-95 transition-transform"
        >
          אחלה!
        </button>
      </motion.div>
    </motion.div>
  )

  // ── Achievement popup ──
  const achievementPopup = game.newAchievements.length > 0 && (() => {
    const achId = game.newAchievements[0]
    const def = ACHIEVEMENTS.find(a => a.id === achId)
    if (!def) return null
    return (
      <motion.div
        key={achId}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm"
      >
        <div
          className="bg-[#2a1a0a] border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 shadow-xl cursor-pointer"
          onClick={game.dismissAchievement}
        >
          <span className="text-3xl">{def.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-400 font-bold">הישג חדש!</p>
            <p className="text-sm text-amber-100 font-bold truncate">{def.name}</p>
            <p className="text-xs text-amber-200/60">{def.description}</p>
          </div>
        </div>
      </motion.div>
    )
  })()

  // ── Golden falafel ──
  const goldenFalafel = game.goldenActive && (
    <motion.button
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: [1, 1.1, 1], rotate: 0 }}
      transition={{ scale: { repeat: Infinity, duration: 0.6 }, rotate: { duration: 0.5 } }}
      onClick={game.handleGoldenClick}
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 text-6xl drop-shadow-[0_0_20px_rgba(255,200,0,0.8)]"
    >
      🧆
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-amber-300 font-bold whitespace-nowrap">
        {game.goldenTimer}s
      </span>
    </motion.button>
  )

  // ── Visible generators ──
  const visibleGenerators = GENERATORS.filter(g => game.totalEarned >= g.unlockAt || (game.generators[g.id] || 0) > 0)
  const visibleUpgrades = UPGRADES.filter(u => {
    if (game.upgrades.has(u.id)) return false
    if (game.totalEarned < u.unlockAt * 0.5) return false
    if (u.requires && !game.upgrades.has(u.requires)) return false
    return true
  })
  const visibleResearch = RESEARCH.filter(r => {
    if (game.research.has(r.id)) return false
    if (game.totalPrestigeEarned < r.unlockAtPrestige) return false
    if (r.requires && !game.research.has(r.requires)) return false
    return true
  })
  const purchasedUpgrades = UPGRADES.filter(u => game.upgrades.has(u.id))

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0f00] via-[#2a1500] to-[#1a0a00] font-rubik select-none" dir="rtl">
      {floatingTexts}
      {offlineModal}
      <AnimatePresence>{achievementPopup}</AnimatePresence>
      {goldenFalafel}

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-[#1a0f00]/90 backdrop-blur-md border-b border-amber-900/30 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => router.push('/games')} className="text-amber-400/60 text-sm active:scale-95">
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-100">{fmt(game.coins)} 🪙</p>
            <p className="text-xs text-amber-400/60">{fmt(game.cps)}/שנייה · לחיצה: {fmt(game.clickValue)}</p>
          </div>
          <div className="w-6" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-32">
        {/* ── Click Area ── */}
        <div className="flex flex-col items-center py-8">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onTap={(e) => {
              const pe = e as unknown as PointerEvent
              game.handleClick(pe.clientX ?? window.innerWidth / 2, pe.clientY ?? window.innerHeight / 3)
            }}
            className="relative w-32 h-32 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 shadow-[0_0_40px_rgba(255,160,0,0.3)] flex items-center justify-center active:shadow-[0_0_60px_rgba(255,160,0,0.5)] transition-shadow"
          >
            <span className="text-6xl">🍳</span>
          </motion.button>
          <p className="text-amber-400/40 text-xs mt-3">לחצו לבשל!</p>
          {game.critChance > 0 && (
            <p className="text-amber-500/40 text-[10px] mt-1">
              קריטי: {Math.round(game.critChance * 100)}% · x{game.critMultiplier}
            </p>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-4 bg-[#1a0a00] rounded-xl p-1">
          {([
            { key: 'generators' as Tab, label: 'עסקים', icon: '🏪' },
            { key: 'upgrades' as Tab, label: 'שדרוגים', icon: '⬆️' },
            { key: 'achievements' as Tab, label: 'הישגים', icon: '🏆' },
            ...(game.totalEarned >= PRESTIGE_UNLOCK_EARNED || game.prestigeCount > 0
              ? [{ key: 'prestige' as Tab, label: 'פרסטיז\'', icon: '✨' }]
              : []),
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                tab === t.key
                  ? 'bg-amber-700/50 text-amber-100'
                  : 'text-amber-400/50 hover:text-amber-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {tab === 'generators' && (
            <motion.div key="gen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
              {visibleGenerators.length === 0 ? (
                <p className="text-center text-amber-400/40 py-8 text-sm">לחצו כדי להרוויח מטבעות ולפתוח עסקים!</p>
              ) : (
                visibleGenerators.map(gen => {
                  const owned = game.generators[gen.id] || 0
                  const cost = getGeneratorCost(gen.id, owned)
                  const income = getGeneratorIncome(game as never, gen.id)
                  const canAfford = game.coins >= cost
                  return (
                    <button
                      key={gen.id}
                      onClick={() => game.handleBuyGenerator(gen.id)}
                      disabled={!canAfford}
                      className={`w-full flex items-center gap-3 rounded-xl p-3 text-right transition-all ${
                        canAfford
                          ? 'bg-amber-900/30 border border-amber-700/30 active:scale-[0.98]'
                          : 'bg-amber-950/20 border border-amber-900/10 opacity-50'
                      }`}
                    >
                      <span className="text-2xl">{gen.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-amber-100 truncate">{gen.name}</p>
                          {owned > 0 && (
                            <span className="bg-amber-700/40 text-amber-200 text-[10px] px-1.5 py-0.5 rounded font-bold">{owned}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-amber-400/50">{gen.description}</p>
                        {owned > 0 && <p className="text-[10px] text-green-400/60">{fmt(income)}/שנייה</p>}
                      </div>
                      <div className="text-left shrink-0">
                        <p className={`text-sm font-bold ${canAfford ? 'text-amber-300' : 'text-amber-600'}`}>{fmt(cost)} 🪙</p>
                      </div>
                    </button>
                  )
                })
              )}
            </motion.div>
          )}

          {tab === 'upgrades' && (
            <motion.div key="upg" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
              {visibleUpgrades.length === 0 && purchasedUpgrades.length === 0 ? (
                <p className="text-center text-amber-400/40 py-8 text-sm">שדרוגים יפתחו בהמשך ההתקדמות</p>
              ) : (
                <>
                  {visibleUpgrades.map(upg => {
                    const canAfford = game.coins >= upg.cost
                    return (
                      <button
                        key={upg.id}
                        onClick={() => game.handleBuyUpgrade(upg.id)}
                        disabled={!canAfford}
                        className={`w-full flex items-center gap-3 rounded-xl p-3 text-right transition-all ${
                          canAfford
                            ? 'bg-blue-900/20 border border-blue-700/30 active:scale-[0.98]'
                            : 'bg-blue-950/10 border border-blue-900/10 opacity-50'
                        }`}
                      >
                        <span className="text-2xl">{upg.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-blue-100 truncate">{upg.name}</p>
                          <p className="text-[11px] text-blue-300/50">{upg.description}</p>
                        </div>
                        <p className={`text-sm font-bold shrink-0 ${canAfford ? 'text-blue-300' : 'text-blue-600'}`}>{fmt(upg.cost)} 🪙</p>
                      </button>
                    )
                  })}
                  {purchasedUpgrades.length > 0 && (
                    <div className="pt-4 border-t border-amber-900/20">
                      <p className="text-xs text-amber-400/30 mb-2">נרכשו:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {purchasedUpgrades.map(u => (
                          <span key={u.id} className="text-lg" title={u.name}>{u.emoji}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {tab === 'achievements' && (
            <motion.div key="ach" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
              {ACHIEVEMENTS.map(ach => {
                const unlocked = game.achievements.has(ach.id)
                return (
                  <div
                    key={ach.id}
                    className={`flex items-center gap-3 rounded-xl p-3 ${
                      unlocked
                        ? 'bg-amber-900/20 border border-amber-700/20'
                        : 'bg-amber-950/10 border border-amber-900/5 opacity-40'
                    }`}
                  >
                    <span className="text-2xl">{unlocked ? ach.emoji : '🔒'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${unlocked ? 'text-amber-100' : 'text-amber-500/50'}`}>{ach.name}</p>
                      <p className="text-[11px] text-amber-400/40">{ach.description}</p>
                    </div>
                    {unlocked && <span className="text-green-400 text-xs">✓</span>}
                  </div>
                )
              })}
            </motion.div>
          )}

          {tab === 'prestige' && (
            <motion.div key="prs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Prestige info */}
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-4 text-center">
                <p className="text-purple-300 text-sm mb-1">נקודות פרסטיז׳</p>
                <p className="text-3xl font-bold text-purple-200">{fmtInt(game.prestigePoints)} ✨</p>
                {game.totalPrestigeEarned > 0 && (
                  <p className="text-[10px] text-purple-400/50 mt-1">סה״כ הרווחת: {fmtInt(game.totalPrestigeEarned)} · איפוסים: {game.prestigeCount}</p>
                )}
              </div>

              {/* Prestige button */}
              <div className="bg-purple-900/10 border border-purple-800/20 rounded-xl p-4 text-center">
                <p className="text-purple-300/60 text-xs mb-2">אפס התקדמות ותרוויח נקודות קבועות</p>
                <p className="text-lg font-bold text-purple-200 mb-3">
                  {game.canPrestige ? `+${fmtInt(game.prestigeReward)} ✨` : `צריך ${fmt(PRESTIGE_UNLOCK_EARNED)} סה"כ`}
                </p>
                <button
                  onClick={() => {
                    if (confirm('לאפס את ההתקדמות תמורת נקודות פרסטיז\'? העסקים והשדרוגים יאופסו, אבל המחקרים נשארים.')) {
                      game.handlePrestige()
                    }
                  }}
                  disabled={!game.canPrestige}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    game.canPrestige
                      ? 'bg-purple-600 text-white active:scale-95'
                      : 'bg-purple-900/20 text-purple-600/40'
                  }`}
                >
                  פרסטיז׳!
                </button>
              </div>

              {/* Research tree */}
              {(visibleResearch.length > 0 || game.research.size > 0) && (
                <div>
                  <p className="text-purple-300/60 text-xs mb-2 font-bold">🔬 מחקר (קנה עם נקודות פרסטיז׳)</p>
                  <div className="space-y-2">
                    {RESEARCH.map(r => {
                      const purchased = game.research.has(r.id)
                      const available = !purchased && game.totalPrestigeEarned >= r.unlockAtPrestige && (!r.requires || game.research.has(r.requires))
                      const canAfford = available && game.prestigePoints >= r.cost
                      if (!purchased && !available) return null
                      return (
                        <button
                          key={r.id}
                          onClick={() => available && game.handleBuyResearch(r.id)}
                          disabled={!canAfford && !purchased}
                          className={`w-full flex items-center gap-3 rounded-xl p-3 text-right transition-all ${
                            purchased
                              ? 'bg-purple-800/20 border border-purple-600/30'
                              : canAfford
                              ? 'bg-purple-900/20 border border-purple-700/30 active:scale-[0.98]'
                              : 'bg-purple-950/10 border border-purple-900/10 opacity-50'
                          }`}
                        >
                          <span className="text-2xl">{r.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${purchased ? 'text-purple-300' : 'text-purple-200'}`}>{r.name}</p>
                            <p className="text-[11px] text-purple-400/40">{r.description}</p>
                          </div>
                          {purchased ? (
                            <span className="text-green-400 text-xs">✓</span>
                          ) : (
                            <p className={`text-sm font-bold shrink-0 ${canAfford ? 'text-purple-300' : 'text-purple-600'}`}>{r.cost} ✨</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-4">
                <p className="text-amber-300/60 text-xs mb-2 font-bold">📊 סטטיסטיקות</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-amber-400/40">סה״כ הרווחת</div>
                  <div className="text-amber-200 text-left">{fmt(game.totalEarned)}</div>
                  <div className="text-amber-400/40">סה״כ לחיצות</div>
                  <div className="text-amber-200 text-left">{fmtInt(game.totalClicks)}</div>
                  <div className="text-amber-400/40">הכנסה/שנייה</div>
                  <div className="text-amber-200 text-left">{fmt(game.cps)}</div>
                  <div className="text-amber-400/40">כוח לחיצה</div>
                  <div className="text-amber-200 text-left">{fmt(game.clickValue)}</div>
                  <div className="text-amber-400/40">סה״כ עסקים</div>
                  <div className="text-amber-200 text-left">{game.totalGenerators}</div>
                  <div className="text-amber-400/40">שדרוגים</div>
                  <div className="text-amber-200 text-left">{game.upgrades.size}</div>
                  <div className="text-amber-400/40">הישגים</div>
                  <div className="text-amber-200 text-left">{game.achievements.size}/{ACHIEVEMENTS.length}</div>
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={() => {
                  if (confirm('למחוק את כל ההתקדמות? פעולה זו בלתי הפיכה!')) {
                    if (confirm('בטוח? הכל יאופס!')) game.resetGame()
                  }
                }}
                className="w-full py-2 rounded-xl border border-red-900/30 text-red-400/40 text-xs hover:text-red-400 transition-colors"
              >
                מחק שמירה
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
