'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { type Recipe, type Profile, CATEGORIES, DEFAULT_TAGS } from '@/lib/types'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import RecipeCard from '@/components/RecipeCard'
import FilterBar from '@/components/FilterBar'
import { motion, AnimatePresence } from 'framer-motion'

export default function HomePage() {
  const supabase = createClient()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([])
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha'>('newest')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [recipesRes, membersRes, userRes, hiddenRes] = await Promise.all([
        supabase
          .from('recipes')
          .select('*, profiles!created_by(id, display_name, avatar_url)')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, display_name'),
        supabase.auth.getUser(),
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

      if (recipesRes.data) {
        setRecipes(recipesRes.data as Recipe[])

        const recipeTags = new Set<string>([...DEFAULT_TAGS])
        const recipeCategories = new Set<string>([...CATEGORIES])
        for (const recipe of recipesRes.data) {
          if (recipe.tags) {
            for (const tag of recipe.tags) {
              recipeTags.add(tag)
            }
          }
          if (recipe.category) {
            recipeCategories.add(recipe.category)
          }
        }
        setAllTags(Array.from(recipeTags).filter((t) => !hiddenTags.has(t)))
        setAllCategories(Array.from(recipeCategories).filter((c) => !hiddenCats.has(c)))
      }

      if (membersRes.data) {
        setMembers(membersRes.data)
      }

      const user = userRes.data?.user
      if (user) {
        const { data: favData } = await supabase
          .from('favorites')
          .select('recipe_id')
          .eq('user_id', user.id)

        if (favData) {
          setFavoriteIds(favData.map((f) => f.recipe_id))
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const filteredRecipes = useMemo(() => {
    const filtered = recipes.filter((recipe) => {
      if (search && !recipe.title.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (selectedCategory && recipe.category !== selectedCategory) {
        return false
      }
      if (selectedTags.length > 0) {
        if (!recipe.tags || !selectedTags.some((tag) => recipe.tags.includes(tag))) {
          return false
        }
      }
      if (selectedMember && recipe.created_by !== selectedMember) {
        return false
      }
      if (showFavoritesOnly && !favoriteIds.includes(recipe.id)) {
        return false
      }
      return true
    })

    const sorted = [...filtered]
    switch (sortBy) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'alpha':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'he'))
        break
      case 'newest':
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }
    return sorted
  }, [recipes, search, selectedCategory, selectedTags, selectedMember, showFavoritesOnly, favoriteIds, sortBy])

  function handleToggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="min-h-screen bg-surface" dir="rtl">
      <Navbar />

      <main className="pt-20 pb-28 px-4">
        {/* Search bar */}
        <div className="relative mb-6 max-w-2xl mx-auto">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline">search</span>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש מתכון..."
            className="w-full bg-surface-container-lowest border-none py-4 pr-12 pl-4 rounded-full shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-right placeholder:text-outline/60 outline-none"
          />
        </div>

        {/* Filter bar */}
        <div className="max-w-5xl mx-auto mb-8">
          <FilterBar
            categories={allCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            tags={allTags}
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
            members={members}
            selectedMember={selectedMember}
            onSelectMember={setSelectedMember}
            showFavoritesOnly={showFavoritesOnly}
            onToggleFavorites={() => setShowFavoritesOnly((prev) => !prev)}
          />
        </div>

        {/* Sort */}
        <div className="max-w-5xl mx-auto mb-4 flex justify-end">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'alpha')}
            className="rounded-full bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="newest">חדש ← ישן</option>
            <option value="oldest">ישן ← חדש</option>
            <option value="alpha">א-ב</option>
          </select>
        </div>

        {/* Recipe grid */}
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-[3/4] animate-pulse rounded bg-surface-container ${
                    i % 2 === 1 ? 'mt-4' : ''
                  }`}
                />
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <p className="mt-16 text-center text-lg text-on-surface-variant">
              עדיין אין מתכונים — הוסיפו את הראשון! 🍽️
            </p>
          ) : filteredRecipes.length === 0 ? (
            <p className="mt-16 text-center text-lg text-on-surface-variant">
              לא נמצאו מתכונים לפי הסינון הזה 🤷
            </p>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredRecipes.map((recipe, index) => (
                  <motion.div
                    key={recipe.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={index % 2 === 1 ? 'mt-4' : ''}
                  >
                    <RecipeCard recipe={recipe} />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Floating add button */}
      <motion.a
        href="/recipe/new"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 left-1/2 z-[60] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_12px_32px_rgba(180,28,27,0.3)]"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </motion.a>

      <BottomNav />
    </div>
  )
}
