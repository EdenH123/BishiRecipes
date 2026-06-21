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

  // Try oEmbed first (TikTok provides caption in title field)
  if (isTikTok) {
    try {
      // Resolve short URL first
      let fullUrl = url
      if (host.includes('vt.tiktok') || host.includes('vm.tiktok')) {
        try {
          const redirectRes = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(5000) })
          fullUrl = redirectRes.url || url
        } catch {}
      }

      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(fullUrl)}`
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) })
      if (res.ok) {
        const data = await res.json()
        // oEmbed title contains the video caption
        const caption = data.title || ''
        const thumbnail = data.thumbnail_url || ''
        const authorName = data.author_name || ''

        if (caption && caption !== 'TikTok - Make Your Day' && caption.length > 10) {
          const parsed = parseRecipeText(caption)
          return {
            title: parsed.title || caption.slice(0, 80),
            description: caption,
            ingredients: parsed.ingredients,
            steps: parsed.steps,
            image_url: thumbnail || null,
            category: parsed.category,
          }
        }
      }
    } catch {}
  }

  // Fallback: fetch HTML and extract meta tags + JSON data
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()

    // Try to find description in multiple places
    const ogDesc = extractMeta(html, 'og:description') || ''
    const twitterDesc = extractMeta(html, 'twitter:description') || ''
    const metaDesc = extractMeta(html, 'description') || ''
    const description = ogDesc || twitterDesc || metaDesc

    const title = extractMeta(html, 'og:title') || extractTitle(html) || 'מתכון מיובא'
    const image = extractMeta(html, 'og:image') || ''

    // Also try to extract from JSON-LD or embedded data
    const jsonMatch = html.match(/"desc"\s*:\s*"([^"]{20,})"/i)
    const embeddedDesc = jsonMatch ? jsonMatch[1].replace(/\\u[\dA-Fa-f]{4}/g, (m) => String.fromCharCode(parseInt(m.slice(2), 16))) : ''

    const bestDescription = description.length > embeddedDesc.length ? description : embeddedDesc

    if (bestDescription.length > 20) {
      const parsed = parseRecipeText(bestDescription)
      return {
        title: parsed.title || title.replace(/TikTok.*$/, '').trim() || 'מתכון מיובא',
        description: bestDescription,
        ingredients: parsed.ingredients,
        steps: parsed.steps,
        image_url: image || null,
        category: parsed.category,
      }
    }

    return {
      title: title.replace(/TikTok.*$/, '').replace(/Instagram.*$/, '').trim() || 'מתכון מיובא',
      description: bestDescription || `מקור: ${url}`,
      image_url: image || null,
      category: 'ארוחת ערב',
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
