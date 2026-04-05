'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
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
  const [logoSpin, setLogoSpin] = useState(0)

  useEffect(() => {
    let userId: string | null = null

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) setProfile(profileData)

      await loadFrame(user.id)
    }

    async function loadFrame(uid: string) {
      try {
        const { data: itemsData } = await supabase.from('user_items').select('item_id').eq('user_id', uid).eq('equipped', true)
        let frame: string | null = null
        for (const item of itemsData ?? []) {
          const shopItem = getShopItem(item.item_id)
          if (shopItem?.type === 'frame') frame = item.item_id
        }
        setEquippedFrame(frame)
      } catch {
        // user_items table may not exist yet
      }
    }

    loadProfile()

    // Listen for changes to user_items in realtime
    const channel = supabase
      .channel('navbar-frame')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_items' }, () => {
        if (userId) loadFrame(userId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
          <motion.div
            animate={{ rotate: logoSpin }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            onTap={() => setLogoSpin((prev) => prev + 360)}
            className="cursor-pointer"
          >
            <Image src="/logo.png" alt="BISHILicious" width={40} height={40} className="rounded-full" priority />
          </motion.div>
          <h1 className="text-xl font-bold text-primary">BISHILicious</h1>
        </div>
      </div>
    </header>
  )
}
