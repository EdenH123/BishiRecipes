'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import * as db from '@/lib/habit-rpg/db'
import type { HabitDefinition, HabitCompletion } from '@/lib/habit-rpg/types'
import { DIFFICULTY_VALUES } from '@/lib/habit-rpg/types'

interface Props {
  userId: string
  habits: HabitDefinition[]
  timezone: string
  streak: number
  longestStreak: number
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getLast7Days(tz: string): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-CA', { timeZone: tz }))
  }
  return days
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_LABELS[d.getDay()]
}

function isToday(dateStr: string, tz: string): boolean {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  return dateStr === today
}

export default function WeeklyHeatmap({ userId, habits, timezone, streak, longestStreak }: Props) {
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [loading, setLoading] = useState(true)

  const days = useMemo(() => getLast7Days(timezone), [timezone])

  useEffect(() => {
    async function load() {
      const data = await db.getCompletionsForDateRange(userId, days[0], days[6])
      setCompletions(data)
      setLoading(false)
    }
    load()
  }, [userId, days])

  // Build lookup: habitId → dateKey → true
  const completionMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const c of completions) {
      if (!map.has(c.habit_id)) map.set(c.habit_id, new Set())
      map.get(c.habit_id)!.add(c.date_key)
    }
    return map
  }, [completions])

  // Stats
  const totalCells = habits.length * 7
  const filledCells = completions.length
  const completionRate = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0

  // Perfect days count
  const perfectDays = days.filter(day => {
    const dailyHabits = habits.filter(h => h.frequency_type === 'daily')
    return dailyHabits.length > 0 && dailyHabits.every(h => completionMap.get(h.id)?.has(day))
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <p className="text-white/40 text-[10px]">Completion</p>
          <p className="text-xl font-bold text-white mt-0.5">{completionRate}%</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <p className="text-white/40 text-[10px]">Perfect Days</p>
          <p className="text-xl font-bold text-green-400 mt-0.5">{perfectDays}/7</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <p className="text-white/40 text-[10px]">Best Streak</p>
          <p className="text-xl font-bold text-orange-400 mt-0.5">{longestStreak}🔥</p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 overflow-x-auto">
        <h3 className="text-sm font-bold text-white mb-3">Weekly Heatmap</h3>

        <div className="min-w-[320px]">
          {/* Day headers */}
          <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: '100px repeat(7, 1fr)' }}>
            <div />
            {days.map(day => {
              const today = isToday(day, timezone)
              return (
                <div key={day} className={`text-center text-[9px] ${today ? 'text-indigo-400 font-bold' : 'text-white/30'}`}>
                  {getDayLabel(day)}
                  <br />
                  <span className="text-[8px]">{day.slice(8)}</span>
                </div>
              )
            })}
          </div>

          {/* Habit rows */}
          {habits.map((habit, rowIdx) => {
            const habitCompletions = completionMap.get(habit.id) || new Set()
            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rowIdx * 0.03 }}
                className="grid gap-1 mb-1" style={{ gridTemplateColumns: '100px repeat(7, 1fr)' }}
              >
                {/* Habit label */}
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <span className="text-sm">{habit.emoji}</span>
                  <span className="text-[10px] text-white/60 truncate">{habit.title}</span>
                </div>

                {/* Day cells */}
                {days.map(day => {
                  const done = habitCompletions.has(day)
                  const today = isToday(day, timezone)
                  const isPast = day < new Date().toLocaleDateString('en-CA', { timeZone: timezone })

                  return (
                    <motion.div
                      key={day}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: rowIdx * 0.03 + 0.02 }}
                      className={`aspect-square rounded-md flex items-center justify-center text-[10px] transition-all ${
                        done
                          ? 'bg-green-500 text-white shadow-sm shadow-green-500/30'
                          : today
                          ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400'
                          : isPast
                          ? 'bg-red-900/20 border border-red-900/10 text-red-400/30'
                          : 'bg-white/5 border border-white/5'
                      }`}
                    >
                      {done ? '✓' : isPast ? '✗' : ''}
                    </motion.div>
                  )
                })}
              </motion.div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-3 mt-3 text-[9px] text-white/30">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Done</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-900/30 border border-red-900/20 inline-block" /> Missed</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500/20 border border-indigo-500/30 inline-block" /> Today</span>
        </div>
      </div>

      {/* Streak timeline */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white mb-3">Streak: {streak}🔥</h3>
        <div className="flex gap-0.5">
          {days.map(day => {
            const dayCompletions = completions.filter(c => c.date_key === day)
            const hasAny = dayCompletions.length > 0
            const today = isToday(day, timezone)
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full h-6 rounded-md ${
                  hasAny ? 'bg-orange-500/60' : today ? 'bg-white/10' : 'bg-red-900/20'
                }`} />
                <span className={`text-[8px] ${today ? 'text-white/60 font-bold' : 'text-white/20'}`}>
                  {getDayLabel(day).charAt(0)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
