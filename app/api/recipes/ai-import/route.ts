import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/recipes/ai-import
//
// Takes a URL, scrapes it, sends to Claude to extract recipe, saves to DB.
// For Apple Shortcuts: just send a URL, get back a recipe.
//
// Headers:
//   Authorization: Bearer <supabase_token>
//   Content-Type: application/json
//
// Body:
//   { "url": "https://www.tiktok.com/..." }
//
// Returns:
//   201: { id, title, description, ingredients, steps, category }

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

    // Get URL
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // Validate
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured (missing ANTHROPIC_API_KEY)' }, { status: 500 })
    }

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

    // Extract all useful text from the page
    const pageTitle = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTitle(html)
    const pageDesc = extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || extractMeta(html, 'description')
    const pageImage = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || ''

    // Also try JSON-LD
    const jsonLdText = extractJsonLdText(html)

    // Build context for Claude
    const extractedText = [
      pageTitle ? `Title: ${pageTitle}` : '',
      pageDesc ? `Description: ${pageDesc}` : '',
      jsonLdText ? `Structured data: ${jsonLdText}` : '',
    ].filter(Boolean).join('\n\n')

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Could not extract any content from URL' }, { status: 422 })
    }

    // Send to Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a recipe parser. Extract the recipe from this social media / website content and return ONLY valid JSON.

Format:
{"title":"recipe name in Hebrew","description":"short description in Hebrew","ingredients":["כמות יחידה מצרך","כמות יחידה מצרך"],"steps":["שלב 1","שלב 2"],"category":"one of: ארוחת בוקר, ארוחת צהריים, ארוחת ערב, קינוח, חטיף, מרק, סלט, לחם ואפייה, שתייה","prep_time":30}

Rules:
- ALL text must be in Hebrew
- Ingredients: each as a single string "amount unit name" in Hebrew
- Steps: clear cooking instructions in Hebrew
- category: pick the best match from the list
- prep_time: estimated total minutes as number
- If some details are missing, make reasonable guesses based on the recipe type
- Return ONLY the JSON object, no markdown, no explanation, no backticks

Source URL: ${url}

Extracted content:
${extractedText}`
      }],
    })

    // Parse Claude's response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    let recipe: {
      title: string
      description: string
      ingredients: string[]
      steps: string[]
      category: string
      prep_time: number
    }

    try {
      // Try to extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      recipe = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({
        error: 'AI could not parse recipe',
        raw_response: responseText.slice(0, 500),
      }, { status: 422 })
    }

    // Validate minimum fields
    if (!recipe.title) recipe.title = pageTitle || 'מתכון מיובא'
    if (!Array.isArray(recipe.ingredients)) recipe.ingredients = []
    if (!Array.isArray(recipe.steps)) recipe.steps = []

    // Save to DB
    const recipeData: Record<string, unknown> = {
      title: recipe.title,
      description: recipe.description || `מקור: ${url}`,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      category: recipe.category || null,
      prep_time: recipe.prep_time || null,
      image_url: pageImage || null,
      created_by: user.id,
    }

    const { data, error } = await supabase
      .from('recipes')
      .insert(recipeData)
      .select('id, title, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ...data,
      source_url: url,
      ingredients_count: recipe.ingredients.length,
      steps_count: recipe.steps.length,
    }, { status: 201 })

  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── Helpers ──

function extractMeta(html: string, property: string): string {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const r1 = new RegExp(`<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i')
  const m1 = html.match(r1)
  if (m1) return decode(m1[1])
  const r2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i')
  const m2 = html.match(r2)
  return m2 ? decode(m2[1]) : ''
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? strip(m[1]) : ''
}

function decode(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function strip(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function extractJsonLdText(html: string): string {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  const parts: string[] = []
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim())
      const text = JSON.stringify(data).slice(0, 2000)
      parts.push(text)
    } catch { continue }
  }
  return parts.join('\n')
}
