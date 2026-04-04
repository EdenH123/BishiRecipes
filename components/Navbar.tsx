'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { getAvatarGradient } from '@/lib/avatar-gradient'

export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data)
    }

    loadProfile()
  }, [])

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md shadow-sm">
      <div className="flex flex-row-reverse justify-between items-center px-4 h-16 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          {profile && (
            <button
              onClick={() => router.push('/profile')}
              className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary/10 transition-transform active:scale-95"
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="flex w-full h-full items-center justify-center text-white text-sm font-bold"
                  style={{ background: getAvatarGradient(profile.id) }}
                >
                  {profile.display_name?.charAt(0) || '?'}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary">🍳 בישי מתכונים</h1>
        </div>
      </div>
    </header>
  )
}
