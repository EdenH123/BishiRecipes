import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/recipes/quick
//
// Accepts 3 formats:
//   A) JSON body: {"title":"...","ingredients":[...],"steps":[...]}
//   B) Plain text: title + ingredients + steps
//   C) URL mode: {"url":"https://tiktok.com/..."} — server fetches & parses
//
// Headers:
//   X-Api-Key: <user's permanent api key>

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-Api-Key header' }, { status: 401 })
    }

    const supabase = getSupabase()

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('api_key', apiKey)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const rawBody = await req.text()
    let recipeData: Record<string, unknown>

    // Try JSON parse
    try {
      const json = JSON.parse(rawBody)

      // URL mode — fetch and parse server-side
      if (json.url && !json.title) {
        const result = await fetchAndParseUrl(json.url)
        recipeData = { ...result, created_by: profile.id }
      } else if (json.title) {
        // Direct JSON recipe
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
        throw new Error('no title or url')
      }
    } catch (jsonErr) {
      // Plain text mode
      if (!rawBody.trim()) {
        return NextResponse.json({ error: 'Empty body' }, { status: 400 })
      }
      const parsed = parseRecipeText(rawBody)
      recipeData = { ...parsed, created_by: profile.id }
    }

    if (!recipeData.title) {
      return NextResponse.json({ error: 'Could not extract recipe' }, { status: 400 })
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

// ── Fetch URL and extract recipe from meta tags ──

async function fetchAndParseUrl(url: string): Promise<Record<string, unknown>> {
  const host = new URL(url).hostname.toLowerCase()
  const isTikTok = host.includes('tiktok.com')
  const isInstagram = host.includes('instagram.com')

  // Try oEmbed first (TikTok/Instagram provide this for free)
  if (isTikTok) {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) })
      if (res.ok) {
        const data = await res.json()
        if (data.title) {
          const parsed = parseRecipeText(data.title)
          return {
            title: parsed.title || data.title.slice(0, 100),
            description: data.title,
            ingredients: parsed.ingredients,
            steps: parsed.steps,
            image_url: data.thumbnail_url || null,
            category: parsed.category,
          }
        }
      }
    } catch {}
  }

  // Fallback: fetch HTML and extract meta tags
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()

    const title = extractMeta(html, 'og:title') || extractTitle(html) || 'מתכון מיובא'
    const description = extractMeta(html, 'og:description') || ''
    const image = extractMeta(html, 'og:image') || ''

    // Try to parse description as recipe
    const parsed = description ? parseRecipeText(title + '\n' + description) : { title, description: '', ingredients: [] as string[], steps: [] as string[], category: 'ארוחת ערב' }

    return {
      title: parsed.title || title,
      description: description || `מקור: ${url}`,
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      image_url: image || null,
      category: parsed.category,
    }
  } catch {
    return { title: 'מתכון מיובא', description: `מקור: ${url}` }
  }
}

// ── Parse plain text recipe ──

function parseRecipeText(text: string): { title: string; description: string; ingredients: string[]; steps: string[]; category: string } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let title = ''
  const ingredients: string[] = []
  const steps: string[] = []
  let section: 'title' | 'ingredients' | 'steps' = 'title'

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower === 'ingredients' || lower === 'מצרכים' || lower.includes('### ingredients') || lower.includes('### מצרכים')) { section = 'ingredients'; continue }
    if (lower.startsWith('### steps') || lower.startsWith('### שלבים') || lower === 'steps' || lower === 'שלבי הכנה' || lower === 'הוראות הכנה') { section = 'steps'; continue }
    if (lower.startsWith('link:') || lower.startsWith('מקור:')) continue

    if (section === 'title' && !title) { title = line.replace(/^#+\s*/, ''); section = 'ingredients'; continue }
    if (section === 'ingredients') { const c = line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim(); if (c) ingredients.push(c) }
    if (section === 'steps') { const c = line.replace(/^\d+[\.\)]\s*/, '').trim(); if (c) steps.push(c) }
  }

  const allText = (title + ' ' + ingredients.join(' ')).toLowerCase()
  let category = 'ארוחת ערב'
  if (allText.match(/עוגה|עוגיות|שוקולד|קרם|עוגת/)) category = 'קינוח'
  else if (allText.match(/שייק|מיץ|סמוזי/)) category = 'שתייה'
  else if (allText.includes('סלט')) category = 'סלט'
  else if (allText.includes('מרק')) category = 'מרק'
  else if (allText.match(/לחם|חלה|פיתה|בייגל/)) category = 'לחם ואפייה'

  return { title: title || 'מתכון מיובא', description: '', ingredients, steps, category }
}

// ── HTML helpers ──

function extractMeta(html: string, property: string): string {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const r1 = new RegExp(`<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i')
  const m1 = html.match(r1)
  if (m1) return m1[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  const r2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i')
  const m2 = html.match(r2)
  return m2 ? m2[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"') : ''
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : ''
}
