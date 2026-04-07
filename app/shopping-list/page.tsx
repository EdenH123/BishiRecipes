'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { type Recipe, parseIngredient, displayIngredient } from '@/lib/types'
import {
  type ShoppingItem,
  type RecipeEntry,
  loadShoppingList,
  saveShoppingList,
  addIngredientsToList,
  toggleItem,
  removeItem,
  clearCheckedItems,
  loadRecipeEntries,
  saveRecipeEntries,
  addRecipeEntry,
  removeRecipeEntry,
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
  const [recipeEntries, setRecipeEntries] = useState<RecipeEntry[]>([])
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
  const [updatingRecipeId, setUpdatingRecipeId] = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    setItems(loadShoppingList())
    setRecipeEntries(loadRecipeEntries())
    setLoaded(true)
  }, [])

  // Persist on change
  useEffect(() => {
    if (loaded) {
      saveShoppingList(items)
      saveRecipeEntries(recipeEntries)
    }
  }, [items, recipeEntries, loaded])

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
        // Search by title, category, and tags using OR filter
        const term = query.trim()
        const { data, error } = await supabase
          .from('recipes')
          .select('id, title, ingredients, image_url, category, tags')
          .or(`title.ilike.%${term}%,category.ilike.%${term}%,tags.cs.{"${term}"}`)
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

  function handleAddRecipe(recipe: Recipe, multiplier: number = 1) {
    if (addingRecipeId === recipe.id) return // prevent double-click
    setAddingRecipeId(recipe.id)

    setItems((prev) =>
      addIngredientsToList(prev, recipe.ingredients || [], recipe.id, recipe.title, multiplier),
    )
    setRecipeEntries((prev) =>
      addRecipeEntry(prev, recipe.id, recipe.title, multiplier),
    )

    toast.success(
      multiplier !== 1
        ? `המצרכים של "${recipe.title}" נוספו (x${multiplier}) לרשימה`
        : `המצרכים של "${recipe.title}" נוספו לרשימה`,
    )

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
    setRecipeEntries([])
    toast.success('הרשימה נוקתה')
  }

  function handleRemoveRecipeFromList(recipeId: string) {
    setItems((prev) => prev.filter((i) => i.recipeId !== recipeId))
    setRecipeEntries((prev) => removeRecipeEntry(prev, recipeId))
  }

  async function handleChangeMultiplier(recipeId: string, newMultiplier: number) {
    if (newMultiplier < 0.5 || updatingRecipeId === recipeId) return
    setUpdatingRecipeId(recipeId)

    try {
      // Build the new entries list with the updated multiplier
      const newEntries = recipeEntries.map((e) =>
        e.recipeId === recipeId
          ? { ...e, multiplier: newMultiplier, addedAt: new Date().toISOString() }
          : e,
      )

      // Fetch ALL recipes' ingredients and rebuild the entire list from scratch.
      // This is necessary because items get merged across recipes (e.g. "סוכר"
      // from two recipes becomes one line), so we can't just remove one recipe's
      // items without losing the merged quantities.
      const recipeIds = newEntries.map((e) => e.recipeId)
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, ingredients')
        .in('id', recipeIds)

      if (error || !data) {
        toast.error('שגיאה בעדכון הכפלה')
        return
      }

      // Rebuild list: start empty, add each recipe with its multiplier
      let rebuilt: ShoppingItem[] = []
      for (const entry of newEntries) {
        const recipe = data.find((r) => r.id === entry.recipeId)
        if (recipe) {
          rebuilt = addIngredientsToList(
            rebuilt,
            recipe.ingredients || [],
            recipe.id,
            recipe.title,
            entry.multiplier,
          )
        }
      }

      // Preserve checked items (already purchased) that aren't tied to any recipe
      const checkedItems = items.filter((i) => i.checked)
      setItems([...rebuilt, ...checkedItems])
      setRecipeEntries(newEntries)
    } catch {
      toast.error('שגיאה בעדכון הכפלה')
    } finally {
      setUpdatingRecipeId(null)
    }
  }

  function handleExportWhatsApp() {
    if (uncheckedItems.length === 0 && checkedItems.length === 0) return

    let text = '🛒 *רשימת קניות*\n\n'

    if (recipeEntries.length > 0) {
      text += '📖 *מתכונים:*\n'
      for (const entry of recipeEntries) {
        const mult = entry.multiplier !== 1 ? ` (x${entry.multiplier % 1 === 0 ? entry.multiplier : entry.multiplier.toFixed(1)})` : ''
        text += `• ${entry.recipeTitle}${mult}\n`
      }
      text += '\n'
    }

    if (uncheckedItems.length > 0) {
      text += '📝 *צריך לקנות:*\n'
      for (const item of uncheckedItems) {
        const qty = item.quantity ? `${item.quantity} ` : ''
        const unit = item.unit ? `${item.unit} ` : ''
        text += `☐ ${qty}${unit}${item.ingredientName}\n`
      }
    }

    if (checkedItems.length > 0) {
      text += '\n✅ *נרכשו:*\n'
      for (const item of checkedItems) {
        const qty = item.quantity ? `${item.quantity} ` : ''
        const unit = item.unit ? `${item.unit} ` : ''
        text += `☑ ${qty}${unit}${item.ingredientName}\n`
      }
    }

    const encoded = encodeURIComponent(text)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  // Separate checked and unchecked
  const uncheckedItems = items.filter((i) => !i.checked)
  const checkedItems = items.filter((i) => i.checked)

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

        {/* Recipes in list summary */}
        {recipeEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-on-surface">
              <span className="material-symbols-outlined text-lg text-tertiary">menu_book</span>
              מתכונים ברשימה
            </h2>
            <div className="flex flex-col gap-2">
              {recipeEntries.map((entry) => (
                <div
                  key={entry.recipeId}
                  className="flex items-center gap-3 rounded-lg bg-surface-container-low/60 px-3 py-2"
                >
                  <span className="material-symbols-outlined text-base text-primary">restaurant</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-on-surface">
                      {entry.recipeTitle}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container px-1 py-0.5" dir="ltr">
                    <button
                      onClick={() => handleChangeMultiplier(entry.recipeId, Math.max(0.5, entry.multiplier - 0.5))}
                      disabled={entry.multiplier <= 0.5 || updatingRecipeId === entry.recipeId}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-90 disabled:opacity-30"
                      aria-label="הפחת הכפלה"
                    >
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <span className="min-w-[2rem] text-center text-xs font-bold text-tertiary">
                      x{entry.multiplier % 1 === 0 ? entry.multiplier : entry.multiplier.toFixed(1)}
                    </span>
                    <button
                      onClick={() => handleChangeMultiplier(entry.recipeId, entry.multiplier + 0.5)}
                      disabled={updatingRecipeId === entry.recipeId}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-90 disabled:opacity-30"
                      aria-label="הגדל הכפלה"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveRecipeFromList(entry.recipeId)}
                    className="shrink-0 rounded-lg p-1 text-outline transition-colors hover:bg-error/10 hover:text-error"
                    aria-label={`הסר את ${entry.recipeTitle} מהרשימה`}
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportWhatsApp}
              className="flex items-center gap-1.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 px-3 py-2 text-xs font-medium text-[#25D366] transition-colors hover:bg-[#25D366]/20 active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              שלח לוואצאפ
            </button>
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

        {/* Shopping list - unified flat list */}
        {uncheckedItems.length > 0 && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <ul className="flex flex-col gap-1">
              <AnimatePresence mode="popLayout">
                {uncheckedItems.map((item) => (
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
