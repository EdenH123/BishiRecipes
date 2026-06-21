import { NextRequest, NextResponse } from 'next/server'

// POST /api/auth/token — Get access token (for Apple Shortcuts)
// No SDK — direct Supabase REST call to avoid any hanging issues

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Direct REST call to Supabase Auth — no SDK, no hanging
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10000),
    })

    const data = await res.json()

    if (!res.ok || !data.access_token) {
      return NextResponse.json({ error: data.error_description || data.msg || 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      user_id: data.user?.id,
    })
  } catch {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
