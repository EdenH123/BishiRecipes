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
import PageTransition from '@/components/PageTransition'

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

interface DeletedRecipe {
  id: string
  title: string
  deleted_at: string
  deleted_by: string | null
  deleter_name: string
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

  // Deleted recipes state
  const [showDeletedRecipes, setShowDeletedRecipes] = useState(false)
  const [deletedRecipes, setDeletedRecipes] = useState<DeletedRecipe[]>([])
  const [deletedLoading, setDeletedLoading] = useState(false)

  // Interactive chart state (tap-based for mobile)
  const [selectedBar, setSelectedBar] = useState<number | null>(null)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)

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
          supabase.from('recipes').select('*', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('comments').select('*', { count: 'exact', head: true }),
          supabase.from('ratings').select('*', { count: 'exact', head: true }),
          // Weekly activity
          supabase.from('recipes').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', weekAgoISO),
          supabase.from('recipes').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', twoWeeksAgoISO).lt('created_at', weekAgoISO),
          supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
          supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgoISO).lt('created_at', weekAgoISO),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
          // Daily chart – last 7 days recipes
          supabase.from('recipes').select('created_at').is('deleted_at', null).gte('created_at', weekAgoISO),
          // Categories
          supabase.from('recipes').select('category').is('deleted_at', null),
          // Top users - recipe creators
          supabase.from('recipes').select('created_by').is('deleted_at', null),
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
        supabase.from('recipes').select('created_by').is('deleted_at', null),
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

  // ── Deleted Recipes Management ──
  const loadDeletedRecipes = useCallback(async () => {
    setDeletedLoading(true)
    try {
      const { data: recipes } = await supabase
        .from('recipes')
        .select('id, title, deleted_at, deleted_by')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (!recipes || recipes.length === 0) {
        setDeletedRecipes([])
        return
      }

      // Fetch deleter profile names
      const deleterIds = Array.from(new Set(recipes.map(r => r.deleted_by).filter(Boolean)))
      const profileMap = new Map<string, string>()
      if (deleterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', deleterIds)
        if (profiles) {
          for (const p of profiles) profileMap.set(p.id, p.display_name)
        }
      }

      setDeletedRecipes(recipes.map(r => ({
        id: r.id,
        title: r.title,
        deleted_at: r.deleted_at,
        deleted_by: r.deleted_by,
        deleter_name: r.deleted_by ? (profileMap.get(r.deleted_by) || 'לא ידוע') : 'לא ידוע',
      })))
    } catch {
      toast.error('שגיאה בטעינת מתכונים שנמחקו')
    } finally {
      setDeletedLoading(false)
    }
  }, [supabase])

  async function restoreRecipe(recipeId: string, title: string) {
    const { error } = await supabase
      .from('recipes')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', recipeId)

    if (error) {
      toast.error('שגיאה בשחזור המתכון')
    } else {
      setDeletedRecipes(prev => prev.filter(r => r.id !== recipeId))
      setOverview(prev => ({ ...prev, totalRecipes: prev.totalRecipes + 1 }))
      toast.success(`המתכון "${title}" שוחזר בהצלחה`)
    }
  }

  async function permanentlyDeleteRecipe(recipeId: string, title: string) {
    if (!confirm(`למחוק לצמיתות את "${title}"? פעולה זו בלתי הפיכה.`)) return

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)

    if (error) {
      toast.error('שגיאה במחיקת המתכון')
    } else {
      setDeletedRecipes(prev => prev.filter(r => r.id !== recipeId))
      toast.success(`המתכון "${title}" נמחק לצמיתות`)
    }
  }

  function handleOpenDeletedRecipes() {
    setShowDeletedRecipes(true)
    if (deletedRecipes.length === 0) loadDeletedRecipes()
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

      <PageTransition>
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

        {/* ── Recipes Per Day Chart (Interactive) ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-on-surface font-rubik flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">bar_chart</span>
              מתכונים ב-7 ימים אחרונים
            </h2>
            <span className="text-xs text-on-surface-variant font-rubik">
              סה״כ: {dailyRecipes.reduce((s, d) => s + d.count, 0)}
            </span>
          </div>

          {/* Grid lines */}
          <div className="relative h-44">
            {/* Horizontal grid lines */}
            {maxDaily > 0 && [0.25, 0.5, 0.75, 1].map((pct) => (
              <div
                key={pct}
                className="absolute w-full border-t border-outline-variant/10"
                style={{ bottom: `${pct * 100}%` }}
              >
                <span className="absolute -top-2.5 -right-1 text-[9px] text-outline/40 font-rubik">
                  {Math.round(maxDaily * pct)}
                </span>
              </div>
            ))}

            {/* Bars */}
            <div className="flex items-end justify-between gap-2 h-full relative z-10">
              {dailyRecipes.map((bucket, i) => {
                const isActive = selectedBar === i
                const pct = maxDaily > 0 ? (bucket.count / maxDaily) * 100 : 0

                return (
                  <div
                    key={bucket.date}
                    className="flex flex-col items-center flex-1 gap-1 relative cursor-pointer active:scale-95 transition-transform"
                    onClick={() => setSelectedBar(selectedBar === i ? null : i)}
                  >
                    {/* Tooltip on tap */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 5, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.9 }}
                          className="absolute -top-12 z-20 rounded-lg bg-on-surface px-2.5 py-1.5 shadow-lg"
                        >
                          <p className="text-xs font-bold text-surface whitespace-nowrap">
                            {bucket.count} מתכונים
                          </p>
                          <p className="text-[10px] text-surface/70">{bucket.date}</p>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 h-2 w-2 bg-on-surface" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Count label */}
                    <span className={`text-xs font-bold ${isActive ? 'text-primary scale-110' : 'text-on-surface'} transition-all`}>
                      {bucket.count}
                    </span>

                    {/* Bar */}
                    <motion.div
                      className="w-full rounded-t-lg"
                      initial={{ height: 0 }}
                      animate={{
                        height: `${Math.max(pct, 4)}%`,
                        backgroundColor: isActive ? '#7C5CFC' : '#6750A4',
                        scale: isActive ? 1.08 : 1,
                      }}
                      transition={{ duration: 0.5, delay: 0.2 + i * 0.07, ease: 'easeOut' }}
                      style={{ minHeight: bucket.count > 0 ? 8 : 4 }}
                    />

                    {/* Day label */}
                    <span className={`text-[10px] font-rubik whitespace-nowrap transition-all ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                      {bucket.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected day details */}
          <AnimatePresence>
            {selectedBar !== null && dailyRecipes[selectedBar] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                  <span className="text-sm font-rubik text-on-surface-variant">
                    {dailyRecipes[selectedBar].label} ({dailyRecipes[selectedBar].date})
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {dailyRecipes[selectedBar].count} מתכונים נוספו
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Top Categories (Interactive Donut + Bars) ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-on-surface font-rubik flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">category</span>
              מתכונים לפי קטגוריה
            </h2>
            <span className="text-xs text-on-surface-variant font-rubik">
              {categories.length} קטגוריות
            </span>
          </div>

          {/* Donut chart */}
          {categories.length > 0 && (
            <div className="flex items-center justify-center mb-5">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    const total = categories.reduce((s, c) => s + c.count, 0)
                    let offset = 0
                    return categories.map((cat) => {
                      const pct = (cat.count / total) * 100
                      const circumference = Math.PI * 70
                      const dashLen = (pct / 100) * circumference
                      const dashOffset = (offset / 100) * circumference
                      offset += pct
                      const isActive = selectedCat === cat.name
                      return (
                        <motion.circle
                          key={cat.name}
                          cx="50" cy="50" r="35"
                          fill="none"
                          stroke={cat.bar}
                          strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                          strokeDashoffset={-dashOffset}
                          strokeLinecap="round"
                          className="cursor-pointer"
                          onClick={() => setSelectedCat(selectedCat === cat.name ? null : cat.name)}
                          initial={{ strokeDasharray: `0 ${circumference}`, strokeWidth: 10 }}
                          animate={{ strokeDasharray: `${dashLen} ${circumference - dashLen}`, strokeWidth: isActive ? 14 : 10 }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      )
                    })
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {selectedCat ? (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                      <p className="text-lg font-bold text-on-surface">
                        {categories.find((c) => c.name === selectedCat)?.count}
                      </p>
                      <p className="text-[10px] text-on-surface-variant font-rubik">{selectedCat}</p>
                    </motion.div>
                  ) : (
                    <div className="text-center">
                      <p className="text-lg font-bold text-on-surface">
                        {categories.reduce((s, c) => s + c.count, 0)}
                      </p>
                      <p className="text-[10px] text-on-surface-variant font-rubik">סה״כ</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Legend + bars */}
          <div className="space-y-2.5">
            {categories.map((cat, i) => {
              const total = categories.reduce((s, c) => s + c.count, 0)
              const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0
              const isActive = selectedCat === cat.name

              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                  className={`flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors cursor-pointer ${isActive ? 'bg-surface-container-low' : ''}`}
                  onClick={() => setSelectedCat(selectedCat === cat.name ? null : cat.name)}
                >
                  <span className="text-xl w-8 text-center shrink-0">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-rubik transition-all ${isActive ? 'font-bold text-on-surface' : 'font-medium text-on-surface'}`}>
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <motion.span
                          className="text-xs text-on-surface-variant font-rubik"
                          animate={{ opacity: isActive ? 1 : 0.5 }}
                        >
                          {pct}%
                        </motion.span>
                        <span className="text-sm font-bold text-on-surface">{cat.count}</span>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full bg-surface-container-low overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(cat.count / maxCat) * 100}%` }}
                        transition={{ duration: 0.6, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
                        className="h-full rounded-full relative overflow-hidden"
                        style={{ backgroundColor: cat.bar }}
                      >
                        {isActive && (
                          <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '200%' }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          />
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
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

        {/* ── Deleted Recipes ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-5 shadow-sm"
        >
          <button
            onClick={handleOpenDeletedRecipes}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-lg font-bold text-on-surface font-rubik flex items-center gap-2">
              <span className="material-symbols-outlined text-error">delete_sweep</span>
              מתכונים שנמחקו
            </h2>
            <motion.span
              animate={{ rotate: showDeletedRecipes ? 180 : 0 }}
              className="material-symbols-outlined text-on-surface-variant"
            >
              expand_more
            </motion.span>
          </button>

          <AnimatePresence>
            {showDeletedRecipes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-4">
                  {deletedLoading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-primary" />
                    </div>
                  )}

                  {!deletedLoading && deletedRecipes.length === 0 && (
                    <p className="text-sm text-on-surface-variant text-center py-6 font-rubik">
                      אין מתכונים שנמחקו
                    </p>
                  )}

                  {!deletedLoading && deletedRecipes.length > 0 && (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {deletedRecipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface font-rubik truncate">
                              {recipe.title}
                            </p>
                            <p className="text-xs text-on-surface-variant font-rubik">
                              נמחק ע״י {recipe.deleter_name}
                              {' · '}
                              {new Date(recipe.deleted_at).toLocaleDateString('he-IL')}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => restoreRecipe(recipe.id, recipe.title)}
                              className="rounded-lg px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/10 font-rubik"
                              title="שחזור"
                            >
                              <span className="material-symbols-outlined text-lg">restore</span>
                            </button>
                            <button
                              onClick={() => permanentlyDeleteRecipe(recipe.id, recipe.title)}
                              className="rounded-lg px-3 py-2 text-sm text-error/70 transition-colors hover:bg-error/10 hover:text-error"
                              title="מחיקה לצמיתות"
                            >
                              <span className="material-symbols-outlined text-lg">delete_forever</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Summary */}
                      <div className="mt-3 flex items-center gap-3 text-xs text-on-surface-variant font-rubik border-t border-outline-variant/30 pt-3">
                        <span>{deletedRecipes.length} מתכונים נמחקו</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      </PageTransition>

      <BottomNav />
    </div>
  )
}
