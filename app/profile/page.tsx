'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Recipe, Profile } from '@/lib/types'
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
  const [activeTab, setActiveTab] = useState<'recipes' | 'favorites'>('recipes')
  const avatarInputRef = useRef<HTMLInputElement>(null)

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
      const fileName = `avatars/${profile.id}-${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, file)

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
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-container text-3xl font-bold text-on-secondary-container">
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

        {/* Tab switcher */}
        <div className="mt-8 flex justify-center gap-8 border-b border-gray-200">
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
              {activeRecipes.length === 0 ? (
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
