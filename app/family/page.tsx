'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getAvatarGradient } from '@/lib/avatar-gradient'
import AvatarWithFrame from '@/components/AvatarWithFrame'
import { fetchEquippedFrames } from '@/lib/fetch-frames'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface Family {
  id: string
  name: string
  created_by: string
  invite_code: string
}

interface Member {
  user_id: string
  role: string
  profiles: {
    display_name: string
    avatar_url: string | null
  }
}

export default function FamilyPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [frameMap, setFrameMap] = useState<Map<string, string>>(new Map())
  const [myRole, setMyRole] = useState<string>('member')

  // Create family
  const [showCreate, setShowCreate] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [creating, setCreating] = useState(false)

  // Join family
  const [showJoin, setShowJoin] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      // Check if user is in a family
      const { data: membership } = await supabase
        .from('family_members')
        .select('family_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (membership) {
        setMyRole(membership.role)
        await loadFamily(membership.family_id)
      }

      setLoading(false)
    }

    load()
  }, [])

  async function loadFamily(familyId: string) {
    const [familyRes, membersRes] = await Promise.all([
      supabase.from('families').select('*').eq('id', familyId).single(),
      supabase.from('family_members')
        .select('user_id, role, profiles!user_id(display_name, avatar_url)')
        .eq('family_id', familyId),
    ])

    if (familyRes.data) setFamily(familyRes.data)
    if (membersRes.data) {
      const m = membersRes.data as unknown as Member[]
      setMembers(m)
      const ids = m.map((mem) => mem.user_id)
      const frames = await fetchEquippedFrames(ids)
      setFrameMap(frames)
    }
  }

  async function handleCreate() {
    if (!userId || !familyName.trim()) return
    setCreating(true)

    const { data, error } = await supabase
      .from('families')
      .insert({ name: familyName.trim(), created_by: userId })
      .select()
      .single()

    if (error) {
      toast.error('שגיאה ביצירת משפחה')
      setCreating(false)
      return
    }

    // Add creator as admin member
    await supabase.from('family_members').insert({
      family_id: data.id,
      user_id: userId,
      role: 'admin',
    })

    setMyRole('admin')
    await loadFamily(data.id)
    setShowCreate(false)
    setCreating(false)
    toast.success('המשפחה נוצרה!')
  }

  async function handleJoin() {
    if (!userId || !inviteCode.trim()) return
    setJoining(true)

    // Find family by invite code
    const { data: fam } = await supabase
      .from('families')
      .select('id')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single()

    if (!fam) {
      toast.error('קוד הזמנה לא נמצא')
      setJoining(false)
      return
    }

    const { error } = await supabase.from('family_members').insert({
      family_id: fam.id,
      user_id: userId,
      role: 'member',
    })

    if (error) {
      toast.error(error.code === '23505' ? 'כבר נמצא/ת במשפחה הזו' : 'שגיאה בהצטרפות')
      setJoining(false)
      return
    }

    setMyRole('member')
    await loadFamily(fam.id)
    setShowJoin(false)
    setJoining(false)
    toast.success('הצטרפת למשפחה!')
  }

  async function handleRemoveMember(memberId: string) {
    if (!family) return
    await supabase.from('family_members')
      .delete()
      .eq('family_id', family.id)
      .eq('user_id', memberId)

    setMembers((prev) => prev.filter((m) => m.user_id !== memberId))
    toast('חבר/ת הוסר/ה מהמשפחה')
  }

  async function handleLeave() {
    if (!family || !userId) return
    await supabase.from('family_members')
      .delete()
      .eq('family_id', family.id)
      .eq('user_id', userId)

    setFamily(null)
    setMembers([])
    toast('יצאת מהמשפחה')
  }

  async function handleDeleteFamily() {
    if (!family) return
    await supabase.from('families').delete().eq('id', family.id)
    setFamily(null)
    setMembers([])
    toast('המשפחה נמחקה')
  }

  function copyInviteCode() {
    if (!family) return
    navigator.clipboard.writeText(family.invite_code)
    toast.success('קוד ההזמנה הועתק!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface" dir="rtl">
        <Navbar />
        <div className="pt-20 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-container border-t-primary" />
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface" dir="rtl">
      <Navbar />
      <main className="pt-20 pb-28 px-4 max-w-2xl mx-auto">

        <h1 className="text-2xl font-bold text-on-surface font-rubik mb-6">המשפחה שלי</h1>

        {!family ? (
          /* No family - show create/join options */
          <div className="space-y-4">
            <p className="text-on-surface-variant text-sm font-rubik">
              צור משפחה או הצטרף לקיימת. חברי משפחה יכולים לערוך את המתכונים אחד של השני.
            </p>

            {/* Create */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setShowCreate(true); setShowJoin(false) }}
              className="w-full rounded-2xl bg-primary text-white p-4 font-bold font-rubik text-right"
            >
              צור משפחה חדשה
            </motion.button>

            <AnimatePresence>
              {showCreate && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl bg-surface-container-lowest p-4 space-y-3 border border-outline-variant">
                    <input
                      type="text"
                      placeholder="שם המשפחה (למשל: משפחת כהן)"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm font-rubik focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleCreate}
                      disabled={creating || !familyName.trim()}
                      className="w-full rounded-xl bg-primary text-white py-3 font-bold text-sm font-rubik disabled:opacity-50"
                    >
                      {creating ? 'יוצר...' : 'צור'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Join */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setShowJoin(true); setShowCreate(false) }}
              className="w-full rounded-2xl bg-surface-container-lowest border border-outline-variant text-on-surface p-4 font-bold font-rubik text-right"
            >
              הצטרף למשפחה קיימת
            </motion.button>

            <AnimatePresence>
              {showJoin && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl bg-surface-container-lowest p-4 space-y-3 border border-outline-variant">
                    <input
                      type="text"
                      placeholder="קוד הזמנה"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm font-rubik text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleJoin}
                      disabled={joining || !inviteCode.trim()}
                      className="w-full rounded-xl bg-primary text-white py-3 font-bold text-sm font-rubik disabled:opacity-50"
                    >
                      {joining ? 'מצטרף...' : 'הצטרף'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Has family - show members */
          <div className="space-y-6">
            {/* Family info card */}
            <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-on-surface font-rubik">{family.name}</h2>
                <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-rubik">
                  {myRole === 'admin' ? 'מנהל/ת' : 'חבר/ה'}
                </span>
              </div>

              {/* Invite code */}
              <div className="flex items-center gap-2 bg-surface-container rounded-xl px-4 py-3">
                <span className="text-xs text-on-surface-variant font-rubik">קוד הזמנה:</span>
                <span className="font-mono font-bold text-primary tracking-widest flex-1">{family.invite_code}</span>
                <button
                  onClick={copyInviteCode}
                  className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-rubik active:scale-95 transition-transform"
                >
                  העתק
                </button>
              </div>
            </div>

            {/* Members list */}
            <div>
              <h3 className="text-sm font-bold text-on-surface-variant font-rubik mb-3">
                חברי המשפחה ({members.length})
              </h3>
              <div className="space-y-2">
                {members.map((member, i) => (
                  <motion.div
                    key={member.user_id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-3 border border-outline-variant"
                  >
                    <AvatarWithFrame
                      userId={member.user_id}
                      avatarUrl={member.profiles.avatar_url}
                      displayName={member.profiles.display_name}
                      frameId={frameMap.get(member.user_id)}
                      size={40}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm text-on-surface font-rubik">{member.profiles.display_name}</span>
                      {member.role === 'admin' && (
                        <span className="mr-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">מנהל/ת</span>
                      )}
                    </div>
                    {/* Admin can remove non-admin members */}
                    {myRole === 'admin' && member.user_id !== userId && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-xs text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 font-rubik"
                      >
                        הסר
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-outline-variant">
              {myRole !== 'admin' && (
                <button
                  onClick={handleLeave}
                  className="w-full text-sm text-red-500 py-2 font-rubik"
                >
                  עזוב את המשפחה
                </button>
              )}
              {myRole === 'admin' && (
                <button
                  onClick={handleDeleteFamily}
                  className="w-full text-sm text-red-500 py-2 font-rubik"
                >
                  מחק את המשפחה
                </button>
              )}
            </div>
          </div>
        )}

      </main>
      <BottomNav />
    </div>
  )
}
