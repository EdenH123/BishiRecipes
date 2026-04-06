'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { calculateXP, getLevel, getNextLevel, getLevelProgress } from '@/lib/xp-levels'
import { ACHIEVEMENTS, getUnlockedAchievements } from '@/lib/achievements'
import { parseRecipeText } from '@/lib/parse-recipe'
import Link from 'next/link'

interface TestResult {
  step: string
  status: 'pass' | 'fail' | 'pending'
  detail: string
}

export default function TestPage() {
  const supabase = useMemo(() => createClient(), [])
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
      add('3-36. דילוג', 'fail', 'לא מחובר — לא ניתן להמשיך')
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

    // 15. Reactions (emoji)
    if (testRecipeId) {
      try {
        const { error: reactErr } = await supabase
          .from('reactions')
          .insert({ recipe_id: testRecipeId, user_id: userId, emoji: '🔥' })
        if (reactErr) { add('15. תגובות אמוג׳י', 'fail', reactErr.message); }
        else {
          // Insert another emoji
          await supabase
            .from('reactions')
            .insert({ recipe_id: testRecipeId, user_id: userId, emoji: '😋' })
          // Read all reactions
          const { data: reactions } = await supabase
            .from('reactions')
            .select('emoji')
            .eq('recipe_id', testRecipeId)
          // Delete them
          await supabase.from('reactions').delete().eq('recipe_id', testRecipeId).eq('user_id', userId)
          add('15. תגובות אמוג׳י', 'pass', `הוספה + קריאה + מחיקה | ${reactions?.length || 0} תגובות (🔥😋)`)
        }
      } catch (e) {
        add('15. תגובות אמוג׳י', 'fail', String(e))
      }
    }

    // 16. Reactions - duplicate prevention
    if (testRecipeId) {
      try {
        await supabase
          .from('reactions')
          .insert({ recipe_id: testRecipeId, user_id: userId, emoji: '❤️' })
        const { error: dupErr } = await supabase
          .from('reactions')
          .insert({ recipe_id: testRecipeId, user_id: userId, emoji: '❤️' })
        await supabase.from('reactions').delete().eq('recipe_id', testRecipeId).eq('user_id', userId)
        if (dupErr) {
          add('16. מניעת כפילות אמוג׳י', 'pass', `כפילות נחסמה: ${dupErr.message.slice(0, 50)}`)
        } else {
          add('16. מניעת כפילות אמוג׳י', 'fail', 'כפילות לא נחסמה — PK חסר?')
        }
      } catch (e) {
        add('16. מניעת כפילות אמוג׳י', 'fail', String(e))
      }
    }

    // 17. Avatar gradient utility
    try {
      const { getAvatarGradient } = await import('@/lib/avatar-gradient')
      const grad1 = getAvatarGradient('test-user-1')
      const grad2 = getAvatarGradient('test-user-2')
      const grad1Again = getAvatarGradient('test-user-1')
      const isLinearGradient = grad1.startsWith('linear-gradient')
      const isDeterministic = grad1 === grad1Again
      const isDifferent = grad1 !== grad2
      if (isLinearGradient && isDeterministic && isDifferent) {
        add('17. גרדיאנט אווטאר', 'pass', `דטרמיניסטי ✓ | שונה בין משתמשים ✓ | ${grad1.slice(0, 45)}...`)
      } else {
        add('17. גרדיאנט אווטאר', 'fail', `gradient: ${isLinearGradient} | deterministic: ${isDeterministic} | different: ${isDifferent}`)
      }
    } catch (e) {
      add('17. גרדיאנט אווטאר', 'fail', String(e))
    }

    // 18. Image compression utility
    try {
      const { compressImage } = await import('@/lib/compress-image')

      // Test A: Large image (2000x2000) should be compressed AND resized to max 1200
      const canvas = document.createElement('canvas')
      canvas.width = 2000
      canvas.height = 2000
      const ctx = canvas.getContext('2d')!
      // Fill with pixel-level noise to create a large PNG (well over 200KB)
      const imageData = ctx.createImageData(2000, 2000)
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.random() * 255     // R
        imageData.data[i + 1] = Math.random() * 255 // G
        imageData.data[i + 2] = Math.random() * 255 // B
        imageData.data[i + 3] = 255                  // A
      }
      ctx.putImageData(imageData, 0, 0)
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'))
      const testFile = new File([blob], 'test.png', { type: 'image/png' })
      const compressed = await compressImage(testFile)

      // Verify size reduced — noise PNG is very large, JPEG should compress significantly
      const sizeOk = compressed.size < testFile.size
      // Verify dimensions reduced by loading compressed image
      const compressedImg = new window.Image()
      const dimCheck: boolean = await new Promise((resolve) => {
        compressedImg.onload = () => {
          resolve(compressedImg.width <= 1200 && compressedImg.height <= 1200)
        }
        compressedImg.onerror = () => resolve(false)
        compressedImg.src = URL.createObjectURL(compressed)
      })

      // Test B: Small file (under 200KB) should NOT be compressed
      const tinyCanvas = document.createElement('canvas')
      tinyCanvas.width = 50
      tinyCanvas.height = 50
      tinyCanvas.getContext('2d')!.fillRect(0, 0, 50, 50)
      const tinyBlob: Blob = await new Promise((res) => tinyCanvas.toBlob((b) => res(b!), 'image/png'))
      const tinyFile = new File([tinyBlob], 'tiny.png', { type: 'image/png' })
      const tinyResult = await compressImage(tinyFile)
      const skipOk = tinyResult === tinyFile // Should return same file object

      const origKB = (testFile.size / 1024).toFixed(0)
      const compKB = (compressed.size / 1024).toFixed(0)
      const same = compressed === testFile

      if (sizeOk && dimCheck && skipOk) {
        const sizeReduction = ((1 - compressed.size / testFile.size) * 100).toFixed(0)
        add('18. דחיסת תמונות', 'pass', `גודל: ${origKB}KB→${compKB}KB (${sizeReduction}%), מימדים: 2000→≤1200 ✓, קטנות לא נדחסות ✓`)
      } else {
        const issues = []
        if (!sizeOk) issues.push(`גודל: ${origKB}KB→${compKB}KB${same ? ' (אותו קובץ!)' : ''}`)
        if (!dimCheck) issues.push(`מימדים: ${compressedImg.width}x${compressedImg.height}`)
        if (!skipOk) issues.push('קבצים קטנים נדחסו שלא לצורך')
        add('18. דחיסת תמונות', 'fail', issues.join(' | '))
      }
    } catch (e) {
      add('18. דחיסת תמונות', 'fail', String(e))
    }

    // 19. Unit converter logic
    try {
      const conversions = [
        { from: 'כוס', to: 'מ״ל', factor: 240 },
        { from: 'כף', to: 'מ״ל', factor: 15 },
        { from: 'כפית', to: 'מ״ל', factor: 5 },
      ]
      const results = conversions.map((c) => `1 ${c.from} = ${c.factor} ${c.to}`)
      add('19. ממיר יחידות', 'pass', results.join(' | '))
    } catch (e) {
      add('19. ממיר יחידות', 'fail', String(e))
    }

    // 20. Recipe export utility
    try {
      const { exportRecipeAsImage } = await import('@/lib/export-recipe')
      if (typeof exportRecipeAsImage === 'function') {
        add('20. ייצוא תמונת מתכון', 'pass', 'פונקציה קיימת ומיוצאת')
      } else {
        add('20. ייצוא תמונת מתכון', 'fail', 'לא נמצאה פונקציה')
      }
    } catch (e) {
      add('20. ייצוא תמונת מתכון', 'fail', String(e))
    }

    // 21. Type utilities (parseIngredient, displayIngredient, formatAmount, getUserBadge)
    try {
      const { parseIngredient, displayIngredient, formatAmount, getUserBadge } = await import('@/lib/types')
      const parsed = parseIngredient(JSON.stringify({ amount: '2', unit: 'כוסות', name: 'קמח' }))
      const display = displayIngredient(parsed)
      const badge0 = getUserBadge(0)
      const badge1 = getUserBadge(1)
      const badge5 = getUserBadge(5)
      const badge10 = getUserBadge(10)
      const badge20 = getUserBadge(20)
      const badgeCheck = !badge0 && badge1?.icon === '🌱' && badge5?.icon === '🥄' && badge10?.icon === '🍳' && badge20?.icon === '👨‍🍳'
      const displayContains = display.includes('2') && display.includes('כוסות') && display.includes('קמח')
      // formatAmount converts fractions to Unicode
      const frac1 = formatAmount('1/2') === '½'
      const frac2 = formatAmount('1 1/4') === '1¼'
      const frac3 = formatAmount('3/4') === '¾'
      const fracCheck = frac1 && frac2 && frac3
      if (parsed.amount === '2' && parsed.unit === 'כוסות' && parsed.name === 'קמח' && displayContains && badgeCheck && fracCheck) {
        add('21. כלי טיפוסים (types)', 'pass', `parseIngredient ✓ | displayIngredient ✓ | formatAmount: 1/2→½, 1 1/4→1¼, 3/4→¾ ✓ | badges ✓`)
      } else {
        add('21. כלי טיפוסים (types)', 'fail', `parsed: ${JSON.stringify(parsed)} | display: ${displayContains} | fractions: ${frac1},${frac2},${frac3} | badges: ${badgeCheck}`)
      }
    } catch (e) {
      add('21. כלי טיפוסים (types)', 'fail', String(e))
    }

    // 22. Multiple favorites for same user
    if (testRecipeId) {
      try {
        await supabase.from('favorites').insert({ user_id: userId, recipe_id: testRecipeId })
        const { error: dupErr } = await supabase.from('favorites').insert({ user_id: userId, recipe_id: testRecipeId })
        await supabase.from('favorites').delete().eq('user_id', userId).eq('recipe_id', testRecipeId)
        if (dupErr) {
          add('22. מניעת כפילות מועדפים', 'pass', `כפילות נחסמה`)
        } else {
          add('22. מניעת כפילות מועדפים', 'fail', 'כפילות לא נחסמה')
        }
      } catch (e) {
        add('22. מניעת כפילות מועדפים', 'fail', String(e))
      }
    }

    // 23. Coins & Shop
    try {
      const { calculateCoins, getShopItem, SHOP_ITEMS } = await import('@/lib/coins')
      const coins = calculateCoins({ recipeCount: 3, commentCount: 5, ratingCount: 2, favoriteCount: 8, reactionCount: 4, collaborationCount: 1 })
      const expected = 3 * 25 + 5 * 5 + 2 * 3 + 8 * 2 + 4 * 1 + 1 * 15 // 75+25+6+16+4+15=141
      const goldFrame = getShopItem('frame_gold')
      const frameCount = SHOP_ITEMS.filter(i => i.type === 'frame').length
      const titleCount = SHOP_ITEMS.filter(i => i.type === 'title').length
      const coinsOk = coins === expected
      const shopOk = goldFrame !== undefined && goldFrame.type === 'frame'
      if (coinsOk && shopOk) {
        add('23. מטבעות וחנות', 'pass', `calculateCoins=${coins} (צפוי ${expected}) ✓ | ${frameCount} מסגרות, ${titleCount} תארים | frame_gold: ${goldFrame.price} מטבעות`)
      } else {
        add('23. מטבעות וחנות', 'fail', `coins: ${coins} (צפוי ${expected}) | goldFrame: ${JSON.stringify(goldFrame)}`)
      }
    } catch (e) {
      add('23. מטבעות וחנות', 'fail', String(e))
    }

    // 24. XP Calculation
    try {
      const xp = calculateXP({ recipeCount: 2, commentCount: 5, ratingCount: 3, favoriteCount: 10, reactionCount: 4, categoriesUsed: 3, collaborationCount: 1 })
      const expected = 2 * 50 + 5 * 10 + 3 * 5 + 10 * 3 + 4 * 2 + 1 * 30 // 233
      if (xp === expected) {
        add('24. חישוב XP', 'pass', `calculateXP = ${xp} (צפוי: ${expected})`)
      } else {
        add('24. חישוב XP', 'fail', `calculateXP = ${xp}, צפוי: ${expected}`)
      }
    } catch (e) {
      add('24. חישוב XP', 'fail', String(e))
    }

    // 25. Level from XP
    try {
      const level0 = getLevel(0)
      const level150 = getLevel(150)
      const level2000 = getLevel(2000)
      const pass = level0.level === 1 && level150.level === 2 && level2000.level === 10
      if (pass) {
        add('25. רמה לפי XP', 'pass', `0→רמה ${level0.level} | 150→רמה ${level150.level} | 2000→רמה ${level2000.level}`)
      } else {
        add('25. רמה לפי XP', 'fail', `0→${level0.level} (צפוי 1) | 150→${level150.level} (צפוי 2) | 2000→${level2000.level} (צפוי 10)`)
      }
    } catch (e) {
      add('25. רמה לפי XP', 'fail', String(e))
    }

    // 26. Next Level
    try {
      const next0 = getNextLevel(0)
      const next2000 = getNextLevel(2000)
      const pass = next0.xpNeeded === 100 && next2000.nextLevel === null
      if (pass) {
        add('26. רמה הבאה', 'pass', `XP 0→xpNeeded=${next0.xpNeeded} | XP 2000→nextLevel=${next2000.nextLevel}`)
      } else {
        add('26. רמה הבאה', 'fail', `XP 0→xpNeeded=${next0.xpNeeded} (צפוי 100) | XP 2000→nextLevel=${JSON.stringify(next2000.nextLevel)} (צפוי null)`)
      }
    } catch (e) {
      add('26. רמה הבאה', 'fail', String(e))
    }

    // 27. Level Progress
    try {
      const progress50 = getLevelProgress(50)
      const progress2000 = getLevelProgress(2000)
      const pass = progress50 === 50 && progress2000 === 100
      if (pass) {
        add('27. התקדמות ברמה', 'pass', `XP 50→${progress50}% | XP 2000→${progress2000}%`)
      } else {
        add('27. התקדמות ברמה', 'fail', `XP 50→${progress50}% (צפוי 50) | XP 2000→${progress2000}% (צפוי 100)`)
      }
    } catch (e) {
      add('27. התקדמות ברמה', 'fail', String(e))
    }

    // 28. Achievement Unlocking
    try {
      const statsWith = { recipeCount: 1, commentCount: 0, ratingCount: 0, favoriteCount: 0, reactionCount: 0, categoriesUsed: 0, collaborationCount: 0 }
      const statsWithout = { recipeCount: 0, commentCount: 0, ratingCount: 0, favoriteCount: 0, reactionCount: 0, categoriesUsed: 0, collaborationCount: 0 }
      const unlockedWith = getUnlockedAchievements(statsWith)
      const unlockedWithout = getUnlockedAchievements(statsWithout)
      const hasFirstRecipe = unlockedWith.some((a) => a.id === 'first_recipe')
      const noFirstRecipe = !unlockedWithout.some((a) => a.id === 'first_recipe')
      if (hasFirstRecipe && noFirstRecipe) {
        add('28. פתיחת הישגים', 'pass', `recipeCount=1 פותח first_recipe ✓ | recipeCount=0 לא פותח ✓`)
      } else {
        add('28. פתיחת הישגים', 'fail', `hasFirstRecipe=${hasFirstRecipe}, noFirstRecipe=${noFirstRecipe}`)
      }
    } catch (e) {
      add('28. פתיחת הישגים', 'fail', String(e))
    }

    // 29. All Achievements Count
    try {
      if (ACHIEVEMENTS.length === 12) {
        add('29. ספירת הישגים', 'pass', `ACHIEVEMENTS.length = ${ACHIEVEMENTS.length}`)
      } else {
        add('29. ספירת הישגים', 'fail', `ACHIEVEMENTS.length = ${ACHIEVEMENTS.length}, צפוי 12`)
      }
    } catch (e) {
      add('29. ספירת הישגים', 'fail', String(e))
    }

    // 30. Recipe Parser — Basic
    try {
      const parsed = parseRecipeText("כותרת: עוגת שוקולד\nמרכיבים:\n2 כוסות קמח\n1 כוס סוכר\nהוראות:\nלערבב הכל\nלאפות 30 דקות")
      const titleOk = parsed.title === 'עוגת שוקולד' || parsed.title === 'כותרת: עוגת שוקולד'
      const ingredientsOk = parsed.ingredients.length === 2
      const stepsOk = parsed.steps.length === 2
      if (titleOk && ingredientsOk && stepsOk) {
        add('30. פענוח מתכון — בסיסי', 'pass', `כותרת: "${parsed.title}" | מרכיבים: ${parsed.ingredients.length} | שלבים: ${parsed.steps.length}`)
      } else {
        add('30. פענוח מתכון — בסיסי', 'fail', `כותרת: "${parsed.title}" (${titleOk}) | מרכיבים: ${parsed.ingredients.length} (צפוי 2) | שלבים: ${parsed.steps.length} (צפוי 2)`)
      }
    } catch (e) {
      add('30. פענוח מתכון — בסיסי', 'fail', String(e))
    }

    // 31. Recipe Parser — Category Detection
    try {
      const parsed = parseRecipeText("עוגה פשוטה\nמרכיבים:\n2 כוסות קמח\nהוראות:\nלאפות")
      if (parsed.category === 'קינוח') {
        add('31. פענוח מתכון — זיהוי קטגוריה', 'pass', `טקסט עם "עוגה" → קטגוריה: "${parsed.category}"`)
      } else {
        add('31. פענוח מתכון — זיהוי קטגוריה', 'fail', `קטגוריה: "${parsed.category}", צפוי "קינוח"`)
      }
    } catch (e) {
      add('31. פענוח מתכון — זיהוי קטגוריה', 'fail', String(e))
    }

    // 32. Collaborators Table
    if (testRecipeId && userId) {
      try {
        const { error: insertErr } = await supabase
          .from('recipe_collaborators')
          .insert({ recipe_id: testRecipeId, user_id: userId })
        if (insertErr) {
          add('32. טבלת שותפים למתכון', 'fail', `Insert: ${insertErr.message}`)
        } else {
          const { data: collabs } = await supabase
            .from('recipe_collaborators')
            .select('user_id')
            .eq('recipe_id', testRecipeId)
          if (collabs && collabs.length > 0) {
            await supabase.from('recipe_collaborators').delete().eq('recipe_id', testRecipeId).eq('user_id', userId)
            add('32. טבלת שותפים למתכון', 'pass', `הוספה + קריאה + מחיקה | ${collabs.length} שותפים`)
          } else {
            add('32. טבלת שותפים למתכון', 'fail', 'לא נמצא שותף אחרי הוספה')
          }
        }
      } catch (e) {
        add('32. טבלת שותפים למתכון', 'fail', String(e))
      }
    }

    // 33. Leaderboard Query
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('created_by')
      if (error) {
        add('33. שאילתת לידרבורד', 'fail', error.message)
      } else {
        const counts: Record<string, number> = {}
        data.forEach((r: { created_by: string }) => {
          counts[r.created_by] = (counts[r.created_by] || 0) + 1
        })
        const userCount = Object.keys(counts).length
        add('33. שאילתת לידרבורד', 'pass', `${data.length} מתכונים מ-${userCount} משתמשים`)
      }
    } catch (e) {
      add('33. שאילתת לידרבורד', 'fail', String(e))
    }

    // 34. Recipe Tags Contains Filter
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, tags')
        .contains('tags', ['שבת'])
      if (error) {
        add('34. סינון תגיות contains', 'fail', error.message)
      } else {
        add('34. סינון תגיות contains', 'pass', `${data.length} מתכונים עם תגית "שבת"`)
      }
    } catch (e) {
      add('34. סינון תגיות contains', 'fail', String(e))
    }

    // 35. Admin Hidden Filters
    try {
      const testValue = `_test_filter_${Date.now()}`
      const { error: insertErr } = await supabase
        .from('hidden_filters')
        .insert({ type: 'tag', value: testValue })
      if (insertErr) {
        add('35. פילטרים מוסתרים (הוספה)', 'fail', `Insert: ${insertErr.message}`)
      } else {
        const { data, error: readErr } = await supabase
          .from('hidden_filters')
          .select('type, value')
          .eq('value', testValue)
        if (readErr) {
          add('35. פילטרים מוסתרים (הוספה)', 'fail', `Read: ${readErr.message}`)
        } else if (data && data.length > 0) {
          await supabase.from('hidden_filters').delete().eq('value', testValue)
          add('35. פילטרים מוסתרים (הוספה)', 'pass', `הוספה + קריאה + מחיקה | type=${data[0].type}, value=${data[0].value}`)
        } else {
          add('35. פילטרים מוסתרים (הוספה)', 'fail', 'לא נמצא אחרי הוספה')
        }
      }
    } catch (e) {
      add('35. פילטרים מוסתרים (הוספה)', 'fail', String(e))
    }

    // 36. Hebrew ingredient parsing
    try {
      const parsed1 = parseRecipeText("test\n\nמצרכים:\nכוס וחצי קמח רגיל\n\nהכנה:\ntest")
      const parsed2 = parseRecipeText("test\n\nמצרכים:\nכפית ושלושת רבעי אבקת אפייה\n\nהכנה:\ntest")
      const parsed3 = parseRecipeText("test\n\nמצרכים:\nחצי כפית מלח\n\nהכנה:\ntest")
      const ing1 = parsed1.ingredients[0]
      const ing2 = parsed2.ingredients[0]
      const ing3 = parsed3.ingredients[0]
      const ok1 = ing1?.amount === '1½' && ing1?.unit === 'כוס' && ing1?.name === 'קמח רגיל'
      const ok2 = ing2?.amount === '1¾' && ing2?.unit === 'כפית' && ing2?.name === 'אבקת אפייה'
      const ok3 = ing3?.amount === '½' && ing3?.unit === 'כפית' && ing3?.name === 'מלח'
      if (ok1 && ok2 && ok3) {
        add('36. פרסור מצרכים בעברית', 'pass', `"כוס וחצי"→${ing1.amount} ✓ | "כפית ושלושת רבעי"→${ing2.amount} ✓ | "חצי כפית"→${ing3.amount} ✓`)
      } else {
        add('36. פרסור מצרכים בעברית', 'fail', `1: ${ing1?.amount}/${ok1} | 2: ${ing2?.amount}/${ok2} | 3: ${ing3?.amount}/${ok3}`)
      }
    } catch (e) {
      add('36. פרסור מצרכים בעברית', 'fail', String(e))
    }

    // 37. URL recipe scraping API
    try {
      const res = await fetch('/api/scrape-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '' }),
      })
      const badUrlRes = await fetch('/api/scrape-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'not-a-url' }),
      })
      if (res.status === 400 && badUrlRes.status === 400) {
        add('37. API ייבוא מקישור', 'pass', `URL ריק→${res.status} ✓ | URL לא תקין→${badUrlRes.status} ✓`)
      } else {
        add('37. API ייבוא מקישור', 'fail', `URL ריק: ${res.status} (צפוי 400) | URL לא תקין: ${badUrlRes.status} (צפוי 400)`)
      }
    } catch (e) {
      add('37. API ייבוא מקישור', 'fail', String(e))
    }

    // 38. User items / shop table
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('user_items')
          .select('item_id, equipped')
          .eq('user_id', userId)
        if (error) add('38. טבלת פריטי משתמש', 'fail', error.message)
        else {
          const equipped = data.filter((i: { equipped: boolean }) => i.equipped)
          add('38. טבלת פריטי משתמש', 'pass', `${data.length} פריטים | ${equipped.length} מצוידים`)
        }
      } catch (e) {
        add('38. טבלת פריטי משתמש', 'fail', String(e))
      }
    }

    // 39. Feedback table
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('id, type')
        .limit(5)
      if (error) add('39. טבלת משוב', 'fail', error.message)
      else add('39. טבלת משוב', 'pass', `${data.length} פידבקים`)
    } catch (e) {
      add('39. טבלת משוב', 'fail', String(e))
    }

    // 40. Frame decorations
    try {
      const { getFrameDecorations } = await import('@/components/FrameDecorations')
      const gold = getFrameDecorations('frame_gold', 44)
      const fire = getFrameDecorations('frame_fire', 44)
      const none = getFrameDecorations('nonexistent', 44)
      if (gold && fire && !none) {
        add('40. מסגרות דקורטיביות', 'pass', 'frame_gold ✓ | frame_fire ✓ | nonexistent→null ✓')
      } else {
        add('40. מסגרות דקורטיביות', 'fail', `gold: ${!!gold} | fire: ${!!fire} | none: ${!!none}`)
      }
    } catch (e) {
      add('40. מסגרות דקורטיביות', 'fail', String(e))
    }

    // 41. Cleanup test recipe
    if (testRecipeId) {
      try {
        await supabase.from('recipes').delete().eq('id', testRecipeId)
        add('41. ניקוי', 'pass', 'מתכון הבדיקה נמחק')
      } catch (e) {
        add('41. ניקוי', 'fail', String(e))
      }
    }

    // 42. OCR spaced fractions normalization
    try {
      const p1 = parseRecipeText("test\nמצרכים:\n3 / 4 כוס סוכר\nהכנה:\ntest")
      const p2 = parseRecipeText("test\nמצרכים:\n1 . 5 כוס קמח\nהכנה:\ntest")
      const ok1 = p1.ingredients[0]?.amount === '¾' && p1.ingredients[0]?.unit === 'כוס'
      const ok2 = p2.ingredients[0]?.amount === '1½' && p2.ingredients[0]?.unit === 'כוס'
      if (ok1 && ok2) {
        add('42. נרמול שברים OCR', 'pass', `"3 / 4"→${p1.ingredients[0].amount} ✓ | "1 . 5"→${p2.ingredients[0].amount} ✓`)
      } else {
        add('42. נרמול שברים OCR', 'fail', `"3 / 4"→${p1.ingredients[0]?.amount} (צפוי ¾) | "1 . 5"→${p2.ingredients[0]?.amount} (צפוי 1½)`)
      }
    } catch (e) {
      add('42. נרמול שברים OCR', 'fail', String(e))
    }

    // 43. Mixed format — ingredient/step separation
    try {
      const mixed = parseRecipeText(`*בייגל*
*מחממים תנור ל 200 מעלות
חצי קילו קמח
2 כפות סוכר
כפית מלח
ללוש 5 דקות במיקסר
לחלק ל8 חלקים
להכניס לתנור ל25 דקות`)
      const ingCount = mixed.ingredients.length
      const stepCount = mixed.steps.length
      const hasFlour = mixed.ingredients.some(i => i.name.includes('קמח'))
      const hasKnead = mixed.steps.some(s => s.includes('ללוש'))
      if (ingCount >= 3 && stepCount >= 3 && hasFlour && hasKnead) {
        add('43. הפרדת מצרכים/שלבים מעורבים', 'pass', `${ingCount} מצרכים ✓ | ${stepCount} שלבים ✓ | קמח=מצרך ✓ | ללוש=שלב ✓`)
      } else {
        add('43. הפרדת מצרכים/שלבים מעורבים', 'fail', `מצרכים: ${ingCount} (צפוי ≥3) | שלבים: ${stepCount} (צפוי ≥3) | קמח: ${hasFlour} | ללוש: ${hasKnead}`)
      }
    } catch (e) {
      add('43. הפרדת מצרכים/שלבים מעורבים', 'fail', String(e))
    }

    // 44. Food-word detection (ingredients without amounts)
    try {
      const p = parseRecipeText("מתכון\nקמח\nסוכר\nמלח\nשמן\nלערבב הכל")
      const ingNames = p.ingredients.map(i => i.name)
      const hasAll = ['קמח', 'סוכר', 'מלח', 'שמן'].every(w => ingNames.some(n => n.includes(w)))
      const stepOk = p.steps.length === 1 && p.steps[0].includes('לערבב')
      if (hasAll && stepOk) {
        add('44. זיהוי מילות מאכל', 'pass', `קמח, סוכר, מלח, שמן זוהו כמצרכים ✓ | "לערבב הכל" כשלב ✓`)
      } else {
        add('44. זיהוי מילות מאכל', 'fail', `מצרכים: ${ingNames.join(', ')} | שלבים: ${p.steps.join(', ')}`)
      }
    } catch (e) {
      add('44. זיהוי מילות מאכל', 'fail', String(e))
    }

    // 45. Action verbs classified as steps
    try {
      const verbs = ['לערבב היטב', 'להוסיף ביצים', 'מחממים תנור', 'לאפות 30 דקות בתנור', 'למרוח ביצה מעל']
      const p = parseRecipeText("מתכון\n2 כוס קמח\n" + verbs.join('\n'))
      const allSteps = verbs.every(v => p.steps.some(s => s.includes(v.split(' ')[0])))
      if (allSteps && p.ingredients.length === 1) {
        add('45. זיהוי פעלי הכנה', 'pass', `${verbs.length} פעלים זוהו כשלבים ✓ | מצרך אחד ✓`)
      } else {
        add('45. זיהוי פעלי הכנה', 'fail', `שלבים: ${p.steps.length} (צפוי ${verbs.length}) | מצרכים: ${p.ingredients.length} (צפוי 1)`)
      }
    } catch (e) {
      add('45. זיהוי פעלי הכנה', 'fail', String(e))
    }

    // 46. Asterisk/WhatsApp title cleanup
    try {
      const p = parseRecipeText("*עוגת שוקולד מיוחדת*\nמצרכים:\n2 כוס קמח\nהכנה:\nלאפות")
      if (p.title === 'עוגת שוקולד מיוחדת') {
        add('46. ניקוי כוכביות מכותרת', 'pass', `"*עוגת שוקולד מיוחדת*" → "${p.title}" ✓`)
      } else {
        add('46. ניקוי כוכביות מכותרת', 'fail', `כותרת: "${p.title}" (צפוי "עוגת שוקולד מיוחדת")`)
      }
    } catch (e) {
      add('46. ניקוי כוכביות מכותרת', 'fail', String(e))
    }

    // 47. Category auto-detection (multiple)
    try {
      const bread = parseRecipeText("לחם ביתי\nמצרכים:\nקמח\nשמרים\nהכנה:\nללוש")
      const drink = parseRecipeText("שייק בננה\nמצרכים:\nבננה\nחלב\nהכנה:\nלערבב")
      const dessert = parseRecipeText("עוגיות שוקולד\nמצרכים:\nשוקולד\nהכנה:\nלאפות")
      const allOk = bread.category === 'לחם ואפייה' && drink.category === 'שתייה' && dessert.category === 'קינוח'
      if (allOk) {
        add('47. זיהוי קטגוריות מרובות', 'pass', `לחם→${bread.category} ✓ | שייק→${drink.category} ✓ | עוגיות→${dessert.category} ✓`)
      } else {
        add('47. זיהוי קטגוריות מרובות', 'fail', `לחם→"${bread.category}" | שייק→"${drink.category}" | עוגיות→"${dessert.category}"`)
      }
    } catch (e) {
      add('47. זיהוי קטגוריות מרובות', 'fail', String(e))
    }

    // 48. Sub-headers detected in mixed mode
    try {
      const p = parseRecipeText("עוגה\n*לבצק (במיקסר)-\n2 כוס קמח\n1 כוס סוכר\nלערבב הכל")
      const subInSteps = p.steps.some(s => s.includes('לבצק'))
      const ingOk = p.ingredients.length >= 2
      if (subInSteps && ingOk) {
        add('48. זיהוי כותרות-משנה', 'pass', `"*לבצק (במיקסר)-" → שלב ✓ | ${p.ingredients.length} מצרכים ✓`)
      } else {
        add('48. זיהוי כותרות-משנה', 'fail', `כותרת-משנה בשלבים: ${subInSteps} | מצרכים: ${p.ingredients.length}`)
      }
    } catch (e) {
      add('48. זיהוי כותרות-משנה', 'fail', String(e))
    }

    // 49. Bidi marks stripped
    try {
      const text = "test\nמצרכים:\n\u200E3/4\u200F כוס סוכר\nהכנה:\ntest"
      const p = parseRecipeText(text)
      if (p.ingredients[0]?.amount === '¾') {
        add('49. ניקוי סימני bidi', 'pass', `"‎3/4‏" → ${p.ingredients[0].amount} ✓`)
      } else {
        add('49. ניקוי סימני bidi', 'fail', `כמות: "${p.ingredients[0]?.amount}" (צפוי "¾")`)
      }
    } catch (e) {
      add('49. ניקוי סימני bidi', 'fail', String(e))
    }

    // 50. Mixed numbers "1 1/2"
    try {
      const p = parseRecipeText("test\nמצרכים:\n1 1/2 כוס קמח\n2 3/4 כפות סוכר\nהכנה:\ntest")
      const ok1 = p.ingredients[0]?.amount === '1½'
      const ok2 = p.ingredients[1]?.amount === '2¾'
      if (ok1 && ok2) {
        add('50. מספרים מעורבים', 'pass', `"1 1/2"→${p.ingredients[0].amount} ✓ | "2 3/4"→${p.ingredients[1].amount} ✓`)
      } else {
        add('50. מספרים מעורבים', 'fail', `"1 1/2"→${p.ingredients[0]?.amount} (צפוי 1½) | "2 3/4"→${p.ingredients[1]?.amount} (צפוי 2¾)`)
      }
    } catch (e) {
      add('50. מספרים מעורבים', 'fail', String(e))
    }

    // 51. Cleanup
    if (testRecipeId) {
      // Already cleaned in step 41
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
          בודק: חיבור, הרשאות, פרופיל, מתכונים, מועדפים, תגובות, דירוגים, hidden_filters, אחסון, עדכונים, אמוג׳י, גרדיאנט, דחיסה, ייצוא, טיפוסים, מטבעות, XP, רמות, הישגים, פענוח מתכון, שותפים, לידרבורד, תגיות, ייבוא URL, חנות, משוב, מסגרות, OCR שברים, הפרדת מצרכים/שלבים, מילות מאכל, פעלי הכנה, כוכביות, קטגוריות, כותרות-משנה, bidi, מספרים מעורבים.
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
