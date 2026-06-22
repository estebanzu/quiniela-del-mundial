import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // 1. Auth verification: make sure a logged-in user is triggering the action
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

    const body = await request.json()
    const { subscription, action = 'subscribe' } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription data.' }, { status: 400 })
    }

    // Initialize Supabase service role client to manage subscriptions table
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    if (action === 'unsubscribe') {
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Error deleting push subscription:', deleteError)
        return NextResponse.json({ error: 'Failed to delete subscription.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Unsubscribed successfully.' })
    }

    // Otherwise, register subscription
    const p256dh = subscription.keys?.p256dh
    const auth = subscription.keys?.auth

    if (!p256dh || !auth) {
      return NextResponse.json({ error: 'Subscription keys (p256dh/auth) are missing.' }, { status: 400 })
    }

    // Insert or update on conflict (endpoint is unique)
    const { error: upsertError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: p256dh,
        auth: auth,
        created_at: new Date().toISOString()
      }, { onConflict: 'endpoint' })

    if (upsertError) {
      console.error('Error saving push subscription:', upsertError)
      return NextResponse.json({ error: 'Failed to save push subscription.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully.' })
  } catch (err: any) {
    console.error('Push subscribe endpoint error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 })
  }
}
