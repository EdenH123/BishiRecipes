'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface TestResult {
  step: string
  status: 'pass' | 'fail' | 'pending'
  detail: string
}

export default function TestPage() {
  const supabase = createClient()
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)

  async function runTests() {
    setRunning(true)
    const tests: TestResult[] = []

    function add(step: string, status: 'pass' | 'fail', detail: string) {
      tests.push({ step, status, detail })
      setResults([...tests])
    }

    // 1. Supabase connection
    try {
      const { data, error } = await supabase.from('profiles').select('count')
      if (error) add('1. חיבור Supabase', 'fail', `Error: ${error.message}`)
      else add('1. חיבור Supabase', 'pass', 'מחובר בהצלחה')
    } catch (e) {
      add('1. חיבור Supabase', 'fail', `Exception: ${String(e)}`)
    }

    // 2. Auth state
    let userId: string | null = null
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        add('2. מצב הרשאות', 'fail', error?.message || 'לא מחובר')
      } else {
        userId = user.id
        add('2. מצב הרשאות', 'pass', `מחובר: ${user.email}`)
      }
    } catch (e) {
      add('2. מצב הרשאות', 'fail', `Exception: ${String(e)}`)
    }

    if (!userId) {
      add('3-15. דילוג', 'fail', 'לא מחובר — לא ניתן להמשיך')
      setRunning(false)
      return
    }

    // 3. Profile exists
    let hasProfile = false
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) add('3. בדיקת פרופיל', 'fail', error.message)
      else {
        hasProfile = true
        add('3. בדיקת פרופיל', 'pass', `פרופיל: ${data.display_name} | אדמין: ${data.is_admin ? 'כן' : 'לא'} | אווטאר: ${data.avatar_url ? 'יש' : 'אין'}`)
      }
    } catch (e) {
      add('3. בדיקת פרופיל', 'fail', String(e))
    }

    // 4. Create profile if missing
    if (!hasProfile) {
      try {
        const { error } = await supabase
          .from('profiles')
          .insert({ id: userId, display_name: 'Test User' })
        if (error) add('4. יצירת פרופיל', 'fail', error.message)
        else { hasProfile = true; add('4. יצירת פרופיל', 'pass', 'פרופיל נוצר') }
      } catch (e) {
        add('4. יצירת פרופיל', 'fail', String(e))
      }
    } else {
      add('4. יצירת פרופיל', 'pass', 'דילוג — פרופיל קיים')
    }

    // 5. Insert test recipe
    let testRecipeId: string | null = null
    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          title: 'מתכון בדיקה - אפשר למחוק',
          description: 'זהו מתכון בדיקה\nשורה שנייה',
          ingredients: [
            JSON.stringify({ amount: '2', unit: 'כוסות', name: 'קמח' }),
            JSON.stringify({ amount: '1', unit: 'כפית', name: 'מלח' }),
          ],
          steps: ['שלב 1', 'שלב 2'],
          category: 'ארוחת בוקר',
          tags: ['מהיר', 'קל להכנה'],
          video_url: 'https://example.com/video',
          created_by: userId,
        })
        .select('id')
        .single()
      if (error) add('5. יצירת מתכון', 'fail', `${error.message} | ${error.details} | ${error.hint}`)
      else { testRecipeId = data.id; add('5. יצירת מתכון', 'pass', `נוצר: ${data.id}`) }
    } catch (e) {
      add('5. יצירת מתכון', 'fail', String(e))
    }

    // 6. Read recipe with FK join
    if (testRecipeId) {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*, profiles!created_by(display_name, avatar_url)')
          .eq('id', testRecipeId)
          .single()
        if (error) add('6. קריאת מתכון (FK join)', 'fail', error.message)
        else add('6. קריאת מתכון (FK join)', 'pass', `"${data.title}" מאת ${data.profiles?.display_name} | תגיות: ${data.tags?.join(', ')} | קטגוריה: ${data.category}`)
      } catch (e) {
        add('6. קריאת מתכון (FK join)', 'fail', String(e))
      }
    }

    // 7. Favorites
    if (testRecipeId) {
      try {
        const { error: insertErr } = await supabase
          .from('favorites')
          .insert({ user_id: userId, recipe_id: testRecipeId })
        if (insertErr) { add('7. מועדפים', 'fail', `Insert: ${insertErr.message}`); }
        else {
          const { data: favs } = await supabase
            .from('favorites')
            .select('recipe_id')
            .eq('user_id', userId)
            .eq('recipe_id', testRecipeId)
          if (favs && favs.length > 0) {
            await supabase.from('favorites').delete().eq('user_id', userId).eq('recipe_id', testRecipeId)
            add('7. מועדפים', 'pass', 'הוספה + קריאה + מחיקה עובדים')
          } else {
            add('7. מועדפים', 'fail', 'לא נמצא אחרי הוספה')
          }
        }
      } catch (e) {
        add('7. מועדפים', 'fail', String(e))
      }
    }

    // 8. Comments
    if (testRecipeId) {
      try {
        const { data: comment, error: commentErr } = await supabase
          .from('comments')
          .insert({ recipe_id: testRecipeId, user_id: userId, content: 'תגובת בדיקה' })
          .select('id')
          .single()
        if (commentErr) { add('8. תגובות', 'fail', commentErr.message); }
        else {
          const { data: comments } = await supabase
            .from('comments')
            .select('*, profiles!user_id(display_name)')
            .eq('recipe_id', testRecipeId)
          if (comments && comments.length > 0) {
            await supabase.from('comments').delete().eq('id', comment.id)
            add('8. תגובות', 'pass', `יצירה + FK join + מחיקה | תגובות: ${comments.length}`)
          } else {
            add('8. תגובות', 'fail', 'לא נמצאה תגובה')
          }
        }
      } catch (e) {
        add('8. תגובות', 'fail', String(e))
      }
    }

    // 9. Ratings
    if (testRecipeId) {
      try {
        const { error: rateErr } = await supabase
          .from('ratings')
          .upsert({ recipe_id: testRecipeId, user_id: userId, score: 5 }, { onConflict: 'recipe_id,user_id' })
        if (rateErr) { add('9. דירוגים', 'fail', rateErr.message); }
        else {
          const { data: ratings } = await supabase
            .from('ratings')
            .select('score')
            .eq('recipe_id', testRecipeId)
          const avg = ratings && ratings.length > 0
            ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
            : '0'
          await supabase.from('ratings').delete().eq('recipe_id', testRecipeId).eq('user_id', userId)
          add('9. דירוגים', 'pass', `upsert + קריאה + מחיקה | ממוצע: ${avg}`)
        }
      } catch (e) {
        add('9. דירוגים', 'fail', String(e))
      }
    }

    // 10. Hidden filters table
    try {
      const { data, error } = await supabase.from('hidden_filters').select('type, value')
      if (error) add('10. טבלת hidden_filters', 'fail', error.message)
      else add('10. טבלת hidden_filters', 'pass', `${data.length} רשומות מוסתרות`)
    } catch (e) {
      add('10. טבלת hidden_filters', 'fail', String(e))
    }

    // 11. Storage upload
    try {
      const testBlob = new Blob(['test'], { type: 'text/plain' })
      const testFileName = `_test_${Date.now()}.txt`
      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(testFileName, testBlob)
      if (uploadError) add('11. העלאת קבצים (Storage)', 'fail', uploadError.message)
      else {
        const { data: { publicUrl } } = supabase.storage
          .from('recipe-images')
          .getPublicUrl(testFileName)
        await supabase.storage.from('recipe-images').remove([testFileName])
        add('11. העלאת קבצים (Storage)', 'pass', `העלאה + URL + מחיקה | URL: ${publicUrl.slice(0, 60)}...`)
      }
    } catch (e) {
      add('11. העלאת קבצים (Storage)', 'fail', String(e))
    }

    // 12. Recipe update
    if (testRecipeId) {
      try {
        const { error } = await supabase
          .from('recipes')
          .update({ title: 'מתכון בדיקה - עודכן' })
          .eq('id', testRecipeId)
        if (error) add('12. עדכון מתכון', 'fail', error.message)
        else {
          const { data } = await supabase.from('recipes').select('title, updated_at').eq('id', testRecipeId).single()
          add('12. עדכון מתכון', 'pass', `עודכן ל: "${data?.title}" | updated_at: ${data?.updated_at}`)
        }
      } catch (e) {
        add('12. עדכון מתכון', 'fail', String(e))
      }
    }

    // 13. Profile update
    try {
      const { data: before } = await supabase.from('profiles').select('display_name').eq('id', userId).single()
      const origName = before?.display_name
      const { error } = await supabase.from('profiles').update({ display_name: 'Test Update' }).eq('id', userId)
      if (error) add('13. עדכון פרופיל', 'fail', error.message)
      else {
        await supabase.from('profiles').update({ display_name: origName }).eq('id', userId)
        add('13. עדכון פרופיל', 'pass', 'עדכון + שחזור שם עבדו')
      }
    } catch (e) {
      add('13. עדכון פרופיל', 'fail', String(e))
    }

    // 14. Recipe list with filters
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, category, tags')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) add('14. שליפת מתכונים + מיון', 'fail', error.message)
      else add('14. שליפת מתכונים + מיון', 'pass', `${data.length} מתכונים | ראשון: "${data[0]?.title || 'אין'}"`)
    } catch (e) {
      add('14. שליפת מתכונים + מיון', 'fail', String(e))
    }

    // 15. Cleanup test recipe
    if (testRecipeId) {
      try {
        await supabase.from('recipes').delete().eq('id', testRecipeId)
        add('15. ניקוי', 'pass', 'מתכון הבדיקה נמחק')
      } catch (e) {
        add('15. ניקוי', 'fail', String(e))
      }
    }

    setRunning(false)
  }

  const passCount = results.filter((r) => r.status === 'pass').length
  const failCount = results.filter((r) => r.status === 'fail').length

  return (
    <div className="min-h-screen bg-surface p-6 font-rubik" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">בדיקות מערכת 🔧</h1>
          <Link href="/" className="text-sm text-primary hover:underline">חזרה לאפליקציה</Link>
        </div>
        <p className="text-on-surface-variant mb-6">
          בודק: חיבור, הרשאות, פרופיל, מתכונים, מועדפים, תגובות, דירוגים, hidden_filters, אחסון, עדכונים.
        </p>

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={runTests}
            disabled={running}
            className="bg-primary text-on-primary px-6 py-3 rounded-full font-medium disabled:opacity-50"
          >
            {running ? 'רץ...' : 'הרץ בדיקות'}
          </button>
          {results.length > 0 && (
            <span className="text-sm">
              <span className="text-tertiary font-bold">{passCount} עברו</span>
              {failCount > 0 && <span className="text-error font-bold mr-2"> · {failCount} נכשלו</span>}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {results.map((r, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border ${
                r.status === 'pass'
                  ? 'bg-tertiary/10 border-tertiary/30'
                  : r.status === 'fail'
                  ? 'bg-error/10 border-error/30'
                  : 'bg-surface-container border-outline-variant'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏳'}</span>
                <span className="font-bold text-sm">{r.step}</span>
              </div>
              <p className="text-xs text-on-surface-variant break-all">{r.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
