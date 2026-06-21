import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/recipes/quick — Create recipe from plain text or JSON
//
// Accepts EITHER:
//   A) JSON: {"title":"...","ingredients":[...],"steps":[...]}
//   B) Plain text in this format:
//      Title
//      Ingredients
//      - item 1
//      - item 2
//      ### Steps
//      1. step 1
//      2. step 2
//
// Headers:
//   X-Api-Key: <user's permanent api key>
//   Content-Type: application/json OR text/plain

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function parseRecipeText(text: string): { title: string; description: string; ingredients: string[]; steps: string[]; category: string } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  let title = ''
  const ingredients: string[] = []
  const steps: string[] = []
  let section: 'title' | 'ingredients' | 'steps' = 'title'

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Detect section headers
    if (lower === 'ingredients' || lower === 'מצרכים' || lower.includes('### ingredients') || lower.includes('### מצרכים')) {
      section = 'ingredients'
      continue
    }
    if (lower.startsWith('### steps') || lower.startsWith('### שלבים') || lower === 'steps' || lower === 'שלבי הכנה' || lower === 'הוראות הכנה') {
      section = 'steps'
      continue
    }
    if (lower.startsWith('link:') || lower.startsWith('מקור:')) {
      continue // skip source links
    }

    if (section === 'title' && !title) {
      title = line.replace(/^#+\s*/, '')  // remove markdown headers
      section = 'ingredients' // assume next section is ingredients
      continue
    }

    if (section === 'ingredients') {
      // Remove bullet points, dashes, asterisks
      const clean = line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim()
      if (clean) ingredients.push(clean)
    }

    if (section === 'steps') {
      // Remove numbering
      const clean = line.replace(/^\d+[\.\)]\s*/, '').trim()
      if (clean) steps.push(clean)
    }
  }

  // Guess category
  const allText = (title + ' ' + ingredients.join(' ')).toLowerCase()
  let category = 'ארוחת ערב'
  if (allText.includes('עוגה') || allText.includes('עוגיות') || allText.includes('שוקולד') || allText.includes('קרם')) category = 'קינוח'
  else if (allText.includes('שייק') || allText.includes('מיץ') || allText.includes('סמוזי')) category = 'שתייה'
  else if (allText.includes('סלט')) category = 'סלט'
  else if (allText.includes('מרק')) category = 'מרק'
  else if (allText.includes('לחם') || allText.includes('חלה') || allText.includes('פיתה')) category = 'לחם ואפייה'

  return { title: title || 'מתכון מיובא', description: '', ingredients, steps, category }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-Api-Key header' }, { status: 401 })
    }

    const supabase = getSupabase()

    // Look up user by API key
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('api_key', apiKey)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Try to parse as JSON first, fall back to plain text
    const contentType = req.headers.get('content-type') || ''
    const rawBody = await req.text()

    let recipeData: Record<string, unknown>

    // Try JSON parse
    try {
      const json = JSON.parse(rawBody)
      if (json.title) {
        recipeData = {
          title: String(json.title).trim(),
          created_by: profile.id,
        }
        if (json.description) recipeData.description = String(json.description).trim()
        if (Array.isArray(json.ingredients)) recipeData.ingredients = json.ingredients.filter((i: unknown) => typeof i === 'string')
        if (Array.isArray(json.steps)) recipeData.steps = json.steps.filter((s: unknown) => typeof s === 'string')
        if (json.category) recipeData.category = String(json.category).trim()
        if (Array.isArray(json.tags)) recipeData.tags = json.tags.filter((t: unknown) => typeof t === 'string')
        if (typeof json.prep_time === 'number') recipeData.prep_time = json.prep_time
        if (json.image_url) recipeData.image_url = String(json.image_url).trim()
      } else {
        throw new Error('no title in JSON')
      }
    } catch {
      // Parse as plain text
      if (!rawBody.trim()) {
        return NextResponse.json({ error: 'Empty body' }, { status: 400 })
      }
      const parsed = parseRecipeText(rawBody)
      recipeData = {
        title: parsed.title,
        description: parsed.description,
        ingredients: parsed.ingredients,
        steps: parsed.steps,
        category: parsed.category,
        created_by: profile.id,
      }
    }

    if (!recipeData.title) {
      return NextResponse.json({ error: 'Could not find recipe title' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('recipes')
      .insert(recipeData)
      .select('id, title, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, ...data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
