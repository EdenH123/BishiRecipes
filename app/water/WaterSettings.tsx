'use client'

import { useState } from 'react'
import { updateGoal, addCustomDrink, removeCustomDrink, resetAllData } from '@/lib/water/storage'
import { MIN_GOAL_ML, MAX_GOAL_ML, GOAL_STEP_ML, DEFAULT_DRINKS } from '@/lib/water/constants'
import type { WaterState } from '@/lib/water/types'

export default function WaterSettings({ state, onChange }: { state: WaterState; onChange: (s: WaterState) => void }) {
  const [showAddDrink, setShowAddDrink] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🥤')
  const [newMl, setNewMl] = useState(250)
  const [newColor, setNewColor] = useState('#3b82f6')

  function handleAddDrink() {
    if (!newName.trim()) return
    const drink = {
      id: `custom_${Date.now()}`,
      name: newName.trim(),
      emoji: newEmoji,
      defaultMl: newMl,
      color: newColor,
      hydrationFactor: 1,
    }
    onChange(addCustomDrink(state, drink))
    setNewName(''); setNewEmoji('🥤'); setNewMl(250); setShowAddDrink(false)
  }

  return (
    <div className="space-y-4">
      {/* Daily goal */}
      <div className="bg-white/80 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-blue-900 mb-2">יעד יומי</h3>
        <div className="flex items-center justify-between mb-3">
          <p className="text-3xl font-bold text-blue-700">{state.dailyGoalMl}<span className="text-base">ml</span></p>
          <p className="text-xs text-blue-500/60">{(state.dailyGoalMl / 1000).toFixed(1)} ליטר</p>
        </div>
        <input
          type="range"
          min={MIN_GOAL_ML}
          max={MAX_GOAL_ML}
          step={GOAL_STEP_ML}
          value={state.dailyGoalMl}
          onChange={(e) => onChange(updateGoal(state, Number(e.target.value)))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-blue-400/60 mt-1">
          <span>{MIN_GOAL_ML}ml</span>
          <span>{MAX_GOAL_ML}ml</span>
        </div>
      </div>

      {/* Default drinks (info only) */}
      <div className="bg-white/80 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-blue-900 mb-3">משקאות ברירת מחדל</h3>
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_DRINKS.map(d => (
            <div key={d.id} className="flex items-center gap-2 bg-blue-50/60 rounded-xl px-3 py-2">
              <span className="text-xl">{d.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-blue-900 truncate">{d.name}</p>
                <p className="text-[10px] text-blue-500/60">{d.defaultMl}ml · {Math.round(d.hydrationFactor * 100)}% הידרציה</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom drinks */}
      <div className="bg-white/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-blue-900">משקאות מותאמים</h3>
          <button onClick={() => setShowAddDrink(s => !s)}
            className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-bold active:scale-95 transition-transform">
            {showAddDrink ? '×' : '+ הוסף'}
          </button>
        </div>

        {showAddDrink && (
          <div className="bg-blue-50 rounded-xl p-3 mb-3 space-y-2">
            <div className="flex gap-2">
              <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} maxLength={2}
                className="w-14 bg-white rounded-lg px-2 py-2 text-center text-2xl" placeholder="🥤" />
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="flex-1 bg-white rounded-lg px-3 py-2 text-sm text-blue-900" placeholder="שם המשקה" />
            </div>
            <div className="flex gap-2 items-center">
              <input type="number" value={newMl} onChange={e => setNewMl(Number(e.target.value) || 0)}
                className="flex-1 bg-white rounded-lg px-3 py-2 text-sm text-blue-900" placeholder="כמות (ml)" />
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer" />
            </div>
            <button onClick={handleAddDrink}
              className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-bold active:scale-95 transition-transform">
              שמור
            </button>
          </div>
        )}

        {state.customDrinks.length === 0 ? (
          <p className="text-center text-blue-400/60 py-4 text-sm">אין משקאות מותאמים עדיין</p>
        ) : (
          <div className="space-y-1">
            {state.customDrinks.map(d => (
              <div key={d.id} className="flex items-center gap-3 bg-blue-50/60 rounded-xl px-3 py-2">
                <span className="text-xl">{d.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-900">{d.name}</p>
                  <p className="text-[10px] text-blue-500/60">{d.defaultMl}ml</p>
                </div>
                <button onClick={() => onChange(removeCustomDrink(state, d.id))}
                  className="text-red-400 hover:text-red-600 text-lg">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset */}
      <button
        onClick={() => {
          if (confirm('למחוק את כל הנתונים? פעולה זו בלתי הפיכה!')) {
            onChange(resetAllData())
          }
        }}
        className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 transition-colors">
        🗑️ אפס את כל הנתונים
      </button>
    </div>
  )
}
