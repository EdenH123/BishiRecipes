'use client'

import { motion } from 'framer-motion'
import { weeklyTotals, calcStreak, calcBestDay } from '@/lib/water/storage'
import type { WaterState } from '@/lib/water/types'

export default function WeeklyChart({ state }: { state: WaterState }) {
  const data = weeklyTotals(state)
  const max = Math.max(state.dailyGoalMl, ...data.map(d => d.ml))
  const total = data.reduce((sum, d) => sum + d.ml, 0)
  const avg = Math.round(total / 7)
  const daysHit = data.filter(d => d.hydrationMl >= state.dailyGoalMl).length
  const streak = calcStreak(state)
  const best = calcBestDay(state)
  const todayKey = data[data.length - 1]?.date

  function dayLabel(date: string): string {
    const d = new Date(date)
    const days = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
    return days[d.getDay()]
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/80 rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xs text-blue-500/60">ממוצע יומי</p>
          <p className="text-lg font-bold text-blue-900 mt-1">{avg}<span className="text-xs">ml</span></p>
        </div>
        <div className="bg-white/80 rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xs text-blue-500/60">ימים שהשגתי יעד</p>
          <p className="text-lg font-bold text-green-600 mt-1">{daysHit}/7</p>
        </div>
        <div className="bg-white/80 rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xs text-blue-500/60">רצף נוכחי</p>
          <p className="text-lg font-bold text-orange-500 mt-1">🔥 {streak}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white/80 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-blue-900 mb-3">7 ימים אחרונים</h3>
        <div className="relative h-48">
          {/* Goal line */}
          <div className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400/40 z-0"
               style={{ top: `${(1 - state.dailyGoalMl / max) * 100}%` }}>
            <span className="absolute -top-3 right-0 text-[9px] text-blue-500/60">יעד {state.dailyGoalMl}ml</span>
          </div>

          {/* Bars */}
          <div className="absolute inset-0 flex items-end justify-between gap-1">
            {data.map((d, i) => {
              const heightPercent = max > 0 ? (d.ml / max) * 100 : 0
              const reached = d.hydrationMl >= state.dailyGoalMl
              const isToday = d.date === todayKey
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ delay: i * 0.07, type: 'spring', damping: 18 }}
                    className={`w-full rounded-t-lg ${
                      reached ? 'bg-gradient-to-t from-green-500 to-emerald-300' :
                      isToday ? 'bg-gradient-to-t from-blue-500 to-sky-300' :
                      'bg-gradient-to-t from-blue-300 to-sky-200'
                    } relative group`}
                    style={{ minHeight: d.ml > 0 ? '4px' : '0' }}
                  >
                    {d.ml > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-blue-700 font-bold whitespace-nowrap">
                        {d.ml >= 1000 ? `${(d.ml / 1000).toFixed(1)}L` : `${d.ml}`}
                      </span>
                    )}
                  </motion.div>
                  <span className={`text-[10px] mt-1 ${isToday ? 'text-blue-700 font-bold' : 'text-blue-500/60'}`}>{dayLabel(d.date)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Best day */}
      {best && (
        <div className="bg-white/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div className="flex-1">
            <p className="text-xs text-blue-500/60">היום הטוב ביותר</p>
            <p className="text-sm font-bold text-blue-900">{best.date} · {best.ml}ml</p>
          </div>
        </div>
      )}
    </div>
  )
}
