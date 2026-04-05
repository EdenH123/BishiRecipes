'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { type Recipe, type Profile, CATEGORIES, DEFAULT_TAGS } from '@/lib/types'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import Fab from '@/components/Fab'
import RecipeCard from '@/components/RecipeCard'
import FilterBar from '@/components/FilterBar'
import SkeletonCard from '@/components/SkeletonCard'
import Onboarding from '@/components/Onboarding'
import BackToTop from '@/components/BackToTop'
import { motion, AnimatePresence } from 'framer-motion'

const PAGE_SIZE = 12

const gridContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
}

const gridItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

const listItemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

const filterFadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), [])

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const favoriteIdsRef = useRef<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([])
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha' | 'rating' | 'favorites' | 'comments'>('newest')
  const [loading, setLoading] = useState(true)
  const [filterChanging, setFilterChanging] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [animatedCount, setAnimatedCount] = useState(0)
  const [countPulse, setCountPulse] = useState(false)
  const [recentActivity, setRecentActivity] = useState<{ type: string; title: string; user: string; time: string }[]>([])

  // Track hidden filters
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set())
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(new Set())

  // Fetch metadata (members, tags, categories, favorites, hidden filters) once on mount
  useEffect(() => {
    async function fetchMetadata() {
      const [membersRes, userRes, hiddenRes, allRecipesMetaRes] = await Promise.all([
        supabase.from('profiles').select('id, display_name'),
        supabase.auth.getUser(),
        supabase.from('hidden_filters').select('type, value'),
        // Fetch all recipes but only tags + category for building filter options
        supabase.from('recipes').select('tags, category'),
      ])

      const hCats = new Set<string>()
      const hTags = new Set<string>()
      if (hiddenRes.data) {
        for (const h of hiddenRes.data) {
          if (h.type === 'category') hCats.add(h.value)
          else hTags.add(h.value)
        }
      }
      setHiddenCats(hCats)
      setHiddenTags(hTags)

      if (allRecipesMetaRes.data) {
        const recipeTags = new Set<string>([...DEFAULT_TAGS])
        const recipeCategories = new Set<string>([...CATEGORIES])
        for (const recipe of allRecipesMetaRes.data) {
          if (recipe.tags) {
            for (const tag of recipe.tags) {
              recipeTags.add(tag)
            }
          }
          if (recipe.category) {
            recipeCategories.add(recipe.category)
          }
        }
        setAllTags(Array.from(recipeTags).filter((t) => !hTags.has(t)))
        setAllCategories(Array.from(recipeCategories).filter((c) => !hCats.has(c)))
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
          const ids = favData.map((f) => f.recipe_id)
          favoriteIdsRef.current = ids
          setFavoriteIds(ids)
        }
      }

      // Fetch recent activity
      const [{ data: recentComments }, { data: recentRecipes }] = await Promise.all([
        supabase
          .from('comments')
          .select('content, created_at, profiles!user_id(display_name), recipes!recipe_id(title)')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('recipes')
          .select('title, created_at, profiles!created_by(display_name)')
          .order('created_at', { ascending: false })
          .limit(3),
      ])

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

    fetchMetadata()
  }, [])

  // Build a Supabase query with current filters applied
  const buildFilteredQuery = useCallback(
    (forCount = false) => {
      let query = forCount
        ? supabase.from('recipes').select('*', { count: 'exact', head: true })
        : supabase.from('recipes').select('*, profiles!created_by(id, display_name, avatar_url)')

      if (selectedCategory) {
        query = query.eq('category', selectedCategory)
      }
      if (selectedMember) {
        query = query.eq('created_by', selectedMember)
      }
      if (search) {
        query = query.ilike('title', `%${search}%`)
      }
      if (selectedTags.length > 0) {
        query = query.contains('tags', selectedTags)
      }
      if (showFavoritesOnly && favoriteIdsRef.current.length > 0) {
        query = query.in('id', favoriteIdsRef.current)
      } else if (showFavoritesOnly && favoriteIdsRef.current.length === 0) {
        // No favorites — return impossible filter to get 0 results
        query = query.in('id', ['__none__'])
      }

      // Apply sort (only DB-sortable fields; rating/favorites/comments handled post-fetch)
      if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true })
      } else if (sortBy === 'alpha') {
        query = query.order('title', { ascending: true })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      return query
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCategory, selectedMember, search, selectedTags, showFavoritesOnly, sortBy]
  )

  const isFirstLoad = useRef(true)

  // For special sorts, we cache the full sorted list and paginate client-side
  const specialSortCache = useRef<Recipe[]>([])

  // Fetch a page of recipes
  const fetchRecipesPage = useCallback(
    async (pageNum: number, isInitial: boolean) => {
      if (isInitial && isFirstLoad.current) {
        setLoading(true)
      } else if (isInitial) {
        setFilterChanging(true)
      } else {
        setLoadingMore(true)
      }

      const isSpecialSort = sortBy === 'rating' || sortBy === 'favorites' || sortBy === 'comments'

      if (isSpecialSort && isInitial) {
        // Fetch ALL filtered recipes + counts for sorting
        const [dataRes, countRes, ratingsRes, favoritesRes, commentsRes] = await Promise.all([
          buildFilteredQuery(false),
          buildFilteredQuery(true),
          supabase.from('ratings').select('recipe_id, rating'),
          supabase.from('favorites').select('recipe_id'),
          supabase.from('comments').select('recipe_id'),
        ])

        if (countRes.count !== null && countRes.count !== undefined) {
          setTotalCount(countRes.count)
        }

        const allRecipes = (dataRes.data as Recipe[]) || []

        // Build count maps
        const ratingMap = new Map<string, { total: number; count: number }>()
        if (ratingsRes.data) {
          for (const r of ratingsRes.data) {
            const existing = ratingMap.get(r.recipe_id)
            if (existing) { existing.total += r.rating; existing.count++ }
            else ratingMap.set(r.recipe_id, { total: r.rating, count: 1 })
          }
        }
        const favCountMap = new Map<string, number>()
        if (favoritesRes.data) {
          for (const f of favoritesRes.data) {
            favCountMap.set(f.recipe_id, (favCountMap.get(f.recipe_id) || 0) + 1)
          }
        }
        const commentCountMap = new Map<string, number>()
        if (commentsRes.data) {
          for (const c of commentsRes.data) {
            commentCountMap.set(c.recipe_id, (commentCountMap.get(c.recipe_id) || 0) + 1)
          }
        }

        // Sort
        allRecipes.sort((a, b) => {
          if (sortBy === 'rating') {
            const avgA = ratingMap.has(a.id) ? ratingMap.get(a.id)!.total / ratingMap.get(a.id)!.count : 0
            const avgB = ratingMap.has(b.id) ? ratingMap.get(b.id)!.total / ratingMap.get(b.id)!.count : 0
            return avgB - avgA
          } else if (sortBy === 'favorites') {
            return (favCountMap.get(b.id) || 0) - (favCountMap.get(a.id) || 0)
          } else {
            return (commentCountMap.get(b.id) || 0) - (commentCountMap.get(a.id) || 0)
          }
        })

        specialSortCache.current = allRecipes
        const pageSlice = allRecipes.slice(0, PAGE_SIZE)
        setRecipes(pageSlice)
        setHasMore(allRecipes.length > PAGE_SIZE)
        setPage(0)
      } else if (isSpecialSort && !isInitial) {
        // Paginate from cache
        const from = pageNum * PAGE_SIZE
        const pageSlice = specialSortCache.current.slice(from, from + PAGE_SIZE)
        setRecipes((prev) => [...prev, ...pageSlice])
        setHasMore(from + PAGE_SIZE < specialSortCache.current.length)
        setPage(pageNum)
      } else {
        // Normal DB-sorted pagination
        const from = pageNum * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const [dataRes, countRes] = await Promise.all([
          buildFilteredQuery(false).range(from, to),
          pageNum === 0
            ? buildFilteredQuery(true)
            : Promise.resolve({ count: null }),
        ])

        if (countRes.count !== null && countRes.count !== undefined) {
          setTotalCount(countRes.count)
        }

        const newRecipes = (dataRes.data as Recipe[]) || []
        const fetchedCount = newRecipes.length

        if (isInitial) {
          setRecipes(newRecipes)
        } else {
          setRecipes((prev) => [...prev, ...newRecipes])
        }

        setHasMore(fetchedCount === PAGE_SIZE)
        setPage(pageNum)
      }

      if (isInitial && isFirstLoad.current) {
        setLoading(false)
        isFirstLoad.current = false
      } else if (isInitial) {
        setFilterChanging(false)
      } else {
        setLoadingMore(false)
      }
    },
    [buildFilteredQuery, sortBy, supabase]
  )

  // Initial fetch + refetch when filters/sort change
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    fetchRecipesPage(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedMember, search, selectedTags, showFavoritesOnly, sortBy])

  // Animated counter — animate towards totalCount
  useEffect(() => {
    if (totalCount === 0) return
    const target = totalCount
    const duration = 800
    const step = Math.max(1, Math.floor(target / (duration / 16)))
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) {
        current = target
        clearInterval(timer)
        setCountPulse(true)
        setTimeout(() => setCountPulse(false), 400)
      }
      setAnimatedCount(current)
    }, 16)
    return () => clearInterval(timer)
  }, [totalCount])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchRecipesPage(page + 1, false)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, page, fetchRecipesPage])

  function handleToggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const router = useRouter()
  const [surpriseLoading, setSurpriseLoading] = useState(false)

  async function handleSurprise() {
    setSurpriseLoading(true)
    const { data } = await supabase.from('recipes').select('id')
    if (data && data.length > 0) {
      const random = data[Math.floor(Math.random() * data.length)]
      router.push(`/recipe/${random.id}`)
    }
    setSurpriseLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface" dir="rtl">
      <Navbar />

      <main className="pt-20 pb-28 px-4">
        {/* Search bar + Surprise button */}
        <div className="flex gap-2 items-center mb-6 max-w-2xl mx-auto">
          <div className="relative flex-1">
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
          <motion.button
            onClick={handleSurprise}
            disabled={surpriseLoading}
            whileTap={{ scale: 0.9 }}
            whileHover={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.4 }}
            className="shrink-0 flex items-center justify-center h-[52px] w-[52px] rounded-full bg-tertiary-container text-on-tertiary-container shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
            title="הפתע אותי!"
          >
            <span className="material-symbols-outlined text-2xl">
              {surpriseLoading ? 'hourglass_empty' : 'casino'}
            </span>
          </motion.button>
        </div>

        {/* Filter bar */}
        <motion.div
          className="max-w-5xl mx-auto mb-8"
          variants={filterFadeIn}
          initial="hidden"
          animate="visible"
        >
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
        </motion.div>

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
            {!loading && totalCount > 0 && (
              <motion.span
                className="text-sm text-on-surface-variant"
                animate={countPulse ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.35 }}
              >
                <span className="font-bold text-primary text-lg">{animatedCount}</span> מתכונים
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-surface-container-low overflow-hidden">
              <motion.button
                onClick={() => setViewMode('grid')}
                whileTap={{ scale: 0.95 }}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-lg">grid_view</span>
              </motion.button>
              <motion.button
                onClick={() => setViewMode('list')}
                whileTap={{ scale: 0.95 }}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-lg">view_list</span>
              </motion.button>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-full bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="newest">חדש ← ישן</option>
              <option value="oldest">ישן ← חדש</option>
              <option value="alpha">א-ב</option>
              <option value="rating">הכי מדורגים</option>
              <option value="favorites">הכי פופולריים</option>
              <option value="comments">הכי מגיבים</option>
            </select>
          </div>
        </div>

        {/* Recipe grid */}
        <div className="max-w-5xl mx-auto relative">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : recipes.length === 0 && !hasMore && !filterChanging ? (
            totalCount === 0 && !selectedCategory && !selectedMember && !search && selectedTags.length === 0 && !showFavoritesOnly ? (
              <p className="mt-16 text-center text-lg text-on-surface-variant">
                עדיין אין מתכונים — הוסיפו את הראשון! 🍽️
              </p>
            ) : (
              <p className="mt-16 text-center text-lg text-on-surface-variant">
                לא נמצאו מתכונים לפי הסינון הזה 🤷
              </p>
            )
          ) : (
            <>
              <motion.div
                animate={{ opacity: filterChanging ? 0.4 : 1 }}
                transition={{ duration: 0.2 }}
              >
              <AnimatePresence mode="popLayout">
                {viewMode === 'grid' ? (
                  <motion.div
                    key="grid-view"
                    className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
                    variants={gridContainerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {recipes.map((recipe, index) => (
                      <motion.div
                        key={recipe.id}
                        layout
                        variants={gridItemVariants}
                        className={index % 2 === 1 ? 'mt-4' : ''}
                      >
                        <RecipeCard recipe={recipe} />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="list-view"
                    className="flex flex-col gap-3"
                    variants={gridContainerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {recipes.map((recipe) => (
                      <motion.div
                        key={recipe.id}
                        layout
                        variants={listItemVariants}
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
                  </motion.div>
                )}
              </AnimatePresence>
              </motion.div>
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {loadingMore && (
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-container border-t-primary" />
                )}
                {!hasMore && recipes.length > 0 && (
                  <p className="text-sm text-on-surface-variant">הגעת לסוף! 🎉</p>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <BackToTop />
      <Fab />
      <BottomNav />
      <Onboarding />
    </div>
  )
}
