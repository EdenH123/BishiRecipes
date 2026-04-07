'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { type Recipe, parseIngredient, displayIngredient } from '@/lib/types'
import {
  type ShoppingItem,
  loadShoppingList,
  saveShoppingList,
  addIngredientsToList,
  toggleItem,
  removeItem,
  clearCheckedItems,
} from '@/lib/shopping-list'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 25 }

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: springTransition },
  exit: { opacity: 0, x: -20, height: 0, marginBottom: 0, transition: { duration: 0.2 } },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

export default function ShoppingListPage() {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loaded, setLoaded] = useState(false)

  // Recipe search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Recipe[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    setItems(loadShoppingList())
    setLoaded(true)
  }, [])

  // Persist on change
  useEffect(() => {
    if (loaded) saveShoppingList(items)
  }, [items, loaded])

  // --- Recipe search ---
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        setSearchLoading(false)
        return
      }

      setSearchLoading(true)
      setSearchError(false)

      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('id, title, ingredients, image_url, category')
          .ilike('title', `%${query.trim()}%`)
          .limit(10)

        if (error) throw error
        setSearchResults((data as Recipe[]) || [])
      } catch {
        setSearchError(true)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    },
    [supabase],
  )

  function onSearchInput(value: string) {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => handleSearch(value), 300)
  }

  function handleAddRecipe(recipe: Recipe) {
    if (addingRecipeId === recipe.id) return // prevent double-click
    setAddingRecipeId(recipe.id)

    setItems((prev) => {
      const updated = addIngredientsToList(
        prev,
        recipe.ingredients || [],
        recipe.id,
        recipe.title,
      )
      return updated
    })

    toast.success(`המצרכים של "${recipe.title}" נוספו לרשימה`)

    setTimeout(() => setAddingRecipeId(null), 1000)
  }

  function handleToggle(id: string) {
    setItems((prev) => toggleItem(prev, id))
  }

  function handleRemove(id: string) {
    setItems((prev) => removeItem(prev, id))
  }

  function handleClearChecked() {
    const checkedCount = items.filter((i) => i.checked).length
    if (checkedCount === 0) return
    setItems((prev) => clearCheckedItems(prev))
    toast.success(`${checkedCount} פריטים הוסרו`)
  }

  function handleClearAll() {
    if (items.length === 0) return
    if (!confirm('למחוק את כל הרשימה?')) return
    setItems([])
    toast.success('הרשימה נוקתה')
  }

  // Separate checked and unchecked
  const uncheckedItems = items.filter((i) => !i.checked)
  const checkedItems = items.filter((i) => i.checked)

  // Group by recipe for display
  const groupedUnchecked = useMemo(() => {
    const groups = new Map<string, ShoppingItem[]>()
    for (const item of uncheckedItems) {
      const key = item.recipeTitle || 'כללי'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    return groups
  }, [uncheckedItems])

  return (
    <div className="min-h-screen bg-surface pt-20 pb-28">
      <Navbar />

      <div className="mx-auto max-w-2xl px-4 py-6 font-rubik" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-primary">shopping_cart</span>
            <h1 className="text-2xl font-bold">רשימת קניות</h1>
          </div>
          {items.length > 0 && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {uncheckedItems.length} פריטים
            </span>
          )}
        </div>

        {/* Add from recipe - search section */}
        <div className="mb-6">
          <button
            onClick={() => {
              setShowSearch((s) => !s)
              if (!showSearch) {
                setTimeout(() => searchInputRef.current?.focus(), 100)
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg">search</span>
            חיפוש מתכון להוספה
          </button>

          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                      search
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => onSearchInput(e.target.value)}
                      placeholder="חפשו מתכון לפי שם..."
                      className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pr-10 pl-3 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      aria-label="חיפוש מתכון"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          setSearchResults([])
                          searchInputRef.current?.focus()
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                        aria-label="נקה חיפוש"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}
                  </div>

                  {/* Search results */}
                  <div className="mt-2 max-h-64 overflow-y-auto">
                    {searchLoading && (
                      <div className="flex items-center justify-center py-6">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
                      </div>
                    )}

                    {searchError && (
                      <p className="py-4 text-center text-sm text-error">
                        שגיאה בחיפוש, נסו שוב
                      </p>
                    )}

                    {!searchLoading &&
                      !searchError &&
                      searchQuery.trim() &&
                      searchResults.length === 0 && (
                        <p className="py-4 text-center text-sm text-outline">
                          לא נמצאו מתכונים
                        </p>
                      )}

                    {searchResults.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="flex items-center justify-between gap-3 rounded-lg p-2.5 transition-colors hover:bg-surface-container-low"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-on-surface">
                            {recipe.title}
                          </p>
                          <p className="text-xs text-outline">
                            {recipe.ingredients?.length || 0} מצרכים
                            {recipe.category ? ` · ${recipe.category}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddRecipe(recipe)}
                          disabled={addingRecipeId === recipe.id}
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-container active:scale-95 disabled:opacity-50"
                          aria-label={`הוסף מצרכים מ${recipe.title}`}
                        >
                          {addingRecipeId === recipe.id ? (
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                              check
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">add</span>
                          )}
                          הוספה
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {items.length === 0 && loaded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <span className="material-symbols-outlined text-6xl text-outline/30 mb-4">
              shopping_cart
            </span>
            <p className="text-lg font-medium text-on-surface-variant">
              הרשימה ריקה
            </p>
            <p className="mt-1 text-sm text-outline">
              הוסיפו מצרכים מתוך מתכון או חפשו מתכון למעלה
            </p>
          </motion.div>
        )}

        {/* Action buttons */}
        {items.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            {checkedItems.length > 0 && (
              <button
                onClick={handleClearChecked}
                className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                הסר סומנו ({checkedItems.length})
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-lg border border-error/30 px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/5 active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              נקה הכל
            </button>
          </div>
        )}

        {/* Shopping list - grouped by recipe */}
        {uncheckedItems.length > 0 && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {Array.from(groupedUnchecked.entries()).map(([groupName, groupItems]) => (
              <div key={groupName} className="mb-5">
                {groupedUnchecked.size > 1 && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">
                      restaurant_menu
                    </span>
                    <h3 className="text-sm font-bold text-on-surface-variant">
                      {groupName}
                    </h3>
                  </div>
                )}
                <ul className="flex flex-col gap-1">
                  <AnimatePresence mode="popLayout">
                    {groupItems.map((item) => (
                      <motion.li
                        key={item.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="flex items-center gap-3 rounded-xl bg-surface-container-lowest border border-outline-variant/50 px-3 py-2.5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleToggle(item.id)}
                          className="h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 accent-tertiary"
                          aria-label={`סמן ${item.ingredientName}`}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-on-surface">
                            {item.quantity && (
                              <span className="font-bold" dir="ltr">
                                {item.quantity}
                              </span>
                            )}
                            {item.quantity && ' '}
                            {item.unit && (
                              <span className="text-outline">{item.unit} </span>
                            )}
                            {item.ingredientName}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="shrink-0 rounded-lg p-1 text-outline transition-colors hover:bg-error/10 hover:text-error"
                          aria-label={`הסר ${item.ingredientName}`}
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            ))}
          </motion.div>
        )}

        {/* Checked items */}
        {checkedItems.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-outline">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              נרכשו ({checkedItems.length})
            </h3>
            <ul className="flex flex-col gap-1">
              <AnimatePresence mode="popLayout">
                {checkedItems.map((item) => (
                  <motion.li
                    key={item.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="flex items-center gap-3 rounded-xl bg-surface-container-low/50 px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleToggle(item.id)}
                      className="h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 accent-tertiary"
                      aria-label={`בטל סימון ${item.ingredientName}`}
                    />
                    <span className="min-w-0 flex-1 text-sm text-outline line-through">
                      {item.quantity && (
                        <span dir="ltr">{item.quantity}</span>
                      )}
                      {item.quantity && ' '}
                      {item.unit && <span>{item.unit} </span>}
                      {item.ingredientName}
                    </span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="shrink-0 rounded-lg p-1 text-outline transition-colors hover:bg-error/10 hover:text-error"
                      aria-label={`הסר ${item.ingredientName}`}
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
