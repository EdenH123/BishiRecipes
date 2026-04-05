'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { parseRecipeText, guessCategory, type ParsedRecipe } from '@/lib/parse-recipe'
import { type Ingredient, CATEGORIES, DEFAULT_TAGS, MEASUREMENT_UNITS, serializeIngredient } from '@/lib/types'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'

const EXAMPLE_TEXT = `עוגת שוקולד

מצרכים:
2 כוסות קמח
1.5 כוס סוכר
3/4 כוס קקאו
2 כפיות אבקת אפייה
3 ביצים
1 כוס שמן
1 כוס מים רותחים

הכנה:
מחממים תנור ל-180 מעלות
מערבבים את כל החומרים היבשים
מוסיפים ביצים ושמן וטורפים
מוסיפים מים רותחים ומערבבים
יוצקים לתבנית משומנת
אופים 35-40 דקות`

export default function ImportRecipePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Editable fields after parsing
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [steps, setSteps] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [dbTags, setDbTags] = useState<string[]>([])
  const allTags = Array.from(new Set([...DEFAULT_TAGS, ...dbTags, ...tags]))

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
    })
    // Fetch existing tags from recipes
    supabase.from('recipes').select('tags').then(({ data }) => {
      if (data) {
        const tagSet = new Set<string>()
        for (const r of data) {
          if (r.tags) for (const t of r.tags) tagSet.add(t)
        }
        setDbTags(Array.from(tagSet))
      }
    })
  }, [])

  async function handleUrlImport() {
    if (!urlInput.trim()) return
    setUrlLoading(true)
    try {
      const res = await fetch('/api/scrape-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'שגיאה בייבוא מהקישור')
        setUrlLoading(false)
        return
      }

      // Parse scraped ingredients through our parser for structured format
      const parsedIngredients: Ingredient[] = data.ingredients.map((line: string) => {
        const result = parseRecipeText(`temp\n\nמצרכים:\n${line}\n\nהכנה:\ntemp`)
        return result.ingredients[0] || { amount: '', unit: '', name: line }
      })

      setParsed({
        title: data.title,
        description: data.description,
        ingredients: parsedIngredients,
        steps: data.steps,
        category: '',
      })
      setTitle(data.title || '')
      setDescription(data.description || '')
      setIngredients(parsedIngredients.length > 0 ? parsedIngredients : [{ amount: '', unit: '', name: '' }])
      setSteps(data.steps.length > 0 ? data.steps : [''])
      setCategory(guessCategory(data.title, data.ingredients, data.steps))
      toast.success('המתכון יובא בהצלחה! בדקו ועִרכו לפי הצורך')
    } catch {
      toast.error('שגיאה בייבוא מהקישור')
    }
    setUrlLoading(false)
  }

  function handleParse() {
    if (!rawText.trim()) {
      toast.error('אין טקסט לעיבוד')
      return
    }
    const result = parseRecipeText(rawText)
    setParsed(result)
    setTitle(result.title)
    setDescription(result.description)
    setCategory(result.category)
    setIngredients(result.ingredients)
    setSteps(result.steps)
  }

  async function handleImageOcr(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input
    if (imageInputRef.current) imageInputRef.current.value = ''

    setOcrLoading(true)
    setOcrProgress(0)
    toast.info('מזהה טקסט מהתמונה...')

    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('heb', undefined, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100))
          }
        },
      })
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      if (!text.trim()) {
        toast.error('לא זוהה טקסט בתמונה')
        setOcrLoading(false)
        return
      }

      setRawText(text)
      toast.success('הטקסט זוהה! בִדקו ועִרכו לפני העיבוד')
    } catch (err) {
      toast.error('שגיאה בזיהוי הטקסט')
    }
    setOcrLoading(false)
    setOcrProgress(0)
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { amount: '', unit: '', name: '' }])
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function addStep() {
    setSteps((prev) => [...prev, ''])
  }

  function updateStep(index: number, value: string) {
    setSteps((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  async function doSave(): Promise<boolean> {
    if (!userId) return false
    if (!title.trim()) { toast.error('חובה להזין שם מתכון'); return false }
    if (ingredients.filter((i) => i.name.trim()).length === 0) { toast.error('חובה להזין מצרך אחד לפחות'); return false }
    if (steps.filter((s) => s.trim()).length === 0) { toast.error('חובה להזין שלב אחד לפחות'); return false }

    setSaving(true)
    const { error } = await supabase.from('recipes').insert({
      title: title.trim(),
      description: description.trim() || null,
      ingredients: ingredients.filter((i) => i.name.trim()).map(serializeIngredient),
      steps: steps.filter((s) => s.trim()),
      category: category || null,
      tags,
      created_by: userId,
    })
    setSaving(false)

    if (error) {
      toast.error('שגיאה בשמירת המתכון')
      return false
    }
    return true
  }

  async function handleSave() {
    const ok = await doSave()
    if (ok) {
      toast.success('המתכון נשמר בהצלחה!')
      router.push('/')
    }
  }

  async function handleSaveAndNext() {
    const ok = await doSave()
    if (ok) {
      toast.success(`"${title}" נשמר!`)
      setParsed(null)
      setRawText('')
      setTitle('')
      setDescription('')
      setCategory('')
      setIngredients([])
      setSteps([])
      setTags([])
      setCustomTag('')
    }
  }

  return (
    <div className="min-h-screen bg-surface pt-20 pb-28" dir="rtl">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-6 font-rubik">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-on-surface-variant mb-4 hover:text-primary active:scale-95 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
          חזרה
        </button>
        <h1 className="text-2xl font-bold mb-2">ייבוא מתכון</h1>
        <p className="text-on-surface-variant text-sm mb-6">
          הדביקו קישור לאתר מתכונים, טקסט חופשי, או תמונה — המערכת תזהה אוטומטית את השם, המצרכים והשלבים.
        </p>

        <AnimatePresence mode="wait">
          {!parsed ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* URL Import */}
              <div className="mb-6 bg-surface-container-low rounded-xl p-4">
                <label className="font-bold text-sm mb-2 block">
                  <span className="material-symbols-outlined text-base align-middle ml-1">link</span>
                  ייבוא מקישור
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUrlImport() }}
                    placeholder="https://www.example.com/recipe/..."
                    dir="ltr"
                    className="flex-1 rounded-lg border border-outline-variant px-4 py-3 text-sm outline-none focus:border-primary bg-surface-container-lowest"
                  />
                  <button
                    onClick={handleUrlImport}
                    disabled={!urlInput.trim() || urlLoading}
                    className="bg-primary text-white px-5 py-3 rounded-lg font-medium disabled:opacity-40 active:scale-95 transition-transform text-sm shrink-0"
                  >
                    {urlLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                        מייבא...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">download</span>
                        ייבא
                      </span>
                    )}
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant mt-2">
                  תומך ברוב אתרי המתכונים הפופולריים
                </p>
              </div>

              <div className="relative flex items-center gap-3 mb-6">
                <div className="flex-1 border-t border-outline-variant" />
                <span className="text-xs text-on-surface-variant">או הדביקו טקסט</span>
                <div className="flex-1 border-t border-outline-variant" />
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="הדביקו כאן את הטקסט של המתכון..."
                className="w-full h-64 rounded-xl border border-outline-variant p-4 text-base leading-relaxed resize-y outline-none focus:border-primary transition-colors bg-surface-container-lowest"
              />

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  onClick={handleParse}
                  disabled={!rawText.trim()}
                  className="bg-primary text-white px-6 py-3 rounded-full font-medium disabled:opacity-40 active:scale-95 transition-transform"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">auto_fix_high</span>
                    עיבוד אוטומטי
                  </span>
                </button>

                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={ocrLoading}
                  className="bg-surface-container text-on-surface px-5 py-3 rounded-full font-medium disabled:opacity-40 active:scale-95 transition-transform"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">photo_camera</span>
                    {ocrLoading ? `מזהה... ${ocrProgress}%` : 'זיהוי מתמונה'}
                  </span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageOcr}
                  className="hidden"
                />

                <button
                  onClick={() => { setRawText(EXAMPLE_TEXT); toast.success('דוגמה נטענה') }}
                  className="text-sm text-primary hover:underline"
                >
                  טען דוגמה
                </button>
              </div>

              {ocrLoading && (
                <div className="mt-3 h-2 rounded-full bg-surface-container-low overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              )}

              <div className="mt-6 bg-surface-container-low rounded-xl p-4">
                <h3 className="font-bold text-sm mb-2">דרכי ייבוא:</h3>
                <ul className="text-xs text-on-surface-variant space-y-1">
                  <li>{`🔗 קישור לאתר מתכונים — המערכת תשלוף את המתכון אוטומטית`}</li>
                  <li>{`📝 טקסט עם כותרות ("מצרכים:", "הכנה:") או טקסט חופשי`}</li>
                  <li>{`📷 תמונה של מתכון — זיהוי טקסט אוטומטי (OCR) בעברית`}</li>
                  <li>{`🔢 כמויות בעברית ("שתי כוסות") או מספרים ("2 כוסות")`}</li>
                </ul>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">תצוגה מקדימה — עִרכו לפי הצורך</h2>
                <button
                  onClick={() => setParsed(null)}
                  className="text-sm text-primary hover:underline"
                >
                  חזרה לטקסט
                </button>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="text-sm font-bold text-on-surface-variant mb-1 block">שם המתכון</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-4 py-3 text-base outline-none focus:border-primary bg-surface-container-lowest"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="text-sm font-bold text-on-surface-variant mb-1 block">תיאור (אופציונלי)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-outline-variant px-4 py-3 text-base outline-none focus:border-primary resize-y bg-surface-container-lowest"
                />
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="text-sm font-bold text-on-surface-variant mb-1 block">קטגוריה</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-4 py-3 text-base outline-none focus:border-primary bg-surface-container-lowest"
                >
                  <option value="">ללא קטגוריה</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {category && (
                  <p className="text-xs text-tertiary mt-1">זוהה אוטומטית — שנו אם צריך</p>
                )}
              </div>

              {/* Tags */}
              <div className="mb-4">
                <label className="text-sm font-bold text-on-surface-variant mb-2 block">תגיות</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 ${
                        tags.includes(tag)
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customTag.trim()) {
                        e.preventDefault()
                        const t = customTag.trim()
                        if (!tags.includes(t)) setTags((prev) => [...prev, t])
                        setCustomTag('')
                      }
                    }}
                    placeholder="תגית חדשה..."
                    className="flex-1 rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-surface-container-lowest"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const t = customTag.trim()
                      if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
                      setCustomTag('')
                    }}
                    disabled={!customTag.trim()}
                    className="px-3 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-40 active:scale-95"
                  >
                    הוסף
                  </button>
                </div>
              </div>

              {/* Ingredients */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-on-surface-variant">
                    {`מצרכים (${ingredients.length})`}
                  </label>
                  <button
                    onClick={addIngredient}
                    className="text-xs text-primary hover:underline"
                  >
                    + הוסף מצרך
                  </button>
                </div>
                <div className="space-y-2">
                  {ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ing.amount}
                        onChange={(e) => updateIngredient(i, 'amount', e.target.value)}
                        placeholder="כמות"
                        className="w-16 rounded-lg border border-outline-variant px-2 py-2 text-sm outline-none focus:border-primary bg-surface-container-lowest text-center"
                      />
                      <select
                        value={ing.unit}
                        onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                        className="w-20 rounded-lg border border-outline-variant px-1 py-2 text-sm outline-none focus:border-primary bg-surface-container-lowest"
                      >
                        {MEASUREMENT_UNITS.map((u) => (
                          <option key={u} value={u}>{u || '\u2014'}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                        placeholder="שם המצרך"
                        className="flex-1 rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-surface-container-lowest"
                      />
                      <button
                        onClick={() => removeIngredient(i)}
                        className="p-2 text-gray-400 hover:text-error active:scale-95"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-on-surface-variant">
                    {`שלבי הכנה (${steps.length})`}
                  </label>
                  <button
                    onClick={addStep}
                    className="text-xs text-primary hover:underline"
                  >
                    + הוסף שלב
                  </button>
                </div>
                <div className="space-y-2">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white mt-1">
                        {i + 1}
                      </span>
                      <textarea
                        value={step}
                        onChange={(e) => updateStep(i, e.target.value)}
                        rows={2}
                        className="flex-1 rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary resize-y bg-surface-container-lowest"
                      />
                      <button
                        onClick={() => removeStep(i)}
                        className="p-2 text-gray-400 hover:text-error active:scale-95 mt-1"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveAndNext}
                  disabled={saving}
                  className="bg-primary text-white px-6 py-3 rounded-full font-medium disabled:opacity-40 active:scale-95 transition-transform"
                >
                  {saving ? 'שומר...' : 'שמור ויבא עוד'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-surface-container text-on-surface px-6 py-3 rounded-full font-medium disabled:opacity-40 active:scale-95 transition-transform"
                >
                  שמור וסיים
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  )
}
