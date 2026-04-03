'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { type Recipe, type Profile, CATEGORIES, DEFAULT_TAGS } from '@/lib/types'
import Navbar from '@/components/Navbar'
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
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [recipesRes, membersRes, userRes] = await Promise.all([
        supabase
          .from('recipes')
          .select('*, profiles(id, display_name, avatar_url)')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, display_name'),
        supabase.auth.getUser(),
      ])

      if (recipesRes.data) {
        setRecipes(recipesRes.data as Recipe[])

        // Collect all unique tags from recipes and merge with defaults
        const recipeTags = new Set<string>([...DEFAULT_TAGS])
        for (const recipe of recipesRes.data) {
          if (recipe.tags) {
            for (const tag of recipe.tags) {
              recipeTags.add(tag)
            }
          }
        }
        setAllTags(Array.from(recipeTags))
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
    return recipes.filter((recipe) => {
      // Search filter
      if (search && !recipe.title.toLowerCase().includes(search.toLowerCase())) {
        return false
      }

      // Category filter
      if (selectedCategory && recipe.category !== selectedCategory) {
        return false
      }

      // Tags filter (OR logic — recipe must have at least one of the selected tags)
      if (selectedTags.length > 0) {
        if (!recipe.tags || !selectedTags.some((tag) => recipe.tags.includes(tag))) {
          return false
        }
      }

      // Member filter
      if (selectedMember && recipe.created_by !== selectedMember) {
        return false
      }

      // Favorites filter
      if (showFavoritesOnly && !favoriteIds.includes(recipe.id)) {
        return false
      }

      return true
    })
  }, [recipes, search, selectedCategory, selectedTags, selectedMember, showFavoritesOnly, favoriteIds])

  function handleToggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="min-h-screen bg-warm font-rubik" dir="rtl">
      <Navbar />

      {/* Search bar */}
      <div className="mx-auto mt-4 max-w-2xl px-4">
        <div className="relative">
          <svg
            className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש מתכונים..."
            className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 pr-10 text-sm focus:border-saffron focus:outline-none focus:ring-1 focus:ring-saffron"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="mx-auto mt-4 max-w-5xl px-4">
        <FilterBar
          categories={[...CATEGORIES]}
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

      {/* Recipe grid */}
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-200"
              />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <p className="mt-16 text-center text-lg text-gray-400">
            עדיין אין מתכונים — הוסיפו את הראשון! 🍽️
          </p>
        ) : filteredRecipes.length === 0 ? (
          <p className="mt-16 text-center text-lg text-gray-400">
            לא נמצאו מתכונים לפי הסינון הזה 🤷
          </p>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredRecipes.map((recipe) => (
                <motion.div
                  key={recipe.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <RecipeCard recipe={recipe} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>

      {/* Floating add button */}
      <motion.a
        href="/recipe/new"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-tomato text-3xl text-white shadow-lg"
      >
        +
      </motion.a>
    </div>
  )
}
