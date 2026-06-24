import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncMatchesFromApi } from '@/lib/sync-matches'

let lastSyncTime = 0
const THROTTLE_MS = 30000

export async function POST(request: Request) {
  try {
    const now = Date.now()
    if (now - lastSyncTime < THROTTLE_MS) {
      return NextResponse.json({
        success: true,
        count: 0,
        throttled: true,
        message: `La sincronización automática está en cooldown (${Math.ceil((THROTTLE_MS - (now - lastSyncTime)) / 1000)}s restantes).`
      })
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No Authorization token provided.' }, { status: 401 })
    }

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const result = await syncMatchesFromApi()

    lastSyncTime = now

    return NextResponse.json({ ...result, throttled: false })
  } catch (err: any) {
    console.error('Sync error caught in API route:', err)
    return NextResponse.json({ error: err.message || 'Error syncing matches.' }, { status: 500 })
  }
}
