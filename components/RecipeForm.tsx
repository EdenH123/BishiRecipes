'use client'

import { createClient } from '@/lib/supabase'
import { type Recipe, type Ingredient, CATEGORIES, DEFAULT_TAGS, MEASUREMENT_UNITS, parseIngredient, serializeIngredient } from '@/lib/types'
import { compressImage } from '@/lib/compress-image'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef, type FormEvent } from 'react'

interface RecipeFormProps {
  recipe?: Recipe
}

export default function RecipeForm({ recipe }: RecipeFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(recipe?.title ?? '')
  const [description, setDescription] = useState(recipe?.description ?? '')
  const [category, setCategory] = useState(recipe?.category ?? '')
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? [])
  const [customTag, setCustomTag] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients?.length
      ? recipe.ingredients.map(parseIngredient)
      : [{ amount: '', unit: '', name: '' }]
  )
  const [steps, setSteps] = useState<string[]>(
    recipe?.steps?.length ? recipe.steps : ['']
  )
  const [customCategory, setCustomCategory] = useState('')
  const [videoUrl, setVideoUrl] = useState(recipe?.video_url ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
    recipe?.image_url ?? null
  )
  const [loading, setLoading] = useState(false)
  const [allCategories, setAllCategories] = useState<string[]>([...CATEGORIES])
  const [dbTags, setDbTags] = useState<string[]>([])
  // Merge DB tags + default tags + current recipe tags so new custom tags show immediately
  const allTags = Array.from(new Set([...DEFAULT_TAGS, ...dbTags, ...tags]))

  // Fetch existing custom categories & tags from recipes, filter out hidden ones
  useEffect(() => {
    async function fetchFilters() {
      const recipesRes = await supabase.from('recipes').select('category, tags')
      // hidden_filters table may not exist yet — ignore errors
      const hiddenRes = await supabase.from('hidden_filters').select('type, value')

      const hiddenCats = new Set<string>()
      const hiddenTags = new Set<string>()
      if (hiddenRes.data) {
        for (const h of hiddenRes.data) {
          if (h.type === 'category') hiddenCats.add(h.value)
          else hiddenTags.add(h.value)
        }
      }

      const cats = new Set<string>([...CATEGORIES])
      const tagSet = new Set<string>([...DEFAULT_TAGS, ...(recipe?.tags ?? []), ...tags])
      if (recipesRes.data) {
        for (const r of recipesRes.data) {
          if (r.category) cats.add(r.category)
          if (r.tags) {
            for (const t of r.tags) tagSet.add(t)
          }
        }
      }

      setAllCategories(Array.from(cats).filter((c) => !hiddenCats.has(c)))
      setDbTags(Array.from(tagSet).filter((t) => !hiddenTags.has(t)))
    }
    fetchFilters()
  }, [])

  // Clean up object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (imagePreview && imageFile) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview, imageFile])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function addCustomTag() {
    const trimmed = customTag.trim()
    if (!trimmed) return
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
    }
    setCustomTag('')
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { amount: '', unit: '', name: '' }])
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  function addStep() {
    setSteps((prev) => [...prev, ''])
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function updateStep(index: number, value: string) {
    setSteps((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  // Drag-to-reorder state
  const [dragIngredient, setDragIngredient] = useState<number | null>(null)

  function reorderIngredients(from: number, to: number) {
    setIngredients((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    // Validation
    if (!title.trim()) {
      toast.error('יש להזין שם מתכון')
      return
    }

    const filteredIngredients = ingredients.filter((ing) => ing.name.trim() !== '')
    if (filteredIngredients.length === 0) {
      toast.error('יש להוסיף לפחות מצרך אחד')
      return
    }

    const filteredSteps = steps.filter((s) => s.trim() !== '')
    if (filteredSteps.length === 0) {
      toast.error('יש להוסיף לפחות שלב הכנה אחד')
      return
    }

    setLoading(true)

    try {
      let imageUrl = recipe?.image_url ?? null

      // Upload image if a new file was selected
      if (imageFile) {
        try {
          const compressed = await compressImage(imageFile)
          const fileName = `${Date.now()}-${compressed.name}`
          const { error: uploadError } = await supabase.storage
            .from('recipe-images')
            .upload(fileName, compressed)

          if (uploadError) {
            console.warn('Image upload failed:', uploadError)
            toast.error('העלאת התמונה נכשלה, המתכון יישמר בלי תמונה')
          } else {
            imageUrl = supabase.storage
              .from('recipe-images')
              .getPublicUrl(fileName).data.publicUrl
          }
        } catch (uploadErr) {
          console.warn('Image upload exception:', uploadErr)
          toast.error('העלאת התמונה נכשלה, המתכון יישמר בלי תמונה')
        }
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) throw new Error('יש להתחבר כדי לשמור מתכון')

      const recipeData = {
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        tags,
        ingredients: filteredIngredients.map(serializeIngredient),
        steps: filteredSteps,
        image_url: imageUrl,
        video_url: videoUrl.trim() || null,
      }

      if (recipe) {
        // Editing
        const { error } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', recipe.id)

        if (error) throw error

        toast('המתכון נשמר בהצלחה!')
        router.push(`/recipe/${recipe.id}`)
      } else {
        // Creating
        const { data, error } = await supabase
          .from('recipes')
          .insert({ ...recipeData, created_by: user.id })
          .select('id')
          .single()

        if (error) throw error

        toast('המתכון נשמר בהצלחה! 🎉')
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.7 },
          colors: ['#b41c1b', '#feae2c', '#006a43', '#4A90D9'],
        })
        setTimeout(() => router.push(`/recipe/${data.id}`), 1200)
      }

      // Unhide any tags/category that were just used
      if (tags.length > 0) {
        await supabase
          .from('hidden_filters')
          .delete()
          .eq('type', 'tag')
          .in('value', tags)
      }
      if (category) {
        await supabase
          .from('hidden_filters')
          .delete()
          .eq('type', 'category')
          .eq('value', category)
      }
    } catch (err: unknown) {
      console.error('Recipe save error:', err)
      const message =
        err instanceof Error ? err.message : String(err)
      toast.error(message || 'שגיאה בשמירת המתכון')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'rounded-lg border border-gray-200 p-3 w-full focus:border-primary focus:ring-1 focus:ring-primary outline-none'

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto p-4 space-y-5"
      dir="rtl"
      lang="he"
    >
      {/* Import from text link */}
      {!recipe && (
        <Link
          href="/recipe/import"
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 py-3 text-sm text-primary font-medium transition-colors hover:bg-primary/5 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-lg">upload_file</span>
          ייבוא מתכון מטקסט
        </Link>
      )}

      {/* 1. Title */}
      <div>
        <label className="font-medium text-gray-700 mb-1 block">
          שם המתכון
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          spellCheck
          className={inputClass}
        />
      </div>

      {/* 2. Description */}
      <div>
        <label className="font-medium text-gray-700 mb-1 block">תיאור</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          spellCheck
          className={inputClass}
        />
      </div>

      {/* 3. Category */}
      <div>
        <label className="font-medium text-gray-700 mb-1 block">
          קטגוריה
        </label>
        <select
          value={
            category === '' && !customCategory ? '' :
            allCategories.includes(category) && !customCategory ? category :
            '__custom__'
          }
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setCustomCategory('1')
              setCategory('')
            } else {
              setCategory(e.target.value)
              setCustomCategory('')
            }
          }}
          className={inputClass}
        >
          <option value="">בחרו קטגוריה</option>
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
          <option value="__custom__">אחר...</option>
        </select>
        {(customCategory || (category !== '' && !allCategories.includes(category))) && (
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="הקלידו קטגוריה..."
            className={`${inputClass} mt-2`}
            autoFocus
          />
        )}
      </div>

      {/* 4. Tags */}
      <div>
        <label className="font-medium text-gray-700 mb-1 block">תגיות</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {allTags.map((tag) => {
            const selected = tags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selected
                    ? 'bg-primary text-white'
                    : 'bg-surface-container text-gray-700 hover:bg-surface-container-high'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustomTag()
              }
            }}
            placeholder="תגית חדשה..."
            className={inputClass}
          />
          <button
            type="button"
            onClick={addCustomTag}
            className="shrink-0 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:opacity-90 transition-opacity"
          >
            הוסף
          </button>
        </div>
      </div>

      {/* 5. Ingredients */}
      <div>
        <label className="font-medium text-gray-700 mb-2 block">מצרכים</label>
        {/* Header row */}
        <div className="flex gap-2 items-center mb-2 text-xs text-outline">
          <span className="w-16 text-center">כמות</span>
          <span className="w-24 text-center">יחידה</span>
          <span className="flex-1">שם המצרך</span>
          <span className="w-7"></span>
        </div>
        <div className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => setDragIngredient(index)}
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={() => { if (dragIngredient !== null && dragIngredient !== index) reorderIngredients(dragIngredient, index); setDragIngredient(null) }}
              onDragEnd={() => setDragIngredient(null)}
              className={`flex gap-2 items-center transition-opacity ${dragIngredient === index ? 'opacity-40' : ''}`}
            >
              <span className="shrink-0 cursor-grab text-gray-400 hover:text-gray-600 material-symbols-outlined text-lg">drag_indicator</span>
              <input
                type="text"
                value={ingredient.amount}
                onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                placeholder="2"
                className="w-16 rounded-lg border border-gray-200 p-3 text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                dir="ltr"
              />
              <select
                value={ingredient.unit}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                className="w-24 rounded-lg border border-gray-200 p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
              >
                {MEASUREMENT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit || '—'}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={ingredient.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                placeholder={`מצרך ${index + 1}`}
                spellCheck
                className="flex-1 rounded-lg border border-gray-200 p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="shrink-0 w-7 text-gray-400 hover:text-primary text-lg transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-2 text-sm text-primary hover:underline"
        >
          הוסיפו מצרך +
        </button>
      </div>

      {/* 6. Steps */}
      <div>
        <label className="font-medium text-gray-700 mb-1 block">
          שלבי הכנה
        </label>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-2 items-center">
              <span className="shrink-0 w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <input
                type="text"
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                placeholder={`שלב ${index + 1}`}
                spellCheck
                className={inputClass}
              />
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="shrink-0 text-gray-400 hover:text-primary text-lg transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStep}
          className="mt-2 text-sm text-primary hover:underline"
        >
          הוסיפו שלב +
        </button>
      </div>

      {/* 7. Image Upload */}
      <div>
        <label className="font-medium text-gray-700 mb-1 block">תמונה</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 hover:border-primary transition-colors p-6 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-700"
        >
          {imagePreview ? (
            <div className="relative w-full h-48">
              <Image
                src={imagePreview}
                alt="תצוגה מקדימה"
                fill
                className="object-cover rounded-lg"
              />
            </div>
          ) : (
            <span className="text-lg">לחצו להעלאת תמונה 📷</span>
          )}
        </button>
      </div>

      {/* 8. Video URL */}
      <div>
        <label className="font-medium text-gray-700 mb-1 block">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">play_circle</span>
            קישור לסרטון (TikTok / Instagram)
          </span>
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.tiktok.com/... או https://www.instagram.com/reel/..."
          className={inputClass}
          dir="ltr"
        />
        <p className="mt-1 text-xs text-outline">אופציונלי — הדביקו קישור לסרטון של המתכון</p>
      </div>

      {/* 9. Submit / Cancel */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'שומר...' : 'שמירה'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          ביטול
        </button>
      </div>
      {/* Image Cropper Modal */}
    </motion.form>
  )
}
