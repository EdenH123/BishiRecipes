'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

// ── Theme color palettes ──
const THEME_COLORS = {
  red: {
    primary: '#b41c1b',
    'primary-container': '#d83730',
    'on-primary': '#ffffff',
    'on-primary-container': '#fffbff',
    'inverse-primary': '#ffb4ab',
  },
  blue: {
    primary: '#1b5eb4',
    'primary-container': '#3078d8',
    'on-primary': '#ffffff',
    'on-primary-container': '#f0f4ff',
    'inverse-primary': '#a8c8ff',
  },
  green: {
    primary: '#2d7a4f',
    'primary-container': '#3a9963',
    'on-primary': '#ffffff',
    'on-primary-container': '#f0fff5',
    'inverse-primary': '#7edba2',
  },
  purple: {
    primary: '#7b1fa2',
    'primary-container': '#9c27b0',
    'on-primary': '#ffffff',
    'on-primary-container': '#fdf0ff',
    'inverse-primary': '#d4a0e8',
  },
  orange: {
    primary: '#c75b00',
    'primary-container': '#e67a1e',
    'on-primary': '#ffffff',
    'on-primary-container': '#fff5ec',
    'inverse-primary': '#ffb87a',
  },
} as const

// ── Light & dark surface colors ──
const LIGHT_SURFACES = {
  surface: '#fdf9f3',
  'surface-dim': '#dddad4',
  'surface-bright': '#fdf9f3',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f7f3ed',
  'surface-container': '#f1ede7',
  'surface-container-high': '#ebe8e2',
  'surface-container-highest': '#e6e2dc',
  'on-surface': '#1c1c18',
  'on-surface-variant': '#5b403d',
  outline: '#8f706c',
  'outline-variant': '#e3beb9',
  'inverse-surface': '#31302d',
  'inverse-on-surface': '#f4f0ea',
  error: '#ba1a1a',
  'error-container': '#ffdad6',
}

const DARK_SURFACES = {
  surface: '#141311',
  'surface-dim': '#141311',
  'surface-bright': '#3a3935',
  'surface-container-lowest': '#0f0e0c',
  'surface-container-low': '#1c1c18',
  'surface-container': '#201f1c',
  'surface-container-high': '#2b2a26',
  'surface-container-highest': '#363531',
  'on-surface': '#e6e2dc',
  'on-surface-variant': '#d0bfba',
  outline: '#998886',
  'outline-variant': '#534341',
  'inverse-surface': '#e6e2dc',
  'inverse-on-surface': '#31302d',
  error: '#ffb4ab',
  'error-container': '#93000a',
}

// ── Types ──
export type ThemeColor = keyof typeof THEME_COLORS
export type TextSize = 'small' | 'medium' | 'large'
export type DarkMode = 'light' | 'dark' | 'system'

export const THEME_COLOR_OPTIONS: { key: ThemeColor; label: string; hex: string }[] = [
  { key: 'red', label: 'אדום', hex: '#b41c1b' },
  { key: 'blue', label: 'כחול', hex: '#1b5eb4' },
  { key: 'green', label: 'ירוק', hex: '#2d7a4f' },
  { key: 'purple', label: 'סגול', hex: '#7b1fa2' },
  { key: 'orange', label: 'כתום', hex: '#c75b00' },
]

export const TEXT_SIZE_OPTIONS: { key: TextSize; label: string }[] = [
  { key: 'small', label: 'קטן' },
  { key: 'medium', label: 'בינוני' },
  { key: 'large', label: 'גדול' },
]

interface ThemeState {
  darkMode: DarkMode
  themeColor: ThemeColor
  textSize: TextSize
}

interface ThemeContextType extends ThemeState {
  setDarkMode: (mode: DarkMode) => void
  setThemeColor: (color: ThemeColor) => void
  setTextSize: (size: TextSize) => void
  isDark: boolean
}

const STORAGE_KEY = 'bishi_theme'

const defaultState: ThemeState = {
  darkMode: 'light',
  themeColor: 'red',
  textSize: 'medium',
}

const ThemeContext = createContext<ThemeContextType>({
  ...defaultState,
  isDark: false,
  setDarkMode: () => {},
  setThemeColor: () => {},
  setTextSize: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function loadTheme(): ThemeState {
  if (typeof window === 'undefined') return defaultState
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultState, ...JSON.parse(raw) }
  } catch {}
  return defaultState
}

function saveTheme(state: ThemeState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

const TEXT_SIZE_MAP: Record<TextSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
}

/** Convert hex color like '#b41c1b' to space-separated RGB: '180 28 27' */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r} ${g} ${b}`
}

function applyTheme(state: ThemeState, systemDark: boolean) {
  const isDark = state.darkMode === 'dark' || (state.darkMode === 'system' && systemDark)
  const surfaces = isDark ? DARK_SURFACES : LIGHT_SURFACES
  const colors = THEME_COLORS[state.themeColor]

  const root = document.documentElement
  // Apply all color tokens as CSS variables (RGB space-separated for Tailwind opacity support)
  for (const [key, value] of Object.entries({ ...surfaces, ...colors })) {
    root.style.setProperty(`--color-${key}`, hexToRgb(value))
  }
  // Text size
  root.style.fontSize = TEXT_SIZE_MAP[state.textSize]

  // Set color-scheme for browser UI
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(defaultState)
  const [systemDark, setSystemDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load saved theme on mount
  useEffect(() => {
    const saved = loadTheme()
    setState(saved)
    setMounted(true)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Apply theme whenever state or system preference changes
  useEffect(() => {
    if (!mounted) return
    applyTheme(state, systemDark)
  }, [state, systemDark, mounted])

  const setDarkMode = useCallback((mode: DarkMode) => {
    setState(prev => {
      const next = { ...prev, darkMode: mode }
      saveTheme(next)
      return next
    })
  }, [])

  const setThemeColor = useCallback((color: ThemeColor) => {
    setState(prev => {
      const next = { ...prev, themeColor: color }
      saveTheme(next)
      return next
    })
  }, [])

  const setTextSize = useCallback((size: TextSize) => {
    setState(prev => {
      const next = { ...prev, textSize: size }
      saveTheme(next)
      return next
    })
  }, [])

  const isDark = state.darkMode === 'dark' || (state.darkMode === 'system' && systemDark)

  return (
    <ThemeContext.Provider value={{ ...state, isDark, setDarkMode, setThemeColor, setTextSize }}>
      {children}
    </ThemeContext.Provider>
  )
}
