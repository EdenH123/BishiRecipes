import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/recipes/quick — Create recipe with simple API key
//
// No token needed. Uses a secret key + your user ID encoded in it.
// Set RECIPES_API_KEY in Vercel env vars to: "your-secret:your-user-uuid"
//
// Example: RECIPES_API_KEY=mysecret123:4ae5aa9c-4ca3-492b-9c7c-683bc5fae4c7
//
// In Shortcuts, just set header: X-Api-Key: mysecret123:4ae5aa9c-4ca3-492b-9c7c-683bc5fae4c7

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-Api-Key header' }, { status: 401 })
    }

    const serverKey = process.env.RECIPES_API_KEY
    if (!serverKey || apiKey !== serverKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Extract user ID from key (format: "secret:user-uuid")
    const userId = apiKey.split(':').slice(1).join(':')
    if (!userId) {
      return NextResponse.json({ error: 'API key must include user ID (format: secret:uuid)' }, { status: 401 })
    }

    const body = await req.json()

    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const recipeData: Record<string, unknown> = {
      title: body.title.trim(),
      created_by: userId,
    }

    if (body.description) recipeData.description = String(body.description).trim()
    if (Array.isArray(body.ingredients)) recipeData.ingredients = body.ingredients.filter((i: unknown) => typeof i === 'string')
    if (Array.isArray(body.steps)) recipeData.steps = body.steps.filter((s: unknown) => typeof s === 'string')
    if (body.category) recipeData.category = String(body.category).trim()
    if (Array.isArray(body.tags)) recipeData.tags = body.tags.filter((t: unknown) => typeof t === 'string')
    if (typeof body.prep_time === 'number') recipeData.prep_time = body.prep_time
    if (body.image_url) recipeData.image_url = String(body.image_url).trim()

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
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
