'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import { SHOP_ITEMS, type ShopItem, calculateCoins, getShopItem } from '@/lib/coins'
import { calculateXP, getLevel } from '@/lib/xp-levels'
import { type UserStats } from '@/lib/achievements'
import { getAvatarGradient } from '@/lib/avatar-gradient'

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 25 }

export default function ShopPage() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null)
  const [coins, setCoins] = useState(0)
  const [level, setLevel] = useState(1)
  const [purchasedItems, setPurchasedItems] = useState<string[]>([])
  const [equippedFrame, setEquippedFrame] = useState<string | null>(null)
  const [equippedTitle, setEquippedTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'frame' | 'title'>('frame')
  const [spentCoins, setSpentCoins] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const [profileRes, recipesRes, commentsRes, ratingsRes, favoritesRes, reactionsRes, collabsRes, purchasedRes] = await Promise.all([
        supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single(),
        supabase.from('recipes').select('id').eq('created_by', user.id),
        supabase.from('comments').select('id').eq('user_id', user.id),
        supabase.from('ratings').select('id').eq('user_id', user.id),
        supabase.from('favorites').select('recipe_id').eq('user_id', user.id),
        supabase.from('reactions').select('id').eq('user_id', user.id),
        supabase.from('recipe_collaborators').select('recipe_id').eq('user_id', user.id),
        supabase.from('user_items').select('item_id, equipped').eq('user_id', user.id),
      ])

      if (profileRes.data) setProfile(profileRes.data)

      const stats: UserStats = {
        recipeCount: recipesRes.data?.length ?? 0,
        commentCount: commentsRes.data?.length ?? 0,
        ratingCount: ratingsRes.data?.length ?? 0,
        favoriteCount: favoritesRes.data?.length ?? 0,
        reactionCount: reactionsRes.data?.length ?? 0,
        collaborationCount: collabsRes.data?.length ?? 0,
        categoriesUsed: 0,
      }

      const xp = calculateXP(stats)
      setLevel(getLevel(xp).level)

      const totalCoins = calculateCoins(stats)

      const purchased = purchasedRes.data ?? []
      const ids = purchased.map((p) => p.item_id)
      setPurchasedItems(ids)

      // Calculate spent coins
      let spent = 0
      for (const id of ids) {
        const item = getShopItem(id)
        if (item) spent += item.price
      }
      setSpentCoins(spent)
      setCoins(totalCoins - spent)

      // Get equipped items
      for (const p of purchased) {
        if (p.equipped) {
          const item = getShopItem(p.item_id)
          if (item?.type === 'frame') setEquippedFrame(p.item_id)
          if (item?.type === 'title') setEquippedTitle(p.item_id)
        }
      }

      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleBuy(item: ShopItem) {
    if (!userId) return
    if (purchasedItems.includes(item.id)) return
    if (coins < item.price) {
      toast.error('אין מספיק מטבעות!')
      return
    }
    if (item.minLevel && level < item.minLevel) {
      toast.error(`צריך להגיע לרמה ${item.minLevel} כדי לקנות!`)
      return
    }

    const { error } = await supabase.from('user_items').insert({
      user_id: userId,
      item_id: item.id,
      equipped: false,
    })

    if (error) {
      toast.error('שגיאה ברכישה')
      return
    }

    setPurchasedItems((prev) => [...prev, item.id])
    setCoins((prev) => prev - item.price)
    setSpentCoins((prev) => prev + item.price)
    toast.success(`קנית ${item.name}!`)
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#feae2c', '#f59e0b', '#fbbf24'] })
  }

  async function handleEquip(item: ShopItem) {
    if (!userId) return

    // Unequip all items of same type
    const sameTypeItems = purchasedItems.filter((id) => getShopItem(id)?.type === item.type)
    for (const id of sameTypeItems) {
      await supabase.from('user_items').update({ equipped: false }).eq('user_id', userId).eq('item_id', id)
    }

    // Equip the new one
    await supabase.from('user_items').update({ equipped: true }).eq('user_id', userId).eq('item_id', item.id)

    if (item.type === 'frame') setEquippedFrame(item.id)
    if (item.type === 'title') setEquippedTitle(item.id)
    toast.success(`הופעל: ${item.name}`)
  }

  async function handleUnequip(item: ShopItem) {
    if (!userId) return
    await supabase.from('user_items').update({ equipped: false }).eq('user_id', userId).eq('item_id', item.id)
    if (item.type === 'frame') setEquippedFrame(null)
    if (item.type === 'title') setEquippedTitle(null)
    toast('הוסר')
  }

  const titleText = equippedTitle ? getShopItem(equippedTitle)?.preview ?? '' : ''
  const gradient = profile ? getAvatarGradient(userId ?? '') : undefined

  const filteredItems = SHOP_ITEMS.filter((i) => i.type === tab)

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

        {/* Avatar preview + coins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative w-[104px] h-[104px] flex items-center justify-center mb-3">
            {equippedFrame && (
              <>
                <div
                  className="absolute inset-0 rounded-full p-[2.5px]"
                  style={{ background: getShopItem(equippedFrame)?.preview }}
                >
                  <div className="w-full h-full rounded-full bg-surface" />
                </div>
                {getShopItem(equippedFrame)?.decorations?.map((deco, di) => {
                  const count = getShopItem(equippedFrame)?.decorations?.length ?? 1
                  const angle = (di / count) * Math.PI * 2 - Math.PI / 2
                  const radius = 48
                  return (
                    <span
                      key={di}
                      className="absolute z-30 flex items-center justify-center w-6 h-6 rounded-full text-xs leading-none pointer-events-none"
                      style={{
                        left: `calc(50% + ${Math.cos(angle) * radius}px - 12px)`,
                        top: `calc(50% + ${Math.sin(angle) * radius}px - 12px)`,
                        background: getShopItem(equippedFrame)?.preview,
                      }}
                    >
                      {deco}
                    </span>
                  )
                })}
              </>
            )}
            <div className="relative z-10 w-[92px] h-[92px] rounded-full overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold" style={{ background: gradient }}>
                  {profile?.display_name?.charAt(0) ?? '?'}
                </div>
              )}
            </div>
          </div>
          <h2 className="text-lg font-bold text-on-surface font-rubik">{profile?.display_name}</h2>
          {titleText && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-primary font-medium mt-0.5"
            >
              {titleText}
            </motion.p>
          )}
          <motion.div
            className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-5 py-2"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <span className="text-xl">💰</span>
            <span className="text-lg font-bold text-amber-700">{coins}</span>
            <span className="text-sm text-amber-600">מטבעות</span>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 justify-center mb-6">
          <button
            onClick={() => setTab('frame')}
            className={`px-5 py-2.5 rounded-full font-medium transition-all ${
              tab === 'frame' ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-lg align-middle ml-1">photo_frame</span>
            מסגרות
          </button>
          <button
            onClick={() => setTab('title')}
            className={`px-5 py-2.5 rounded-full font-medium transition-all ${
              tab === 'title' ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-lg align-middle ml-1">military_tech</span>
            תוארים
          </button>
        </div>

        {/* Items grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            {filteredItems.map((item, index) => {
              const owned = purchasedItems.includes(item.id)
              const equipped = (item.type === 'frame' && equippedFrame === item.id) || (item.type === 'title' && equippedTitle === item.id)
              const locked = item.minLevel ? level < item.minLevel : false
              const cantAfford = !owned && coins < item.price

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, ...springTransition }}
                  className={`relative rounded-2xl p-4 border transition-all ${
                    equipped
                      ? 'bg-primary/5 border-primary shadow-md'
                      : owned
                      ? 'bg-surface-container-lowest border-outline-variant'
                      : locked
                      ? 'bg-surface-container border-outline-variant/50 opacity-60'
                      : 'bg-surface-container-lowest border-outline-variant'
                  }`}
                >
                  {/* Preview */}
                  <div className="flex justify-center mb-3">
                    {item.type === 'frame' ? (
                      <div className="relative w-[88px] h-[88px] flex items-center justify-center">
                        {/* Thin gradient ring */}
                        <div
                          className="absolute inset-0 rounded-full p-[2.5px]"
                          style={{ background: item.preview }}
                        >
                          <div className="w-full h-full rounded-full bg-surface-container-lowest" />
                        </div>
                        {/* Decorations embedded on the ring */}
                        {item.decorations?.map((deco, di) => {
                          const count = item.decorations?.length ?? 1
                          const angle = (di / count) * Math.PI * 2 - Math.PI / 2
                          const radius = 40
                          return (
                            <span
                              key={di}
                              className="absolute z-30 flex items-center justify-center w-5 h-5 rounded-full text-[11px] leading-none pointer-events-none"
                              style={{
                                left: `calc(50% + ${Math.cos(angle) * radius}px - 10px)`,
                                top: `calc(50% + ${Math.sin(angle) * radius}px - 10px)`,
                                background: item.preview,
                              }}
                            >
                              {deco}
                            </span>
                          )
                        })}
                        {/* Avatar */}
                        <div className="relative z-10 w-[78px] h-[78px] rounded-full overflow-hidden">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white" style={{ background: gradient }}>
                              {profile?.display_name?.charAt(0) ?? '?'}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-16 flex items-center justify-center">
                        <span className="text-2xl">{item.preview.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>

                  {/* Name + desc */}
                  <h3 className="font-bold text-sm text-on-surface text-center">{item.name}</h3>
                  <p className="text-xs text-on-surface-variant text-center mt-0.5">{item.description}</p>

                  {/* Price / Status */}
                  <div className="mt-3 text-center">
                    {locked ? (
                      <span className="text-xs text-outline">🔒 רמה {item.minLevel}</span>
                    ) : equipped ? (
                      <button
                        onClick={() => handleUnequip(item)}
                        className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium"
                      >
                        ✓ מופעל — הסר
                      </button>
                    ) : owned ? (
                      <button
                        onClick={() => handleEquip(item)}
                        className="text-xs bg-primary text-white px-3 py-1.5 rounded-full font-medium active:scale-95 transition-transform"
                      >
                        הפעל
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={cantAfford}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium active:scale-95 transition-transform flex items-center gap-1 mx-auto ${
                          cantAfford
                            ? 'bg-surface-container text-outline cursor-not-allowed'
                            : 'bg-amber-500 text-white shadow-sm'
                        }`}
                      >
                        <span>💰</span>
                        <span>{item.price}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {/* How to earn coins */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-2xl bg-surface-container-lowest border border-outline-variant p-4"
        >
          <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
            <span>💰</span>
            איך מרוויחים מטבעות?
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-on-surface-variant">
              <span>הוספת מתכון</span>
              <span className="font-bold text-amber-600">+25</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>שיתוף פעולה במתכון</span>
              <span className="font-bold text-amber-600">+15</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>תגובה</span>
              <span className="font-bold text-amber-600">+5</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>דירוג</span>
              <span className="font-bold text-amber-600">+3</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>מועדף</span>
              <span className="font-bold text-amber-600">+2</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>ריאקציה</span>
              <span className="font-bold text-amber-600">+1</span>
            </div>
          </div>
        </motion.div>

      </main>
      <BottomNav />
    </div>
  )
}
