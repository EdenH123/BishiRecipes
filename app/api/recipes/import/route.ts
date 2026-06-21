import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/recipes/import — Import recipe from URL (TikTok, Instagram, any website)
//
// For Apple Shortcuts: share a URL → recipe is created automatically
//
// Headers:
//   Authorization: Bearer <token>
//   Content-Type: application/json
//
// Body:
//   { "url": "https://www.tiktok.com/..." }
//   OR
//   { "url": "https://www.instagram.com/..." }
//   OR
//   { "url": "https://any-recipe-site.com/..." }
//
// Returns:
//   201: { id, title, description, ingredients, steps, image_url, source_url }
//   400: { error: "..." }
//   401: { error: "Unauthorized" }

function supabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = supabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // Validate URL
    let parsed: URL
    try {
      parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Detect platform
    const host = parsed.hostname.toLowerCase()
    const isTikTok = host.includes('tiktok.com')
    const isInstagram = host.includes('instagram.com')
    const isSocial = isTikTok || isInstagram

    // Fetch page
    let html: string
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch URL (${res.status})` }, { status: 502 })
      }
      html = await res.text()
    } catch {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 502 })
    }

    // Extract data
    let title = ''
    let description = ''
    let imageUrl = ''
    let ingredients: string[] = []
    let steps: string[] = []

    // 1. Try JSON-LD (works for recipe websites)
    const jsonLdResult = extractJsonLd(html)
    if (jsonLdResult) {
      title = jsonLdResult.title
      description = jsonLdResult.description
      imageUrl = jsonLdResult.image
      ingredients = jsonLdResult.ingredients
      steps = jsonLdResult.steps
    }

    // 2. Fallback: OpenGraph / meta tags (works for social media)
    if (!title) {
      title = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTitle(html)
    }
    if (!description) {
      description = extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || extractMeta(html, 'description')
    }
    if (!imageUrl) {
      imageUrl = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || ''
    }

    // 3. For TikTok/Instagram: try to extract caption/description as steps
    if (isSocial && description && steps.length === 0) {
      // Split description into steps by newlines or numbered patterns
      const lines = description
        .split(/\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)

      if (lines.length > 1) {
        steps = lines
      }

      // Try to extract ingredients from description (lines with measurements)
      const ingredientPattern = /\d+[\s/]*(גרם|כוס|כפות|כפית|מ"ל|ק"ג|יחידות?|חבילה|g|kg|ml|cup|tbsp|tsp|oz|lb)/i
      const possibleIngredients = lines.filter(l => ingredientPattern.test(l))
      if (possibleIngredients.length > 0) {
        ingredients = possibleIngredients
        steps = lines.filter(l => !ingredientPattern.test(l))
      }
    }

    // Clean up title (remove platform names)
    title = title
      .replace(/\s*\|\s*TikTok$/i, '')
      .replace(/\s*[-–—]\s*Instagram$/i, '')
      .replace(/\s*on\s+Instagram$/i, '')
      .replace(/\s*\(@[^)]+\)$/i, '')
      .trim()

    if (!title) {
      title = isTikTok ? 'מתכון מ-TikTok' : isInstagram ? 'מתכון מ-Instagram' : 'מתכון מיובא'
    }

    // Create recipe
    const recipeData: Record<string, unknown> = {
      title,
      description: description ? description.slice(0, 2000) : `מקור: ${url}`,
      ingredients,
      steps,
      image_url: imageUrl || null,
      created_by: user.id,
    }

    const { data, error } = await supabase
      .from('recipes')
      .insert(recipeData)
      .select('id, title, description, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ...data,
      source_url: url,
      platform: isTikTok ? 'tiktok' : isInstagram ? 'instagram' : 'website',
      ingredients_found: ingredients.length,
      steps_found: steps.length,
    }, { status: 201 })

  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// ── Helpers ──

function extractMeta(html: string, property: string): string {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex1 = new RegExp(`<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i')
  const match1 = html.match(regex1)
  if (match1) return decodeEntities(match1[1])
  const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i')
  const match2 = html.match(regex2)
  return match2 ? decodeEntities(match2[1]) : ''
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? stripHtml(match[1]).trim() : ''
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
}

function decodeEntities(str: string): string {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
}

function extractJsonLd(html: string): { title: string; description: string; image: string; ingredients: string[]; steps: string[] } | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim())
      const recipe = findRecipe(data)
      if (recipe) return recipe
    } catch { continue }
  }
  return null
}

function findRecipe(data: unknown): { title: string; description: string; image: string; ingredients: string[]; steps: string[] } | null {
  if (!data || typeof data !== 'object') return null
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findRecipe(item)
      if (result) return result
    }
    return null
  }
  const obj = data as Record<string, unknown>
  if (obj['@graph'] && Array.isArray(obj['@graph'])) return findRecipe(obj['@graph'])
  const type = String(obj['@type'] || '')
  if (!type.toLowerCase().includes('recipe')) return null

  const title = String(obj.name || '')
  const description = String(obj.description || '')
  let image = ''
  if (typeof obj.image === 'string') image = obj.image
  else if (Array.isArray(obj.image) && obj.image.length > 0) {
    image = typeof obj.image[0] === 'string' ? obj.image[0] : String((obj.image[0] as Record<string, unknown>)?.url || '')
  }

  const rawIngredients = obj.recipeIngredient || obj.ingredients || []
  const ingredients = Array.isArray(rawIngredients) ? rawIngredients.map((i: unknown) => stripHtml(String(i))) : []

  let steps: string[] = []
  const rawInstructions = obj.recipeInstructions
  if (typeof rawInstructions === 'string') {
    steps = rawInstructions.split(/\n+/).map(s => stripHtml(s).trim()).filter(Boolean)
  } else if (Array.isArray(rawInstructions)) {
    for (const step of rawInstructions) {
      if (typeof step === 'string') steps.push(stripHtml(step).trim())
      else if (step && typeof step === 'object') {
        const s = step as Record<string, unknown>
        steps.push(stripHtml(String(s.text || s.name || '')).trim())
      }
    }
  }
  steps = steps.filter(Boolean)

  return { title, description, image, ingredients, steps }
}
