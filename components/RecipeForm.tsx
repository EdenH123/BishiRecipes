'use client'

import { createClient } from '@/lib/supabase'
import { type Recipe, CATEGORIES, DEFAULT_TAGS } from '@/lib/types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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
  const [ingredients, setIngredients] = useState<string[]>(
    recipe?.ingredients?.length ? recipe.ingredients : ['']
  )
  const [steps, setSteps] = useState<string[]>(
    recipe?.steps?.length ? recipe.steps : ['']
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
    recipe?.image_url ?? null
  )
  const [loading, setLoading] = useState(false)

  // Build the full set of available tag chips
  const allTags = Array.from(
    new Set([...DEFAULT_TAGS, ...(recipe?.tags ?? []), ...tags])
  )

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
    setImageFile(file)
    if (file) {
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
    setIngredients((prev) => [...prev, ''])
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function updateIngredient(index: number, value: string) {
    setIngredients((prev) => prev.map((item, i) => (i === index ? value : item)))
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    // Validation
    if (!title.trim()) {
      toast.error('יש להזין שם מתכון')
      return
    }

    const filteredIngredients = ingredients.filter((s) => s.trim() !== '')
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
          const fileName = `${Date.now()}-${imageFile.name}`
          const { error: uploadError } = await supabase.storage
            .from('recipe-images')
            .upload(fileName, imageFile)

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
        ingredients: filteredIngredients,
        steps: filteredSteps,
        image_url: imageUrl,
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

        toast('המתכון נשמר בהצלחה!')
        router.push(`/recipe/${data.id}`)
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
    >
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
          className={inputClass}
        />
      </div>

      {/* 2. Description */}
      <div>
        <label className="font-medium text-gray-700 mb-1 block">תיאור</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* 3. Category */}
      <div>
        <label className="font-medium text-gray-700 mb-1 block">
          קטגוריה
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          <option value="">בחרו קטגוריה</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
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
        <label className="font-medium text-gray-700 mb-1 block">מצרכים</label>
        <div className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                value={ingredient}
                onChange={(e) => updateIngredient(index, e.target.value)}
                placeholder={`מצרך ${index + 1}`}
                className={inputClass}
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
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

      {/* 8. Submit / Cancel */}
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
    </motion.form>
  )
}
