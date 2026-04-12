'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import PageTransition from '@/components/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  recipe_id: string | null
  actor_id: string | null
  read: boolean
  created_at: string
  actor?: { display_name: string; avatar_url: string | null }
}

const TYPE_ICON: Record<string, string> = {
  comment: 'chat_bubble',
  rating: 'star',
  favorite: 'favorite',
  reaction: 'add_reaction',
  new_recipe: 'restaurant',
  recipe_edited: 'edit',
  new_user: 'person_add',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} דק׳`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `לפני ${hours} שע׳`
  const days = Math.floor(hours / 24)
  if (days < 7) return `לפני ${days} ימים`
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data && data.length > 0) {
        // Fetch actor profiles
        const actorIds = Array.from(new Set(data.map(n => n.actor_id).filter(Boolean)))
        const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>()
        if (actorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', actorIds)
          if (profiles) {
            for (const p of profiles) profileMap.set(p.id, p)
          }
        }

        setNotifications(data.map(n => ({
          ...n,
          actor: n.actor_id ? profileMap.get(n.actor_id) || undefined : undefined,
        })))

        // Mark all as read
        const unreadIds = data.filter(n => !n.read).map(n => n.id)
        if (unreadIds.length > 0) {
          await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds)
        }
      }

      setLoading(false)
    }
    load()
  }, [supabase, router])

  async function handleClearAll() {
    if (!confirm('למחוק את כל ההתראות?')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').delete().eq('user_id', user.id)
    setNotifications([])
  }

  async function handleDelete(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  return (
    <div dir="rtl" className="min-h-screen bg-surface pt-20 pb-28">
      <Navbar />
      <PageTransition>
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-on-surface">
              <span className="material-symbols-outlined text-primary align-middle ml-2">notifications</span>
              התראות
            </h1>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-outline hover:text-error transition-colors"
              >
                נקה הכל
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl animate-shimmer bg-gradient-to-r from-surface-container-high via-surface-container-low to-surface-container-high bg-[length:200%_100%]" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-outline/30">notifications_none</span>
              <p className="text-lg text-on-surface-variant">אין התראות</p>
              <p className="text-sm text-outline">כשמישהו יגיב או ידרג את המתכונים שלך, תראו את זה כאן</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {notifications.map((notif, i) => (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30, height: 0 }}
                    transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <div
                      className={`flex items-start gap-3 rounded-2xl p-3.5 transition-colors cursor-pointer ${
                        !notif.read
                          ? 'bg-primary/5 border border-primary/10'
                          : 'bg-surface-container-lowest border border-outline-variant/10'
                      }`}
                      onClick={() => {
                        if (notif.recipe_id) router.push(`/recipe/${notif.recipe_id}`)
                      }}
                    >
                      {/* Actor avatar or type icon */}
                      <div className="shrink-0">
                        {notif.actor?.avatar_url ? (
                          <img
                            src={notif.actor.avatar_url}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-lg">
                              {TYPE_ICON[notif.type] || 'notifications'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface font-medium leading-snug">
                          {notif.actor?.display_name && (
                            <span className="font-bold">{notif.actor.display_name} </span>
                          )}
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-xs text-on-surface-variant mt-0.5 truncate">{notif.body}</p>
                        )}
                        <p className="text-[11px] text-outline mt-1">{timeAgo(notif.created_at)}</p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(notif.id)
                        }}
                        className="shrink-0 rounded-lg p-1 text-outline/50 hover:text-error hover:bg-error/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>

                      {/* Unread dot */}
                      {!notif.read && (
                        <div className="shrink-0 mt-2 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </PageTransition>
      <BottomNav />
    </div>
  )
}
