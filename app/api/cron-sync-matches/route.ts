import { NextResponse } from 'next/server'
import { syncMatchesFromApi } from '@/lib/sync-matches'

export async function GET(request: Request) {
  return handleCronSync(request)
}

export async function POST(request: Request) {
  return handleCronSync(request)
}

async function handleCronSync(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')

    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const result = await syncMatchesFromApi()

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Cron sync error:', err)
    return NextResponse.json({ error: err.message || 'Error sincronizando partidos.' }, { status: 500 })
  }
}
