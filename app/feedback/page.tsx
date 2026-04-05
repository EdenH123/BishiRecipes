'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { getAvatarGradient } from '@/lib/avatar-gradient'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

type FeedbackType = 'suggestion' | 'bug' | 'improvement'
type FeedbackStatus = 'open' | 'in_progress' | 'done' | 'rejected'

interface FeedbackItem {
  id: string
  user_id: string
  type: FeedbackType
  title: string
  description: string
  status: FeedbackStatus
  votes: number
  created_at: string
  profiles?: { display_name: string; avatar_url: string | null; id: string }
}

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: string; color: string }> = {
  suggestion: { label: 'הצעה', icon: '💡', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  bug: { label: 'באג', icon: '🐛', color: 'bg-red-100 text-red-800 border-red-300' },
  improvement: { label: 'שיפור', icon: '✨', color: 'bg-blue-100 text-blue-800 border-blue-300' },
}

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; icon: string; color: string }> = {
  open: { label: 'פתוח', icon: '🔵', color: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'בעבודה', icon: '🟡', color: 'bg-yellow-50 text-yellow-700' },
  done: { label: 'בוצע', icon: '🟢', color: 'bg-green-50 text-green-700' },
  rejected: { label: 'נדחה', icon: '🔴', color: 'bg-red-50 text-red-700' },
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
}

export default function FeedbackPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set())

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<FeedbackType>('suggestion')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [filterType, setFilterType] = useState<FeedbackType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      if (profile) setIsAdmin(profile.is_admin)

      // Fetch feedback items
      const { data: feedbackData } = await supabase
        .from('feedback')
        .select('*, profiles!user_id(display_name, avatar_url, id)')
        .order('created_at', { ascending: false })

      if (feedbackData) {
        setItems(feedbackData as FeedbackItem[])
      }

      // Fetch user's votes
      const { data: votesData } = await supabase
        .from('feedback_votes')
        .select('feedback_id')
        .eq('user_id', user.id)

      if (votesData) {
        setMyVotes(new Set(votesData.map((v) => v.feedback_id)))
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit() {
    if (!formTitle.trim()) {
      toast.error('נא להזין כותרת')
      return
    }
    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          user_id: userId,
          type: formType,
          title: formTitle.trim(),
          description: formDesc.trim(),
          status: 'open',
          votes: 0,
        })
        .select('*, profiles!user_id(display_name, avatar_url, id)')
        .single()

      if (error) throw error

      setItems((prev) => [data as FeedbackItem, ...prev])
      setFormTitle('')
      setFormDesc('')
      setShowForm(false)
      toast.success('ההצעה נשלחה בהצלחה!')
    } catch (e: any) {
      toast.error(`שגיאה: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVote(item: FeedbackItem) {
    if (!userId) return
    const hasVoted = myVotes.has(item.id)

    // Optimistic update
    const newVotes = new Set(myVotes)
    const newCount = hasVoted ? item.votes - 1 : item.votes + 1
    if (hasVoted) newVotes.delete(item.id)
    else newVotes.add(item.id)
    setMyVotes(newVotes)
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, votes: newCount } : i))

    try {
      if (hasVoted) {
        await supabase.from('feedback_votes').delete()
          .eq('feedback_id', item.id)
          .eq('user_id', userId)
        await supabase.from('feedback').update({ votes: newCount }).eq('id', item.id)
      } else {
        await supabase.from('feedback_votes').insert({ feedback_id: item.id, user_id: userId })
        await supabase.from('feedback').update({ votes: newCount }).eq('id', item.id)
      }
    } catch {
      // Revert
      setMyVotes(myVotes)
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, votes: item.votes } : i))
      toast.error('שגיאה בהצבעה')
    }
  }

  async function handleStatusChange(itemId: string, newStatus: FeedbackStatus) {
    try {
      await supabase.from('feedback').update({ status: newStatus }).eq('id', itemId)
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, status: newStatus } : i))
      toast.success('הסטטוס עודכן')
    } catch {
      toast.error('שגיאה בעדכון סטטוס')
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm('למחוק את ההצעה?')) return
    try {
      await supabase.from('feedback').delete().eq('id', itemId)
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      toast.success('נמחק')
    } catch {
      toast.error('שגיאה במחיקה')
    }
  }

  const filtered = items
    .filter((i) => filterType === 'all' || i.type === filterType)
    .filter((i) => filterStatus === 'all' || i.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'votes') return b.votes - a.votes
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const stats = {
    total: items.length,
    open: items.filter((i) => i.status === 'open').length,
    inProgress: items.filter((i) => i.status === 'in_progress').length,
    done: items.filter((i) => i.status === 'done').length,
  }

  if (loading) {
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

  return (
    <div dir="rtl" className="min-h-screen bg-surface pt-20 pb-28">
      <Navbar />

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-on-surface font-rubik">
            📋 הצעות ושיפורים
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-rubik">
            הציעו רעיונות, דווחו על באגים, הצביעו למועדפים
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: 'סה״כ', value: stats.total, color: 'text-on-surface' },
            { label: 'פתוח', value: stats.open, color: 'text-blue-600' },
            { label: 'בעבודה', value: stats.inProgress, color: 'text-yellow-600' },
            { label: 'בוצע', value: stats.done, color: 'text-green-600' },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-2.5 text-center shadow-sm"
            >
              <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
              <p className="text-[10px] text-on-surface-variant font-rubik mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* New feedback button */}
        <motion.button
          onClick={() => setShowForm(!showForm)}
          whileTap={{ scale: 0.97 }}
          className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-on-primary font-bold font-rubik shadow-md"
        >
          <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'ביטול' : 'הצעה חדשה'}
        </motion.button>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-4 shadow-sm space-y-3">
                {/* Type selection */}
                <div className="flex gap-2">
                  {(Object.entries(TYPE_CONFIG) as [FeedbackType, typeof TYPE_CONFIG.suggestion][]).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => setFormType(type)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium font-rubik transition-all ${
                        formType === type
                          ? `${config.color} border-current shadow-sm`
                          : 'border-outline-variant/30 text-on-surface-variant'
                      }`}
                    >
                      {config.icon} {config.label}
                    </button>
                  ))}
                </div>

                {/* Title */}
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="כותרת קצרה..."
                  className="w-full rounded-lg border border-outline-variant/30 bg-white px-4 py-2.5 font-rubik text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />

                {/* Description */}
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="תיאור מפורט (אופציונלי)..."
                  rows={3}
                  className="w-full rounded-lg border border-outline-variant/30 bg-white px-4 py-2.5 font-rubik text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                />

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !formTitle.trim()}
                  className="w-full rounded-lg bg-primary py-2.5 text-on-primary font-bold font-rubik text-sm disabled:opacity-50"
                >
                  {submitting ? '...' : 'שלח'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FeedbackType | 'all')}
            className="rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-rubik outline-none"
          >
            <option value="all">כל הסוגים</option>
            <option value="suggestion">💡 הצעות</option>
            <option value="bug">🐛 באגים</option>
            <option value="improvement">✨ שיפורים</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FeedbackStatus | 'all')}
            className="rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-rubik outline-none"
          >
            <option value="all">כל הסטטוסים</option>
            <option value="open">🔵 פתוח</option>
            <option value="in_progress">🟡 בעבודה</option>
            <option value="done">🟢 בוצע</option>
            <option value="rejected">🔴 נדחה</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'votes' | 'newest')}
            className="rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-rubik outline-none"
          >
            <option value="votes">הכי מבוקש</option>
            <option value="newest">חדש ← ישן</option>
          </select>
        </div>

        {/* Feedback list */}
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-on-surface-variant font-rubik">
            אין הצעות עדיין — היו הראשונים! 💡
          </p>
        ) : (
          <motion.div
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filtered.map((item) => {
              const typeConf = TYPE_CONFIG[item.type]
              const statusConf = STATUS_CONFIG[item.status]
              const hasVoted = myVotes.has(item.id)
              const isOwner = item.user_id === userId
              const timeAgo = getTimeAgo(item.created_at)

              return (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  layout
                  className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    {/* Vote button */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <motion.button
                        onClick={() => handleVote(item)}
                        whileTap={{ scale: 0.8 }}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                          hasVoted
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-primary/10'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg" style={hasVoted ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                          thumb_up
                        </span>
                      </motion.button>
                      <span className={`text-sm font-bold ${hasVoted ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {item.votes}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeConf.color}`}>
                          {typeConf.icon} {typeConf.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConf.color}`}>
                          {statusConf.icon} {statusConf.label}
                        </span>
                      </div>

                      <h3 className="mt-1.5 text-sm font-bold text-on-surface font-rubik">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="mt-1 text-xs text-on-surface-variant font-rubik leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-2 text-[11px] text-on-surface-variant">
                        {item.profiles?.avatar_url ? (
                          <img src={item.profiles.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" loading="lazy" />
                        ) : (
                          <div
                            className="h-4 w-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center"
                            style={{ background: getAvatarGradient(item.profiles?.id || '') }}
                          >
                            {item.profiles?.display_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span>{item.profiles?.display_name}</span>
                        <span>·</span>
                        <span>{timeAgo}</span>
                      </div>

                      {/* Admin controls */}
                      {isAdmin && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value as FeedbackStatus)}
                            className="rounded-md bg-surface-container-low px-2 py-1 text-[10px] font-rubik outline-none"
                          >
                            <option value="open">🔵 פתוח</option>
                            <option value="in_progress">🟡 בעבודה</option>
                            <option value="done">🟢 בוצע</option>
                            <option value="rejected">🔴 נדחה</option>
                          </select>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-md bg-red-50 px-2 py-1 text-[10px] text-red-600 font-rubik hover:bg-red-100"
                          >
                            מחק
                          </button>
                        </div>
                      )}

                      {/* Owner delete */}
                      {isOwner && !isAdmin && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="mt-2 text-[10px] text-red-500 font-rubik hover:underline"
                        >
                          מחק
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'עכשיו'
  if (minutes < 60) return `לפני ${minutes} דק׳`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `לפני ${hours} שע׳`
  const days = Math.floor(hours / 24)
  if (days < 7) return `לפני ${days} ימים`
  const weeks = Math.floor(days / 7)
  return `לפני ${weeks} שבועות`
}
