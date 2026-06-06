import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST /api/recipes — Create a recipe via API (for Apple Shortcuts)
//
// Headers:
//   Authorization: Bearer <supabase_access_token>
//   Content-Type: application/json
//
// Body:
//   {
//     "title": "שניצל",
//     "description": "מתכון פשוט",        (optional)
//     "ingredients": ["500 גרם עוף", ...],  (optional, string array)
//     "steps": ["שלב 1", "שלב 2", ...],     (optional, string array)
//     "category": "ארוחת ערב",              (optional)
//     "tags": ["מהיר", "ילדים"],            (optional, string array)
//     "prep_time": 30,                       (optional, minutes)
//     "image_url": "https://..."             (optional)
//   }
//
// Returns:
//   201: { id, title, created_at }
//   400: { error: "..." }
//   401: { error: "Unauthorized" }

export async function POST(req: NextRequest) {
  try {
    // Auth: extract token from Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization header. Use: Bearer <token>' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = createServerSupabaseClient()

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Parse body
    const body = await req.json()

    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Build recipe data
    const recipeData: Record<string, unknown> = {
      title: body.title.trim(),
      created_by: user.id,
    }

    if (body.description && typeof body.description === 'string') {
      recipeData.description = body.description.trim()
    }

    if (Array.isArray(body.ingredients)) {
      recipeData.ingredients = body.ingredients.filter((i: unknown) => typeof i === 'string' && i.trim())
    }

    if (Array.isArray(body.steps)) {
      recipeData.steps = body.steps.filter((s: unknown) => typeof s === 'string' && s.trim())
    }

    if (body.category && typeof body.category === 'string') {
      recipeData.category = body.category.trim()
    }

    if (Array.isArray(body.tags)) {
      recipeData.tags = body.tags.filter((t: unknown) => typeof t === 'string' && t.trim())
    }

    if (typeof body.prep_time === 'number' && body.prep_time > 0) {
      recipeData.prep_time = body.prep_time
    }

    if (body.image_url && typeof body.image_url === 'string') {
      recipeData.image_url = body.image_url.trim()
    }

    // Insert
    const { data, error } = await supabase
      .from('recipes')
      .insert(recipeData)
      .select('id, title, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// GET /api/recipes — List recipes (for Apple Shortcuts)
//
// Headers:
//   Authorization: Bearer <supabase_access_token>
//
// Query params:
//   limit: number (default 10, max 50)
//   search: string (optional, title search)
//
// Returns:
//   200: { recipes: [{ id, title, category, created_at }] }

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 50)
    const search = url.searchParams.get('search')

    let query = supabase
      .from('recipes')
      .select('id, title, category, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recipes: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
