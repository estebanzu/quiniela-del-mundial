import { NextResponse } from 'next/server'

const API_URL = 'https://api.football-data.org/v4/matches'

export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY is not configured.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const dateFrom = url.searchParams.get('dateFrom') ?? new Date().toISOString().slice(0, 10)
  const dateTo = url.searchParams.get('dateTo') ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10)

  const response = await fetch(`${API_URL}?status=SCHEDULED&dateFrom=${dateFrom}&dateTo=${dateTo}`, {
    headers: {
      'X-Auth-Token': apiKey,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
