'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/types'
import AvatarWithFrame from '@/components/AvatarWithFrame'
import { fetchEquippedFrames } from '@/lib/fetch-frames'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ── Category config (reused from TasteMap) ──
const CATEGORY_CONFIG: Record<string, { emoji: string; bar: string }> = {
  'ארוחת בוקר': { emoji: '🌅', bar: '#f59e0b' },
  'ארוחת צהריים': { emoji: '🍽️', bar: '#f97316' },
  'ארוחת ערב': { emoji: '🌙', bar: '#6366f1' },
  'קינוח': { emoji: '🍰', bar: '#ec4899' },
  'חטיף': { emoji: '🥨', bar: '#eab308' },
  'מרק': { emoji: '🍲', bar: '#ef4444' },
  'סלט': { emoji: '🥗', bar: '#22c55e' },
  'לחם ואפייה': { emoji: '🍞', bar: '#a8a29e' },
  'שתייה': { emoji: '🥤', bar: '#0ea5e9' },
}
const DEFAULT_CAT = { emoji: '🍴', bar: '#9ca3af' }

// ── Hebrew day names ──
const HEBREW_DAYS = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת']

// ── Helpers ──
function startOfDay(d: Date) {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return startOfDay(d)
}

// ── Animation variants ──
const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.08, type: 'spring' as const, stiffness: 300, damping: 25 },
  }),
}

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

// ── Types ──
interface OverviewStats {
  totalRecipes: number
  totalUsers: number
  totalComments: number
  totalRatings: number
}

interface WeeklyActivity {
  recipesThisWeek: number
  recipesLastWeek: number
  commentsThisWeek: number
  commentsLastWeek: number
  newUsersThisWeek: number
}

interface DayBucket {
  label: string
  count: number
  date: string
}

interface CategoryCount {
  name: string
  count: number
  emoji: string
  bar: string
}

interface ActiveUser {
  id: string
  display_name: string
  avatar_url: string | null
  activity: number
}

interface ManagedUser {
  id: string
  display_name: string
  avatar_url: string | null
  is_admin: boolean
  created_at: string
  recipe_count: number
  comment_count: number
}

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userFrameMap, setUserFrameMap] = useState<Map<string, string>>(new Map())

  const [overview, setOverview] = useState<OverviewStats>({ totalRecipes: 0, totalUsers: 0, totalComments: 0, totalRatings: 0 })
  const [weekly, setWeekly] = useState<WeeklyActivity>({ recipesThisWeek: 0, recipesLastWeek: 0, commentsThisWeek: 0, commentsLastWeek: 0, newUsersThisWeek: 0 })
  const [dailyRecipes, setDailyRecipes] = useState<DayBucket[]>([])
  const [categories, setCategories] = useState<CategoryCount[]>([])
  const [topUsers, setTopUsers] = useState<ActiveUser[]>([])
  const [frameMap, setFrameMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    async function load() {
      try {
        // ── Auth check ──
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (userErr || !user) { router.push('/'); return }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        if (!profile?.is_admin) { router.push('/'); return }
        setAuthorized(true)
        setCurrentUserId(user.id)

        // ── Date boundaries ──
        const now = new Date()
        const weekAgo = daysAgo(7)
        const twoWeeksAgo = daysAgo(14)
        const weekAgoISO = weekAgo.toISOString()
        const twoWeeksAgoISO = twoWeeksAgo.toISOString()

        // ── Parallel fetches ──
        const [
          recipesCountRes,
          usersCountRes,
          commentsCountRes,
          ratingsCountRes,
          recipesThisWeekRes,
          recipesLastWeekRes,
          commentsThisWeekRes,
          commentsLastWeekRes,
          newUsersRes,
          recentRecipesRes,
          allRecipesCatRes,
          topRecipeCreatorsRes,
          topCommentersRes,
          topRatersRes,
        ] = await Promise.all([
          // Overview counts
          supabase.from('recipes').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('comments').select('*', { count: 'exact', head: true }),
          supabase.from('ratings').select('*', { count: 'exact', head: true }),
          // Weekly activity
          supabase.from('recipes').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
          supabase.from('recipes').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgoISO).lt('created_at', weekAgoISO),
          supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
          supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgoISO).lt('created_at', weekAgoISO),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
          // Daily chart – last 7 days recipes
          supabase.from('recipes').select('created_at').gte('created_at', weekAgoISO),
          // Categories
          supabase.from('recipes').select('category'),
          // Top users - recipe creators
          supabase.from('recipes').select('created_by'),
          // Top commenters
          supabase.from('comments').select('user_id'),
          // Top raters
          supabase.from('ratings').select('user_id'),
        ])

        // ── Overview ──
        setOverview({
          totalRecipes: recipesCountRes.count ?? 0,
          totalUsers: usersCountRes.count ?? 0,
          totalComments: commentsCountRes.count ?? 0,
          totalRatings: ratingsCountRes.count ?? 0,
        })

        // ── Weekly ──
        setWeekly({
          recipesThisWeek: recipesThisWeekRes.count ?? 0,
          recipesLastWeek: recipesLastWeekRes.count ?? 0,
          commentsThisWeek: commentsThisWeekRes.count ?? 0,
          commentsLastWeek: commentsLastWeekRes.count ?? 0,
          newUsersThisWeek: newUsersRes.count ?? 0,
        })

        // ── Daily chart ──
        const dayMap = new Map<string, number>()
        for (let i = 6; i >= 0; i--) {
          const d = daysAgo(i)
          dayMap.set(d.toISOString().slice(0, 10), 0)
        }
        if (recentRecipesRes.data) {
          for (const r of recentRecipesRes.data) {
            const key = r.created_at.slice(0, 10)
            if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1)
          }
        }
        const buckets: DayBucket[] = []
        for (const [dateStr, count] of Array.from(dayMap.entries())) {
          const d = new Date(dateStr + 'T00:00:00')
          buckets.push({ label: HEBREW_DAYS[d.getDay()], count, date: dateStr })
        }
        setDailyRecipes(buckets)

        // ── Categories ──
        const catCount = new Map<string, number>()
        if (allRecipesCatRes.data) {
          for (const r of allRecipesCatRes.data) {
            const cat = r.category || 'ללא קטגוריה'
            catCount.set(cat, (catCount.get(cat) || 0) + 1)
          }
        }
        const catArr: CategoryCount[] = Array.from(catCount.entries())
          .map(([name, count]) => {
            const cfg = CATEGORY_CONFIG[name] || DEFAULT_CAT
            return { name, count, emoji: cfg.emoji, bar: cfg.bar }
          })
          .sort((a, b) => b.count - a.count)
        setCategories(catArr)

        // ── Most active users ──
        const activityMap = new Map<string, number>()
        if (topRecipeCreatorsRes.data) {
          for (const r of topRecipeCreatorsRes.data) {
            activityMap.set(r.created_by, (activityMap.get(r.created_by) || 0) + 1)
          }
        }
        if (topCommentersRes.data) {
          for (const c of topCommentersRes.data) {
            activityMap.set(c.user_id, (activityMap.get(c.user_id) || 0) + 1)
          }
        }
        if (topRatersRes.data) {
          for (const r of topRatersRes.data) {
            activityMap.set(r.user_id, (activityMap.get(r.user_id) || 0) + 1)
          }
        }
        const sortedUsers = Array.from(activityMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)

        if (sortedUsers.length > 0) {
          const userIds = sortedUsers.map(([id]) => id)
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', userIds)

          const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>()
          if (profiles) {
            for (const p of profiles) profileMap.set(p.id, p)
          }

          const topUsersList = sortedUsers.map(([id, activity]) => ({
            id,
            display_name: profileMap.get(id)?.display_name || 'משתמש',
            avatar_url: profileMap.get(id)?.avatar_url || null,
            activity,
          }))
          setTopUsers(topUsersList)

          // Fetch equipped frames for top users
          const frames = await fetchEquippedFrames(topUsersList.map((u) => u.id))
          setFrameMap(frames)
        }
      } catch (err) {
        console.error('Admin dashboard error:', err)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  // ── User Management ──
  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const [profilesRes, recipeCounts, commentCounts] = await Promise.all([
        supabase.from('profiles').select('id, display_name, avatar_url, is_admin, created_at').order('created_at', { ascending: false }),
        supabase.from('recipes').select('created_by'),
        supabase.from('comments').select('user_id'),
      ])

      const rcMap = new Map<string, number>()
      if (recipeCounts.data) {
        for (const r of recipeCounts.data) {
          rcMap.set(r.created_by, (rcMap.get(r.created_by) || 0) + 1)
        }
      }
      const ccMap = new Map<string, number>()
      if (commentCounts.data) {
        for (const c of commentCounts.data) {
          ccMap.set(c.user_id, (ccMap.get(c.user_id) || 0) + 1)
        }
      }

      const users: ManagedUser[] = (profilesRes.data || []).map((p) => ({
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        is_admin: p.is_admin,
        created_at: p.created_at,
        recipe_count: rcMap.get(p.id) || 0,
        comment_count: ccMap.get(p.id) || 0,
      }))
      setManagedUsers(users)

      const frames = await fetchEquippedFrames(users.map((u) => u.id))
      setUserFrameMap(frames)
    } catch {
      toast.error('שגיאה בטעינת משתמשים')
    } finally {
      setUsersLoading(false)
    }
  }, [supabase])

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    if (userId === currentUserId) {
      toast.error('לא ניתן לשנות הרשאות לעצמך')
      return
    }
    const action = currentIsAdmin ? 'להסיר הרשאת אדמין' : 'לתת הרשאת אדמין'
    if (!confirm(`${action} למשתמש?`)) return

    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !currentIsAdmin })
      .eq('id', userId)

    if (error) {
      toast.error('שגיאה בעדכון הרשאות')
    } else {
      setManagedUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u)),
      )
      toast.success(currentIsAdmin ? 'הרשאת אדמין הוסרה' : 'הרשאת אדמין ניתנה')
    }
  }

  async function deleteUser(userId: string, displayName: string) {
    if (userId === currentUserId) {
      toast.error('לא ניתן למחוק את עצמך')
      return
    }
    if (!confirm(`למחוק את המשתמש "${displayName}"? כל המתכונים והתגובות שלו יימחקו.`)) return
    if (!confirm('פעולה זו בלתי הפיכה. להמשיך?')) return

    // Delete user's recipes, comments, ratings, favorites, then profile
    const { error: recErr } = await supabase.from('recipes').delete().eq('created_by', userId)
    const { error: comErr } = await supabase.from('comments').delete().eq('user_id', userId)
    await supabase.from('ratings').delete().eq('user_id', userId)
    await supabase.from('favorites').delete().eq('user_id', userId)
    await supabase.from('recipe_collaborators').delete().eq('user_id', userId)
    const { error: profErr } = await supabase.from('profiles').delete().eq('id', userId)

    if (recErr || comErr || profErr) {
      toast.error('שגיאה במחיקת משתמש')
    } else {
      setManagedUsers((prev) => prev.filter((u) => u.id !== userId))
      toast.success(`המשתמש "${displayName}" נמחק`)
      // Update overview
      setOverview((prev) => ({ ...prev, totalUsers: prev.totalUsers - 1 }))
    }
  }

  function handleOpenUserManagement() {
    setShowUserManagement(true)
    if (managedUsers.length === 0) loadUsers()
  }

  const filteredUsers = userSearch.trim()
    ? managedUsers.filter((u) =>
        u.display_name.toLowerCase().includes(userSearch.toLowerCase()),
      )
    : managedUsers

  // ── Loading ──
  if (loading || !authorized) {
    return (
      <div dir="rtl" className="min-h-screen bg-surface pt-20 pb-28">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary-container border-t-transparent" />
        </div>
        <BottomNav />
      </div>
    )
  }

  const maxDaily = Math.max(...dailyRecipes.map((d) => d.count), 1)
  const maxCat = categories.length > 0 ? categories[0].count : 1

  function trendArrow(current: number, previous: number) {
    if (current > previous) return <span className="text-green-600 font-bold">↑</span>
    if (current < previous) return <span className="text-red-500 font-bold">↓</span>
    return <span className="text-on-surface-variant">—</span>
  }

  const overviewCards = [
    { label: 'מתכונים', value: overview.totalRecipes, icon: '🍳' },
    { label: 'משתמשים', value: overview.totalUsers, icon: '👥' },
    { label: 'תגובות', value: overview.totalComments, icon: '💬' },
    { label: 'דירוגים', value: overview.totalRatings, icon: '⭐' },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-surface pt-20 pb-28">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-8">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-on-surface font-rubik text-center"
        >
          📊 לוח בקרה
        </motion.h1>

        {/* ── Overview Cards ── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {overviewCards.map((card, i) => (
            <motion.div
              key={card.label}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4 shadow-sm text-center"
            >
              <span className="text-3xl">{card.icon}</span>
              <p className="mt-2 text-2xl font-bold text-on-surface">{card.value.toLocaleString('he-IL')}</p>
              <p className="text-sm text-on-surface-variant font-rubik">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Activity This Week ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-5 shadow-sm"
        >
          <h2 className="text-lg font-bold text-on-surface font-rubik mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">trending_up</span>
            פעילות השבוע
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Recipes trend */}
            <div className="rounded-xl bg-surface-container-low p-4 text-center">
              <p className="text-sm text-on-surface-variant font-rubik">מתכונים חדשים</p>
              <p className="text-2xl font-bold text-on-surface mt-1">
                {weekly.recipesThisWeek} {trendArrow(weekly.recipesThisWeek, weekly.recipesLastWeek)}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                שבוע שעבר: {weekly.recipesLastWeek}
              </p>
            </div>

            {/* Comments trend */}
            <div className="rounded-xl bg-surface-container-low p-4 text-center">
              <p className="text-sm text-on-surface-variant font-rubik">תגובות חדשות</p>
              <p className="text-2xl font-bold text-on-surface mt-1">
                {weekly.commentsThisWeek} {trendArrow(weekly.commentsThisWeek, weekly.commentsLastWeek)}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                שבוע שעבר: {weekly.commentsLastWeek}
              </p>
            </div>

            {/* New users */}
            <div className="rounded-xl bg-surface-container-low p-4 text-center">
              <p className="text-sm text-on-surface-variant font-rubik">משתמשים חדשים</p>
              <p className="text-2xl font-bold text-on-surface mt-1">
                {weekly.newUsersThisWeek}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">השבוע</p>
            </div>
          </div>
        </motion.div>

        {/* ── Recipes Per Day Chart ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-5 shadow-sm"
        >
          <h2 className="text-lg font-bold text-on-surface font-rubik mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
            מתכונים ב-7 ימים אחרונים
          </h2>

          <div className="flex items-end justify-between gap-2 h-40">
            {dailyRecipes.map((bucket, i) => (
              <div key={bucket.date} className="flex flex-col items-center flex-1 gap-1">
                <span className="text-xs font-bold text-on-surface">{bucket.count}</span>
                <motion.div
                  className="w-full rounded-t-lg bg-primary"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((bucket.count / maxDaily) * 100, 4)}%` }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.07, ease: 'easeOut' }}
                  style={{ minHeight: bucket.count > 0 ? 8 : 4 }}
                />
                <span className="text-[10px] text-on-surface-variant font-rubik whitespace-nowrap">
                  {bucket.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Top Categories ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-5 shadow-sm"
        >
          <h2 className="text-lg font-bold text-on-surface font-rubik mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">category</span>
            מתכונים לפי קטגוריה
          </h2>

          <div className="space-y-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center shrink-0">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-on-surface font-rubik">{cat.name}</span>
                      <span className="text-sm font-bold text-on-surface">{cat.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-surface-container-low overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(cat.count / maxCat) * 100}%` }}
                        transition={{ duration: 0.6, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cat.bar }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-4 font-rubik">אין נתונים עדיין</p>
            )}
          </div>
        </motion.div>

        {/* ── Most Active Users ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-5 shadow-sm"
        >
          <h2 className="text-lg font-bold text-on-surface font-rubik mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">group</span>
            המשתמשים הפעילים ביותר
          </h2>

          <div className="space-y-3">
            {topUsers.map((user, i) => (
              <motion.div
                key={user.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3"
              >
                {/* Rank */}
                <span className="text-lg font-bold text-on-surface-variant w-6 text-center shrink-0">
                  {i + 1}
                </span>

                {/* Avatar */}
                <AvatarWithFrame userId={user.id} avatarUrl={user.avatar_url} displayName={user.display_name} frameId={frameMap.get(user.id)} size={40} />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface font-rubik truncate">{user.display_name}</p>
                  <p className="text-xs text-on-surface-variant font-rubik">{user.activity} פעולות</p>
                </div>

                {/* Medal for top 3 */}
                {i < 3 && (
                  <span className="text-xl shrink-0">
                    {['🥇', '🥈', '🥉'][i]}
                  </span>
                )}
              </motion.div>
            ))}
            {topUsers.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-4 font-rubik">אין נתונים עדיין</p>
            )}
          </div>
        </motion.div>
        {/* ── User Management ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-5 shadow-sm"
        >
          <button
            onClick={handleOpenUserManagement}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-lg font-bold text-on-surface font-rubik flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">manage_accounts</span>
              ניהול משתתפים
            </h2>
            <motion.span
              animate={{ rotate: showUserManagement ? 180 : 0 }}
              className="material-symbols-outlined text-on-surface-variant"
            >
              expand_more
            </motion.span>
          </button>

          <AnimatePresence>
            {showUserManagement && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-4">
                  {/* Search */}
                  <div className="relative mb-4">
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                      search
                    </span>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="חיפוש משתמש..."
                      className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pr-10 pl-3 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-rubik"
                    />
                  </div>

                  {usersLoading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-primary" />
                    </div>
                  )}

                  {!usersLoading && (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                            user.is_admin
                              ? 'bg-primary/5 border border-primary/20'
                              : 'bg-surface-container-low'
                          }`}
                        >
                          <AvatarWithFrame
                            userId={user.id}
                            avatarUrl={user.avatar_url}
                            displayName={user.display_name}
                            frameId={userFrameMap.get(user.id)}
                            size={40}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-on-surface font-rubik truncate">
                                {user.display_name}
                              </p>
                              {user.is_admin && (
                                <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  אדמין
                                </span>
                              )}
                              {user.id === currentUserId && (
                                <span className="shrink-0 rounded-full bg-tertiary/15 px-2 py-0.5 text-[10px] font-bold text-tertiary">
                                  אני
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant font-rubik">
                              {user.recipe_count} מתכונים · {user.comment_count} תגובות
                              {' · '}
                              הצטרף/ה {new Date(user.created_at).toLocaleDateString('he-IL')}
                            </p>
                          </div>

                          {/* Actions */}
                          {user.id !== currentUserId && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => toggleAdmin(user.id, user.is_admin)}
                                className={`rounded-lg p-2 text-sm transition-colors ${
                                  user.is_admin
                                    ? 'text-primary hover:bg-primary/10'
                                    : 'text-on-surface-variant hover:bg-surface-container-high'
                                }`}
                                title={user.is_admin ? 'הסר אדמין' : 'הפוך לאדמין'}
                              >
                                <span
                                  className="material-symbols-outlined text-lg"
                                  style={user.is_admin ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                >
                                  admin_panel_settings
                                </span>
                              </button>
                              <button
                                onClick={() => deleteUser(user.id, user.display_name)}
                                className="rounded-lg p-2 text-error/70 transition-colors hover:bg-error/10 hover:text-error"
                                title="מחק משתמש"
                              >
                                <span className="material-symbols-outlined text-lg">person_remove</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {filteredUsers.length === 0 && !usersLoading && (
                        <p className="text-sm text-on-surface-variant text-center py-6 font-rubik">
                          {userSearch ? 'לא נמצאו משתמשים' : 'אין משתמשים'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Summary */}
                  {!usersLoading && managedUsers.length > 0 && (
                    <div className="mt-3 flex items-center gap-3 text-xs text-on-surface-variant font-rubik border-t border-outline-variant/30 pt-3">
                      <span>{managedUsers.length} משתמשים</span>
                      <span>·</span>
                      <span>{managedUsers.filter((u) => u.is_admin).length} אדמינים</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  )
}
