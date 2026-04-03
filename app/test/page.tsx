'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

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

    // Test 1: Supabase connection
    try {
      const { data, error } = await supabase.from('profiles').select('count')
      if (error) {
        add('1. Supabase Connection', 'fail', `Error: ${error.message} (code: ${error.code})`)
      } else {
        add('1. Supabase Connection', 'pass', 'Connected successfully')
      }
    } catch (e) {
      add('1. Supabase Connection', 'fail', `Exception: ${String(e)}`)
    }

    // Test 2: Auth state
    let userId: string | null = null
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        add('2. Auth State', 'fail', `Error: ${error.message}`)
      } else if (!user) {
        add('2. Auth State', 'fail', 'No user logged in')
      } else {
        userId = user.id
        add('2. Auth State', 'pass', `Logged in as: ${user.email} (id: ${user.id})`)
      }
    } catch (e) {
      add('2. Auth State', 'fail', `Exception: ${String(e)}`)
    }

    if (!userId) {
      add('3-6. Skipped', 'fail', 'No user — cannot continue tests')
      setRunning(false)
      return
    }

    // Test 3: Profile exists?
    let hasProfile = false
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        add('3. Profile Check', 'fail', `No profile found: ${error.message}`)
      } else {
        hasProfile = true
        add('3. Profile Check', 'pass', `Profile: ${data.display_name}`)
      }
    } catch (e) {
      add('3. Profile Check', 'fail', `Exception: ${String(e)}`)
    }

    // Test 4: Create profile if missing
    if (!hasProfile) {
      try {
        const { error } = await supabase
          .from('profiles')
          .insert({ id: userId, display_name: 'Test User' })

        if (error) {
          add('4. Create Profile', 'fail', `Error: ${error.message} (code: ${error.code}, details: ${error.details})`)
        } else {
          hasProfile = true
          add('4. Create Profile', 'pass', 'Profile created successfully')
        }
      } catch (e) {
        add('4. Create Profile', 'fail', `Exception: ${String(e)}`)
      }
    } else {
      add('4. Create Profile', 'pass', 'Skipped — profile already exists')
    }

    // Test 5: Insert a test recipe
    let testRecipeId: string | null = null
    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          title: 'מתכון בדיקה - אפשר למחוק',
          description: 'זהו מתכון בדיקה',
          ingredients: ['מצרך 1', 'מצרך 2'],
          steps: ['שלב 1', 'שלב 2'],
          category: 'ארוחת בוקר',
          tags: ['מהיר'],
          created_by: userId,
        })
        .select('id')
        .single()

      if (error) {
        add('5. Insert Recipe', 'fail', `Error: ${error.message} (code: ${error.code}, details: ${error.details}, hint: ${error.hint})`)
      } else {
        testRecipeId = data.id
        add('5. Insert Recipe', 'pass', `Recipe created! ID: ${data.id}`)
      }
    } catch (e) {
      add('5. Insert Recipe', 'fail', `Exception: ${String(e)}`)
    }

    // Test 6: Read back the recipe
    if (testRecipeId) {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*, profiles!created_by(display_name)')
          .eq('id', testRecipeId)
          .single()

        if (error) {
          add('6. Read Recipe', 'fail', `Error: ${error.message}`)
        } else {
          add('6. Read Recipe', 'pass', `Read back: "${data.title}" by ${data.profiles?.display_name}`)
        }
      } catch (e) {
        add('6. Read Recipe', 'fail', `Exception: ${String(e)}`)
      }

      // Cleanup: delete test recipe
      await supabase.from('recipes').delete().eq('id', testRecipeId)
      add('7. Cleanup', 'pass', 'Test recipe deleted')
    }

    // Test 7: Storage bucket
    try {
      const { data, error } = await supabase.storage.getBucket('recipe-images')
      if (error) {
        add('8. Storage Bucket', 'fail', `Error: ${error.message}`)
      } else {
        add('8. Storage Bucket', 'pass', `Bucket exists: ${data.name}, public: ${data.public}`)
      }
    } catch (e) {
      add('8. Storage Bucket', 'fail', `Exception: ${String(e)}`)
    }

    setRunning(false)
  }

  return (
    <div className="min-h-screen bg-surface p-6 font-rubik" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">בדיקות מערכת 🔧</h1>
      <p className="text-on-surface-variant mb-6">
        דף זה בודק את החיבור ל-Supabase, מצב ההרשמה, ויצירת מתכונים.
      </p>

      <button
        onClick={runTests}
        disabled={running}
        className="bg-primary text-on-primary px-6 py-3 rounded-full font-medium mb-6 disabled:opacity-50"
      >
        {running ? 'רץ...' : 'הרץ בדיקות'}
      </button>

      <div className="space-y-3 max-w-2xl">
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
              <span className="font-bold">{r.step}</span>
            </div>
            <p className="text-sm text-on-surface-variant break-all">{r.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
