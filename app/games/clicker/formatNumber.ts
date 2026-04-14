// ── Number formatting for large values ──

const SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
  'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg',
]

export function fmt(n: number): string {
  if (n < 0) return '-' + fmt(-n)
  if (n < 1000) return n < 10 ? n.toFixed(1) : Math.floor(n).toString()

  let tier = 0
  let scaled = n
  while (scaled >= 1000 && tier < SUFFIXES.length - 1) {
    scaled /= 1000
    tier++
  }

  if (scaled >= 100) return Math.floor(scaled) + SUFFIXES[tier]
  if (scaled >= 10) return scaled.toFixed(1) + SUFFIXES[tier]
  return scaled.toFixed(2) + SUFFIXES[tier]
}

export function fmtInt(n: number): string {
  if (n < 1000) return Math.floor(n).toString()
  return fmt(n)
}

export function fmtTime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)} שניות`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} דקות`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} שעות`
  return `${(seconds / 86400).toFixed(1)} ימים`
}
