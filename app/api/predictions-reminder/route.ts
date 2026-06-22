import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const isVapidConfigured = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

if (isVapidConfigured) {
  webpush.setVapidDetails(
    'mailto:admin@quiniela.local',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

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

    // 30 minutes window: matches starting in [now + 20m, now + 40m]
    const start30m = new Date(now.getTime() + 20 * 60 * 1000)
    const end30m = new Date(now.getTime() + 40 * 60 * 1000)

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

    // Fetch pending matches starting in the 30m window
    const { data: matches30m, error: mErr30 } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_date')
      .eq('status', 'pending')
      .gte('match_date', start30m.toISOString())
      .lte('match_date', end30m.toISOString())

    if (mErr2 || mErr1 || mErr30) {
      console.error('Error fetching matches:', mErr2 || mErr1 || mErr30)
      throw (mErr2 || mErr1 || mErr30)
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
      type: 'prediction_reminder_2h' | 'prediction_reminder_1h' | 'prediction_reminder_30m',
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

        // Determine target users for this window:
        // - For 30m window: We notify everyone so they can optionally change their prediction.
        // - For 1h & 2h windows: We only notify users who have NOT predicted yet.
        const is30m = type === 'prediction_reminder_30m'
        const targetUsers = is30m ? activeUsers : activeUsers.filter(u => !userIdsWithPrediction.has(u.id))

        for (const user of targetUsers) {
          const hasPredicted = userIdsWithPrediction.has(user.id)

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

          // Determine specific title and body
          let title = ''
          let body = ''

          if (is30m) {
            if (hasPredicted) {
              title = '⏰ ¡Solo 30 minutos!'
              body = `El próximo partido ${match.home_team} vs ${match.away_team} está a 30 mins de iniciar por si quieres cambiar tu predicción.`
            } else {
              title = '🔮 Pronóstico urgente'
              body = `El partido ${match.home_team} vs ${match.away_team} está a 30 mins de iniciar y no has registrado tu pronóstico. ¡Llene sus predicciones!`
            }
          } else {
            title = `🔮 Pronóstico pendiente: ${match.home_team} vs ${match.away_team}`
            body = `El partido comienza en ${timeLabel}. ¡Llene sus predicciones antes de que se bloquee!`
          }

          // Insert database notification
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
            continue
          }

          notificationsCreated++

          // Dispatch Web Push notification to client device(s)
          if (isVapidConfigured) {
            const { data: subs, error: subsError } = await supabase
              .from('push_subscriptions')
              .select('endpoint, p256dh, auth')
              .eq('user_id', user.id)

            if (subsError) {
              console.error(`Error fetching push subscriptions for user ${user.id}:`, subsError)
              continue
            }

            if (subs && subs.length > 0) {
              const pushPayload = JSON.stringify({
                title,
                body,
                data: {
                  url: '/'
                }
              })

              for (const sub of subs) {
                try {
                  await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                      p256dh: sub.p256dh,
                      auth: sub.auth
                    }
                  }, pushPayload)
                } catch (pushErr: any) {
                  console.error(`Failed to send web push to ${sub.endpoint}:`, pushErr.message)
                  // Auto-delete expired/invalid subscription tokens (Gone 410 or NotFound 404)
                  if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                    await supabase
                      .from('push_subscriptions')
                      .delete()
                      .eq('endpoint', sub.endpoint)
                  }
                }
              }
            }
          }
        }
      }
    }

    // Process all windows
    await processWindow(matches2h || [], 'prediction_reminder_2h', '2 horas')
    await processWindow(matches1h || [], 'prediction_reminder_1h', '1 hora')
    await processWindow(matches30m || [], 'prediction_reminder_30m', '30 minutos')

    return NextResponse.json({
      success: true,
      notifications_created: notificationsCreated,
      matches_2h: matches2h?.map(m => `${m.home_team} vs ${m.away_team}`) || [],
      matches_1h: matches1h?.map(m => `${m.home_team} vs ${m.away_team}`) || [],
      matches_30m: matches30m?.map(m => `${m.home_team} vs ${m.away_team}`) || []
    })
  } catch (error: any) {
    console.error('Reminder error:', error)
    return NextResponse.json({ error: error.message || 'Error processing reminders.' }, { status: 500 })
  }
}
