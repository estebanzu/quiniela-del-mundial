import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  return await sendReminders(request)
}

export async function POST(request: Request) {
  return await sendReminders(request)
}

async function sendReminders(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')

    // Secure the endpoint if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    )

    const now = new Date()

    // Define time ranges in milliseconds:
    // 2 hours window: matches starting in [now + 1h 45m, now + 2h 15m]
    const start2h = new Date(now.getTime() + 105 * 60 * 1000)
    const end2h = new Date(now.getTime() + 135 * 60 * 1000)

    // 1 hour window: matches starting in [now + 45m, now + 75m]
    const start1h = new Date(now.getTime() + 45 * 60 * 1000)
    const end1h = new Date(now.getTime() + 75 * 60 * 1000)

    // Fetch pending matches starting in the 2h window
    const { data: matches2h, error: mErr2 } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_date')
      .eq('status', 'pending')
      .gte('match_date', start2h.toISOString())
      .lte('match_date', end2h.toISOString())

    // Fetch pending matches starting in the 1h window
    const { data: matches1h, error: mErr1 } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_date')
      .eq('status', 'pending')
      .gte('match_date', start1h.toISOString())
      .lte('match_date', end1h.toISOString())

    if (mErr2 || mErr1) {
      console.error('Error fetching matches:', mErr2 || mErr1)
      throw mErr2 || mErr1
    }

    // List all users in Auth
    const { data: userData, error: usersErr } = await supabase.auth.admin.listUsers()
    if (usersErr) {
      console.error('Error fetching users:', usersErr)
      throw usersErr
    }

    const allUsers = userData?.users || []
    const activeUsers = allUsers.filter(u => 
      u.email && 
      u.email.endsWith('@quiniela.local') && 
      u.email !== 'admin@quiniela.local'
    )

    let notificationsCreated = 0

    const processWindow = async (
      matches: any[],
      type: 'prediction_reminder_2h' | 'prediction_reminder_1h',
      timeLabel: string
    ) => {
      if (!matches || matches.length === 0) return

      for (const match of matches) {
        // Find who has already predicted this match
        const { data: predictions, error: pErr } = await supabase
          .from('predictions')
          .select('user_id')
          .eq('match_id', match.id)

        if (pErr) {
          console.error(`Error fetching predictions for match ${match.id}:`, pErr)
          continue
        }

        const userIdsWithPrediction = new Set(predictions.map(p => p.user_id))

        // Users who have NOT predicted this match yet
        const usersPending = activeUsers.filter(u => !userIdsWithPrediction.has(u.id))

        for (const user of usersPending) {
          // Check if notification already exists for this match, user and type to prevent duplicates
          const { data: existing, error: eErr } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('match_id', match.id)
            .eq('type', type)
            .limit(1)

          if (eErr) {
            console.error('Error checking existing notification:', eErr)
            continue
          }

          if (existing && existing.length > 0) {
            // Already notified for this match at this time window
            continue
          }

          // Insert reminder notification
          const title = `🔮 Pronóstico pendiente: ${match.home_team} vs ${match.away_team}`
          const body = `El partido comienza en ${timeLabel}. ¡Registra tu predicción antes de que se bloquee!`

          const { error: notifErr } = await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type,
              title,
              body,
              match_id: match.id
            })

          if (notifErr) {
            console.error(`Error creating reminder notification for user ${user.id}:`, notifErr)
          } else {
            notificationsCreated++
          }
        }
      }
    }

    // Process both windows
    await processWindow(matches2h || [], 'prediction_reminder_2h', '2 horas')
    await processWindow(matches1h || [], 'prediction_reminder_1h', '1 hora')

    return NextResponse.json({
      success: true,
      notifications_created: notificationsCreated,
      matches_2h: matches2h?.map(m => `${m.home_team} vs ${m.away_team}`) || [],
      matches_1h: matches1h?.map(m => `${m.home_team} vs ${m.away_team}`) || []
    })
  } catch (error: any) {
    console.error('Reminder error:', error)
    return NextResponse.json({ error: error.message || 'Error processing reminders.' }, { status: 500 })
  }
}
