'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { getAvatarGradient } from '@/lib/avatar-gradient'
import { getShopItem } from '@/lib/coins'
import { getFrameDecorations } from '@/components/FrameDecorations'

export default function Navbar() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [equippedFrame, setEquippedFrame] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) setProfile(profileData)

      try {
        const { data: itemsData } = await supabase.from('user_items').select('item_id').eq('user_id', user.id).eq('equipped', true)
        for (const item of itemsData ?? []) {
          const shopItem = getShopItem(item.item_id)
          if (shopItem?.type === 'frame') setEquippedFrame(item.item_id)
        }
      } catch {
        // user_items table may not exist yet
      }
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
              className="relative transition-transform active:scale-95"
              style={{ width: equippedFrame ? 48 : 40, height: equippedFrame ? 48 : 40 }}
            >
              <div
                className="w-full h-full rounded-full p-[2px]"
                style={equippedFrame ? {
                  background: getShopItem(equippedFrame)?.preview,
                  boxShadow: getShopItem(equippedFrame)?.glow,
                } : {}}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-surface-container-highest border-2 border-primary/10"
                  style={equippedFrame ? { borderColor: 'transparent' } : {}}
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
                </div>
              </div>
              {equippedFrame && getFrameDecorations(equippedFrame, 24)}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary">🍳 BISHILicious</h1>
        </div>
      </div>
    </header>
  )
}
