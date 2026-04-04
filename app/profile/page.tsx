'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Recipe, Profile } from '@/lib/types'
import { CATEGORIES, DEFAULT_TAGS, getUserBadge } from '@/lib/types'
import { compressImage } from '@/lib/compress-image'
import { getAvatarGradient } from '@/lib/avatar-gradient'
import Achievements from '@/components/Achievements'
import XPProgress from '@/components/XPProgress'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import RecipeCard from '@/components/RecipeCard'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([])
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [activeTab, setActiveTab] = useState<'recipes' | 'favorites' | 'achievements' | 'admin'>('recipes')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select()
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          setDisplayName(profileData.display_name)
        }

        // Fetch user's recipes
        const { data: recipesData } = await supabase
          .from('recipes')
          .select('*, profiles!created_by(id, display_name, avatar_url)')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })

        if (recipesData) {
          setMyRecipes(recipesData as Recipe[])
        }

        // Fetch user's favorites
        const { data: favoritesData } = await supabase
          .from('favorites')
          .select('recipe_id')
          .eq('user_id', user.id)

        if (favoritesData && favoritesData.length > 0) {
          const recipeIds = favoritesData.map((f) => f.recipe_id)
          const { data: favRecipes } = await supabase
            .from('recipes')
            .select('*, profiles!created_by(id, display_name, avatar_url)')
            .in('id', recipeIds)

          if (favRecipes) {
            setFavoriteRecipes(favRecipes as Recipe[])
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  async function handleSaveName() {
    if (!profile || !displayName.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, display_name: displayName.trim() })
      toast('השם עודכן בהצלחה!')
    } catch (error) {
      console.error('Error updating name:', error)
      toast.error('שגיאה בעדכון השם')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingAvatar(true)
    try {
      const compressed = await compressImage(file)
      const fileName = `avatars/${profile.id}-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, compressed)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      toast.success('התמונה עודכנה בהצלחה!')
    } catch (err) {
      console.error('Avatar upload error:', err)
      toast.error('שגיאה בהעלאת התמונה')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Load categories & tags for admin panel
  useEffect(() => {
    if (!profile?.is_admin) return
    async function loadFilters() {
      const [recipesRes, hiddenRes] = await Promise.all([
        supabase.from('recipes').select('category, tags'),
        supabase.from('hidden_filters').select('type, value'),
      ])
      const hiddenCats = new Set<string>()
      const hiddenTags = new Set<string>()
      if (hiddenRes.data) {
        for (const h of hiddenRes.data) {
          if (h.type === 'category') hiddenCats.add(h.value)
          else hiddenTags.add(h.value)
        }
      }
      const cats = new Set<string>([...CATEGORIES])
      const tagSet = new Set<string>([...DEFAULT_TAGS])
      if (recipesRes.data) {
        for (const r of recipesRes.data) {
          if (r.category) cats.add(r.category)
          if (r.tags) for (const t of r.tags) tagSet.add(t)
        }
      }
      setAllCategories(Array.from(cats).filter((c) => !hiddenCats.has(c)))
      setAllTags(Array.from(tagSet).filter((t) => !hiddenTags.has(t)))
    }
    loadFilters()
  }, [profile?.is_admin])

  async function handleRemoveCategory(cat: string) {
    if (!confirm(`להסיר את הקטגוריה "${cat}"?`)) return
    try {
      // Add to hidden list
      await supabase.from('hidden_filters').upsert({ type: 'category', value: cat }, { onConflict: 'type,value' })
      // Remove from all recipes that have it
      await supabase.from('recipes').update({ category: null }).eq('category', cat)
      setAllCategories((prev) => prev.filter((c) => c !== cat))
      toast.success(`הקטגוריה "${cat}" הוסרה`)
    } catch {
      toast.error('שגיאה בהסרת הקטגוריה')
    }
  }

  async function handleRemoveTag(tag: string) {
    if (!confirm(`להסיר את התווית "${tag}"?`)) return
    try {
      // Add to hidden list
      await supabase.from('hidden_filters').upsert({ type: 'tag', value: tag }, { onConflict: 'type,value' })
      // Remove from all recipes - fetch recipes with this tag, then update each
      const { data: recipes } = await supabase.from('recipes').select('id, tags').contains('tags', [tag])
      if (recipes) {
        for (const r of recipes) {
          const newTags = (r.tags || []).filter((t: string) => t !== tag)
          await supabase.from('recipes').update({ tags: newTags }).eq('id', r.id)
        }
      }
      setAllTags((prev) => prev.filter((t) => t !== tag))
      toast.success(`התווית "${tag}" הוסרה`)
    } catch {
      toast.error('שגיאה בהסרת התווית')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
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

  const activeRecipes = activeTab === 'recipes' ? myRecipes : favoriteRecipes

  return (
    <div dir="rtl" className="min-h-screen bg-surface pt-20 pb-28">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Avatar */}
        <div className="flex justify-center">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative group"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white"
                style={{ background: getAvatarGradient(profile?.id || '') }}
              >
                {profile?.display_name?.charAt(0) || '?'}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
              )}
            </div>
          </button>
        </div>

        {/* User badge */}
        {(() => {
          const badge = getUserBadge(myRecipes.length)
          return badge ? (
            <div className="mt-3 flex justify-center">
              <span className={`rounded-full px-4 py-1.5 text-sm font-medium ${badge.color}`}>
                {badge.icon} {badge.label}
              </span>
            </div>
          ) : null
        })()}

        {/* Edit display name */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-center font-rubik text-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSaveName}
            disabled={saving || displayName.trim() === profile?.display_name}
            className="rounded-lg bg-tertiary px-5 py-2 font-bold text-on-tertiary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? '...' : 'שמירה'}
          </button>
        </div>

        {/* XP Progress */}
        {profile && (
          <div className="mt-6">
            <XPProgress userId={profile.id} />
          </div>
        )}

        {/* Tab switcher */}
        <div className="mt-6 flex justify-center gap-4 sm:gap-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`pb-3 text-base font-rubik transition-colors ${
              activeTab === 'recipes'
                ? 'border-b-2 border-primary font-bold text-primary'
                : 'text-gray-500'
            }`}
          >
            המתכונים שלי
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 text-base font-rubik transition-colors ${
              activeTab === 'favorites'
                ? 'border-b-2 border-primary font-bold text-primary'
                : 'text-gray-500'
            }`}
          >
            מועדפים ⭐
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`pb-3 text-base font-rubik transition-colors ${
              activeTab === 'achievements'
                ? 'border-b-2 border-primary font-bold text-primary'
                : 'text-gray-500'
            }`}
          >
            הישגים 🏅
          </button>
          {profile?.is_admin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`pb-3 text-base font-rubik transition-colors ${
                activeTab === 'admin'
                  ? 'border-b-2 border-primary font-bold text-primary'
                  : 'text-gray-500'
              }`}
            >
              ניהול
            </button>
          )}
        </div>

        {/* Tab content with animation */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'achievements' ? (
                <Achievements userId={profile!.id} />
              ) : activeTab === 'admin' ? (
                <div className="space-y-8">
                  {/* Categories management */}
                  <div>
                    <h3 className="text-lg font-bold mb-3">קטגוריות</h3>
                    {allCategories.length === 0 ? (
                      <p className="text-gray-400 text-sm">אין קטגוריות</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {allCategories.map((cat) => (
                          <div
                            key={cat}
                            className="flex items-center gap-1.5 rounded-full bg-surface-container-low px-4 py-2 text-sm"
                          >
                            <span>{cat}</span>
                            <button
                              onClick={() => handleRemoveCategory(cat)}
                              className="flex h-5 w-5 items-center justify-center rounded-full text-red-500 hover:bg-red-100 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tags management */}
                  <div>
                    <h3 className="text-lg font-bold mb-3">תוויות</h3>
                    {allTags.length === 0 ? (
                      <p className="text-gray-400 text-sm">אין תוויות</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {allTags.map((tag) => (
                          <div
                            key={tag}
                            className="flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary"
                          >
                            <span>{tag}</span>
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="flex h-5 w-5 items-center justify-center rounded-full text-red-500 hover:bg-red-100 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Admin tools */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-bold mb-3">כלי ניהול</h3>
                    <Link
                      href="/test"
                      className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
                    >
                      <span className="material-symbols-outlined text-base">science</span>
                      דף בדיקות מערכת
                    </Link>
                  </div>
                </div>
              ) : activeRecipes.length === 0 ? (
                <p className="py-12 text-center text-gray-400 font-rubik">
                  {activeTab === 'recipes'
                    ? 'עדיין לא הוספת מתכונים'
                    : 'עדיין לא סימנת מועדפים ⭐'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {activeRecipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sign out */}
        <div className="mt-12 flex justify-center pb-8">
          <button
            onClick={handleSignOut}
            className="rounded-lg border-2 border-primary px-6 py-2 font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary"
          >
            התנתקות
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
