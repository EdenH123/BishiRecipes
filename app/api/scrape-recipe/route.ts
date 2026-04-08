import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter: max 10 requests per minute per IP
import { SCRAPE_RATE_LIMIT, SCRAPE_RATE_WINDOW_MS, SCRAPE_TIMEOUT_MS } from '@/lib/constants'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + SCRAPE_RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= SCRAPE_RATE_LIMIT) return false
  entry.count++
  return true
}

interface ScrapedRecipe {
  title: string
  description: string
  ingredients: string[]
  steps: string[]
  image: string
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 })
    }

    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
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

    // Fetch the page
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeScraper/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'he,en;q=0.9',
      },
      signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${res.status}` }, { status: 502 })
    }

    const html = await res.text()
    const recipe = extractRecipe(html)

    if (!recipe.title && recipe.ingredients.length === 0 && recipe.steps.length === 0) {
      return NextResponse.json({ error: 'Could not find recipe data on this page' }, { status: 422 })
    }

    return NextResponse.json(recipe)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function extractRecipe(html: string): ScrapedRecipe {
  // 1. Try JSON-LD structured data (most recipe sites use this)
  const jsonLd = extractJsonLd(html)
  if (jsonLd) return jsonLd

  // 2. Fallback: parse HTML content
  return extractFromHtml(html)
}

function extractJsonLd(html: string): ScrapedRecipe | null {
  // Find all <script type="application/ld+json"> blocks
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim())
      const recipe = findRecipeInLd(data)
      if (recipe) return recipe
    } catch {
      continue
    }
  }
  return null
}

/** Split raw step text (before stripHtml) into individual steps, handling newlines, numbered lists, and Hebrew sentences. */
function splitRawSteps(raw: string): string[] {
  if (!raw || !raw.trim()) return []

  // Split by newlines first (before stripHtml collapses them)
  const lines = raw.split(/\n+/).map(s => stripHtml(s).trim()).filter(Boolean)

  // Then further split each line by numbered patterns or Hebrew sentence boundaries
  const result: string[] = []
  for (const line of lines) {
    result.push(...splitSingleStep(line))
  }
  return result.filter(Boolean)
}

/** Split a single step string that may contain multiple numbered steps. */
function splitSingleStep(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  // Try splitting on numbered patterns like "1. ... 2. ... 3. ..."
  const numberedParts = trimmed.split(/(?:^|\s)(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean)
  if (numberedParts.length > 1) {
    return numberedParts.map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
  }

  // For long text, try splitting on Hebrew sentence boundaries (period + space + Hebrew letter)
  if (trimmed.length > 80) {
    const sentences = trimmed.split(/(?<=\.)\s+(?=[א-ת])/).filter(s => s.trim().length > 0)
    if (sentences.length > 1) return sentences.map(s => s.trim())
  }

  return [trimmed]
}

function findRecipeInLd(data: unknown): ScrapedRecipe | null {
  if (!data || typeof data !== 'object') return null

  // Handle arrays (e.g., @graph)
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findRecipeInLd(item)
      if (result) return result
    }
    return null
  }

  const obj = data as Record<string, unknown>

  // Check @graph
  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      const result = findRecipeInLd(item)
      if (result) return result
    }
  }

  // Check if this is a Recipe type
  const type = obj['@type']
  const isRecipe =
    type === 'Recipe' ||
    (Array.isArray(type) && type.includes('Recipe'))

  if (!isRecipe) return null

  const title = String(obj.name || '')
  const description = String(obj.description || '')

  // Parse ingredients
  const rawIngredients = obj.recipeIngredient || obj.ingredients || []
  const ingredients = Array.isArray(rawIngredients)
    ? rawIngredients.map((i: unknown) => stripHtml(String(i)))
    : []

  // Parse steps
  let steps: string[] = []
  const rawInstructions = obj.recipeInstructions
  if (typeof rawInstructions === 'string') {
    steps = splitRawSteps(rawInstructions)
  } else if (Array.isArray(rawInstructions)) {
    for (const step of rawInstructions) {
      if (typeof step === 'string') {
        steps.push(...splitRawSteps(step))
      } else if (step && typeof step === 'object') {
        const s = step as Record<string, unknown>
        if (s['@type'] === 'HowToSection' && Array.isArray(s.itemListElement)) {
          for (const subStep of s.itemListElement) {
            if (subStep && typeof subStep === 'object') {
              steps.push(stripHtml(String((subStep as Record<string, unknown>).text || '')).trim())
            }
          }
        } else {
          steps.push(stripHtml(String(s.text || s.name || '')).trim())
        }
      }
    }
  }
  steps = steps.filter(Boolean)

  // Image
  let image = ''
  if (typeof obj.image === 'string') {
    image = obj.image
  } else if (Array.isArray(obj.image) && obj.image.length > 0) {
    image = typeof obj.image[0] === 'string' ? obj.image[0] : String((obj.image[0] as Record<string, unknown>)?.url || '')
  } else if (obj.image && typeof obj.image === 'object') {
    image = String((obj.image as Record<string, unknown>).url || '')
  }

  return { title, description, ingredients, steps, image }
}

function extractFromHtml(html: string): ScrapedRecipe {
  const title = extractMetaTag(html, 'og:title') || extractTitle(html)
  const description = extractMetaTag(html, 'og:description') || ''
  const image = extractMetaTag(html, 'og:image') || ''

  // Get text content, try to find recipe sections
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')

  // Look for ingredient lists
  const ingredients: string[] = []
  const ingredientListRegex = /<(?:ul|ol)[^>]*class="[^"]*ingredient[^"]*"[^>]*>([\s\S]*?)<\/(?:ul|ol)>/gi
  let listMatch
  while ((listMatch = ingredientListRegex.exec(body)) !== null) {
    const items = listMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
    for (const item of items) {
      const text = stripHtml(item).trim()
      if (text) ingredients.push(text)
    }
  }

  // Look for instruction lists
  const steps: string[] = []
  const stepsListRegex = /<(?:ul|ol)[^>]*class="[^"]*(?:instruction|direction|step|preparation)[^"]*"[^>]*>([\s\S]*?)<\/(?:ul|ol)>/gi
  while ((listMatch = stepsListRegex.exec(body)) !== null) {
    const items = listMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
    for (const item of items) {
      const text = stripHtml(item).trim()
      if (text) steps.push(text)
    }
  }

  return { title, description, ingredients, steps, image }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractMetaTag(html: string, property: string): string {
  const escaped = escapeRegex(property)
  const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i')
  const match = html.match(regex)
  if (match) return match[1]
  // Try reversed attribute order
  const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i')
  const match2 = html.match(regex2)
  return match2 ? match2[1] : ''
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? stripHtml(match[1]).trim() : ''
}
