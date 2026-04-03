'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Recipe, Profile } from '@/lib/types'
import Navbar from '@/components/Navbar'
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
  const [activeTab, setActiveTab] = useState<'recipes' | 'favorites'>('recipes')

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
          .select('*, profiles(id, display_name, avatar_url)')
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
            .select('*, profiles(id, display_name, avatar_url)')
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

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#FFFBF5]">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#F5A623] border-t-transparent" />
        </div>
      </div>
    )
  }

  const activeRecipes = activeTab === 'recipes' ? myRecipes : favoriteRecipes

  return (
    <div dir="rtl" className="min-h-screen bg-[#FFFBF5]">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F5A623] text-3xl font-bold text-white">
            {profile?.display_name?.charAt(0) || '?'}
          </div>
        </div>

        {/* Edit display name */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-center font-rubik text-lg focus:border-[#F5A623] focus:outline-none focus:ring-1 focus:ring-[#F5A623]"
          />
          <button
            onClick={handleSaveName}
            disabled={saving || displayName.trim() === profile?.display_name}
            className="rounded-lg bg-[#4CAF7D] px-5 py-2 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
                ? 'border-b-2 border-[#E8433A] font-bold text-[#E8433A]'
                : 'text-gray-500'
            }`}
          >
            המתכונים שלי
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 text-base font-rubik transition-colors ${
              activeTab === 'favorites'
                ? 'border-b-2 border-[#E8433A] font-bold text-[#E8433A]'
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
            className="rounded-lg border-2 border-[#E8433A] px-6 py-2 font-bold text-[#E8433A] transition-colors hover:bg-[#E8433A] hover:text-white"
          >
            התנתקות
          </button>
        </div>
      </div>
    </div>
  )
}
