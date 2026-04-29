'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [unreadCount, setUnreadCount] = useState(0)
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleLogoTap() {
    setLogoSpin((prev) => prev + 360)
    tapCountRef.current++
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
      router.push('/games')
      return
    }
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0 }, 800)
  }

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

      // Fetch unread notification count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      if (count !== null) setUnreadCount(count)

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
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md shadow-sm overflow-visible" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex flex-row-reverse justify-between items-center px-4 h-16 max-w-5xl mx-auto overflow-visible">
        <div className="flex items-center gap-3">
          {profile?.is_admin && (
            <button
              onClick={() => router.push('/admin/eticket')}
              className="transition-transform active:scale-90"
              title="eTicket Generator"
            >
              <span className="text-xl">🎫</span>
            </button>
          )}
          {profile && (
            <button
              onClick={() => router.push('/water')}
              className="transition-transform active:scale-90"
              title="מעקב שתייה"
            >
              <span className="text-xl">💧</span>
            </button>
          )}
          {profile && (
            <button
              onClick={() => router.push('/notifications')}
              className="relative transition-transform active:scale-90"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-2xl">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
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
                      decoding="async"
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

        <div className="flex items-center gap-2 shrink-0">
          <motion.div
            animate={{ rotate: logoSpin }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            onTap={handleLogoTap}
            className="cursor-pointer shrink-0"
          >
            <Image src="/logo.png" alt="BISHILicious" width={64} height={64} className="rounded-full shrink-0" priority />
          </motion.div>
          <h1 className="text-xl font-bold text-primary">BISHILicious</h1>
        </div>
      </div>
    </header>
  )
}
