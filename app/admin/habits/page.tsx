'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function HabitRPGPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) { router.push('/'); return }
      setAuthorized(true)
      setLoading(false)
    }
    checkAdmin()
  }, [supabase, router])

  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <span className="text-4xl block mb-3 animate-pulse">🎮</span>
          <p className="text-white/40 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1033 50%, #0a0a1a 100%)' }}>
      <div className="text-center">
        <span className="text-6xl block mb-4">⚔️</span>
        <h1 className="text-2xl font-bold text-white mb-2">Habit RPG</h1>
        <p className="text-white/40 text-sm">Coming soon...</p>
      </div>
    </div>
  )
}
