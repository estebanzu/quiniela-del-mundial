import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [liveRes, allRes] = await Promise.all([
      fetch('https://wcup2026.org/api/data.php?action=live', { next: { revalidate: 0 } }),
      fetch('https://wcup2026.org/api/data.php?action=all', { next: { revalidate: 0 } })
    ])

    const liveData = liveRes.ok ? await liveRes.json() : { matches: [] }
    const allData = allRes.ok ? await allRes.json() : { matches: [] }

    const apiMatches: Record<number, { score: [number, number] | null; status: string }> = {}
    const addMatches = (matches: any[]) => {
      if (!matches) return
      for (const m of matches) {
        if (m && typeof m.id === 'number') {
          apiMatches[m.id] = {
            score: Array.isArray(m.score) && m.score.length === 2 ? (m.score as [number, number]) : null,
            status: m.status || 'pending'
          }
        }
      }
    }

    addMatches(allData.matches)
    addMatches(liveData.matches)

    return NextResponse.json({ success: true, matches: apiMatches })
  } catch (err: any) {
    console.error('CORS wcup proxy error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
