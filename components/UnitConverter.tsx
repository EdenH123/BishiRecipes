'use client'

import { useState } from 'react'

const CONVERSIONS: { from: string; to: string; factor: number }[] = [
  { from: 'כוס', to: 'מ״ל', factor: 240 },
  { from: 'כוסות', to: 'מ״ל', factor: 240 },
  { from: 'כף', to: 'מ״ל', factor: 15 },
  { from: 'כפות', to: 'מ״ל', factor: 15 },
  { from: 'כפית', to: 'מ״ל', factor: 5 },
  { from: 'כפיות', to: 'מ״ל', factor: 5 },
  { from: 'ק״ג', to: 'גרם', factor: 1000 },
  { from: 'ליטר', to: 'מ״ל', factor: 1000 },
  { from: 'גרם', to: 'ק״ג', factor: 0.001 },
  { from: 'מ״ל', to: 'כוסות', factor: 1 / 240 },
  { from: 'גרם', to: 'אונקיות', factor: 0.035274 },
  { from: 'מ״ל', to: 'כפות', factor: 1 / 15 },
]

const UNITS = Array.from(new Set(CONVERSIONS.map((c) => c.from)))

export default function UnitConverter() {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('1')
  const [fromUnit, setFromUnit] = useState('כוס')

  const results = CONVERSIONS.filter((c) => c.from === fromUnit).map((c) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return null
    const result = num * c.factor
    return {
      unit: c.to,
      value: result < 1 ? result.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') : result.toFixed(1).replace(/\.0$/, ''),
    }
  }).filter(Boolean)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container"
      >
        <span className="material-symbols-outlined text-base">straighten</span>
        ממיר יחידות
      </button>
    )
  }

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">ממיר יחידות</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      <div className="flex gap-2 mb-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-20 rounded-lg border border-gray-200 p-2 text-center text-sm outline-none focus:border-primary"
          min="0"
          step="0.1"
        />
        <select
          value={fromUnit}
          onChange={(e) => setFromUnit(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-primary"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
      {results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {results.map((r) => r && (
            <span key={r.unit} className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
              {r.value} {r.unit}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
