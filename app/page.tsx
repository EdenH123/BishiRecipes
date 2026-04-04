'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { type Recipe, type Profile, CATEGORIES, DEFAULT_TAGS } from '@/lib/types'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import RecipeCard from '@/components/RecipeCard'
import FilterBar from '@/components/FilterBar'
import Onboarding from '@/components/Onboarding'
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
  const [visibleCount, setVisibleCount] = useState(12)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [animatedCount, setAnimatedCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState<{ type: string; title: string; user: string; time: string }[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [recipesRes, membersRes, userRes] = await Promise.all([
        supabase
          .from('recipes')
          .select('*, profiles!created_by(id, display_name, avatar_url)')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, display_name'),
        supabase.auth.getUser(),
      ])
      // hidden_filters table may not exist yet — query separately
      const hiddenRes = await supabase.from('hidden_filters').select('type, value')

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

      // Fetch recent activity (latest comments + recipes)
      const { data: recentComments } = await supabase
        .from('comments')
        .select('content, created_at, profiles!user_id(display_name), recipes!recipe_id(title)')
        .order('created_at', { ascending: false })
        .limit(3)
      const { data: recentRecipes } = await supabase
        .from('recipes')
        .select('title, created_at, profiles!created_by(display_name)')
        .order('created_at', { ascending: false })
        .limit(3)

      const activity: typeof recentActivity = []
      if (recentRecipes) {
        for (const r of recentRecipes) {
          activity.push({
            type: 'recipe',
            title: (r as Record<string, unknown>).title as string,
            user: ((r as Record<string, unknown>).profiles as Record<string, string>)?.display_name || '?',
            time: (r as Record<string, unknown>).created_at as string,
          })
        }
      }
      if (recentComments) {
        for (const c of recentComments) {
          activity.push({
            type: 'comment',
            title: ((c as Record<string, unknown>).recipes as Record<string, string>)?.title || '?',
            user: ((c as Record<string, unknown>).profiles as Record<string, string>)?.display_name || '?',
            time: (c as Record<string, unknown>).created_at as string,
          })
        }
      }
      activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setRecentActivity(activity.slice(0, 5))
    }

    fetchData()
  }, [])

  // Animated counter
  useEffect(() => {
    if (recipes.length === 0) return
    const target = recipes.length
    const duration = 800
    const step = Math.max(1, Math.floor(target / (duration / 16)))
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) {
        current = target
        clearInterval(timer)
      }
      setAnimatedCount(current)
    }, 16)
    return () => clearInterval(timer)
  }, [recipes.length])

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

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(12)
  }, [search, selectedCategory, selectedTags, selectedMember, showFavoritesOnly, sortBy])

  // Infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 12)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading])

  const visibleRecipes = filteredRecipes.slice(0, visibleCount)
  const hasMore = visibleCount < filteredRecipes.length

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

        {/* Activity feed */}
        {recentActivity.length > 0 && !loading && (
          <div className="max-w-5xl mx-auto mb-6">
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-2 shrink-0 rounded-full bg-surface-container-lowest px-4 py-2 text-xs shadow-sm">
                  <span className="material-symbols-outlined text-sm text-primary">
                    {a.type === 'recipe' ? 'restaurant_menu' : 'chat_bubble'}
                  </span>
                  <span className="font-medium">{a.user}</span>
                  <span className="text-outline">
                    {a.type === 'recipe' ? 'הוסיף/ה' : 'הגיב/ה על'}
                  </span>
                  <span className="font-medium truncate max-w-[120px]">{a.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sort + counter + view toggle */}
        <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!loading && recipes.length > 0 && (
              <span className="text-sm text-on-surface-variant">
                <span className="font-bold text-primary text-lg">{animatedCount}</span> מתכונים
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-surface-container-low overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-lg">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-lg">view_list</span>
              </button>
            </div>
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
        </div>

        {/* Recipe grid */}
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded overflow-hidden bg-surface-container-lowest shadow-sm ${
                    i % 2 === 1 ? 'mt-4' : ''
                  }`}
                >
                  <div className="aspect-[4/3] bg-surface-container animate-shimmer" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-surface-container animate-shimmer" />
                    <div className="h-3 w-full rounded bg-surface-container animate-shimmer" />
                    <div className="h-3 w-1/2 rounded bg-surface-container animate-shimmer" />
                  </div>
                </div>
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
            <>
              <AnimatePresence mode="popLayout">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {visibleRecipes.map((recipe, index) => (
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
                ) : (
                  <div className="flex flex-col gap-3">
                    {visibleRecipes.map((recipe) => (
                      <motion.div
                        key={recipe.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Link href={`/recipe/${recipe.id}`} className="flex gap-4 rounded-xl bg-surface-container-lowest p-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-secondary-container/30">
                            {recipe.image_url ? (
                              <img src={recipe.image_url} alt={recipe.title} loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <h3 className="font-bold text-sm text-on-surface line-clamp-1">{recipe.title}</h3>
                            {recipe.description && (
                              <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{recipe.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-end">
                              {recipe.category && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{recipe.category}</span>
                              )}
                              {recipe.profiles?.display_name && (
                                <span className="text-[10px] text-outline">{recipe.profiles.display_name}</span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-container border-t-primary" />
                </div>
              )}
            </>
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
      <Onboarding />
    </div>
  )
}
