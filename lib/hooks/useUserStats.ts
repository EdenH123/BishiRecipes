'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { UserStats } from '@/lib/achievements'

// Simple in-memory cache keyed by userId
const cache = new Map<string, { stats: UserStats; timestamp: number }>()
const CACHE_TTL = 60_000 // 1 minute

// Track in-flight fetches so concurrent callers share the same promise
const inflight = new Map<string, Promise<UserStats>>()

export function useUserStats(userId: string) {
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<UserStats | null>(() => {
    const cached = cache.get(userId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.stats
    }
    return null
  })
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = cache.get(userId)
    return !(cached && Date.now() - cached.timestamp < CACHE_TTL)
  })

  // Use a ref to avoid stale closure issues with userId
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  useEffect(() => {
    const cached = cache.get(userId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setStats(cached.stats)
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchStats() {
      setLoading(true)

      try {
        // Reuse an in-flight request for the same userId
        let promise = inflight.get(userId)

        if (!promise) {
          promise = (async () => {
            const [
              recipesRes,
              commentsRes,
              ratingsRes,
              favoritesRes,
              reactionsRes,
              categoriesRes,
              collaborationsRes,
            ] = await Promise.all([
              supabase
                .from('recipes')
                .select('id', { count: 'exact', head: true })
                .eq('created_by', userId),
              supabase
                .from('comments')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId),
              supabase
                .from('ratings')
                .select('recipe_id', { count: 'exact', head: true })
                .eq('user_id', userId),
              supabase
                .from('favorites')
                .select('recipe_id', { count: 'exact', head: true })
                .eq('user_id', userId),
              supabase
                .from('reactions')
                .select('recipe_id', { count: 'exact', head: true })
                .eq('user_id', userId),
              supabase
                .from('recipes')
                .select('category')
                .eq('created_by', userId)
                .not('category', 'is', null),
              supabase
                .from('recipe_collaborators')
                .select('recipe_id', { count: 'exact', head: true })
                .eq('user_id', userId),
            ])

            const distinctCategories = new Set(
              (categoriesRes.data ?? []).map((r) => r.category).filter(Boolean)
            )

            return {
              recipeCount: recipesRes.count ?? 0,
              commentCount: commentsRes.count ?? 0,
              ratingCount: ratingsRes.count ?? 0,
              favoriteCount: favoritesRes.count ?? 0,
              reactionCount: reactionsRes.count ?? 0,
              categoriesUsed: distinctCategories.size,
              collaborationCount: collaborationsRes.count ?? 0,
            }
          })()

          inflight.set(userId, promise)
        }

        const result = await promise
        inflight.delete(userId)
        cache.set(userId, { stats: result, timestamp: Date.now() })

        if (!cancelled) {
          setStats(result)
        }
      } catch (error) {
        console.error('Error fetching user stats:', error)
        inflight.delete(userId)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchStats()

    return () => {
      cancelled = true
    }
  }, [userId, supabase])

  return { stats, loading }
}
