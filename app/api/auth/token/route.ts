import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST /api/auth/token — Get access token (for Apple Shortcuts)
//
// Body:
//   { "email": "...", "password": "..." }
//
// Returns:
//   200: { access_token: "...", expires_in: 3600 }
//   401: { error: "Invalid credentials" }
//
// Usage in Shortcuts:
//   1. Call this once to get token
//   2. Store token in Shortcuts variable
//   3. Use token in Authorization header for /api/recipes

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      expires_in: data.session.expires_in,
      user_id: data.user.id,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
