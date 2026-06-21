import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/recipes/quick — Create recipe with secret key (no auth token needed)
//
// For Apple Shortcuts — simple, no login flow required.
//
// Headers:
//   X-Api-Key: <your secret key from env>
//   Content-Type: application/json
//
// Body: same as /api/recipes
//   { title, description?, ingredients?[], steps?[], category?, tags?[], prep_time? }

const API_KEY = process.env.RECIPES_API_KEY || 'bishi-secret-2026'

export async function POST(req: NextRequest) {
  try {
    // Simple API key auth
    const key = req.headers.get('x-api-key')
    if (!key || key !== API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const body = await req.json()

    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Use service role or anon key to insert
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Get first admin user as the creator
    const { data: admin } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .limit(1)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'No admin user found' }, { status: 500 })
    }

    const recipeData: Record<string, unknown> = {
      title: body.title.trim(),
      created_by: admin.id,
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
