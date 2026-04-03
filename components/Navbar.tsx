'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

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
    <nav className="sticky top-0 z-50 w-full bg-white shadow-sm font-rubik">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3" dir="rtl">
        <span className="text-xl font-bold text-tomato">בישי מתכונים</span>

        {profile && (
          <button
            onClick={() => router.push('/profile')}
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-saffron text-sm font-bold text-white">
                {profile.display_name?.charAt(0) || '?'}
              </span>
            )}
          </button>
        )}
      </div>
    </nav>
  )
}
