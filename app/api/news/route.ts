import { NextResponse } from 'next/server'

function parseRssItems(xmlText: string, defaultSource: string) {
  const items: { title: string; link: string; source: string; pubDate: string }[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  const titleRegex = /<title>([\s\S]*?)<\/title>/
  const linkRegex = /<link>([\s\S]*?)<\/link>/
  const sourceRegex = /<source[^>]*>([\s\S]*?)<\/source>/
  const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/

  let match
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1]

    const titleMatch = titleRegex.exec(itemContent)
    const linkMatch = linkRegex.exec(itemContent)
    const sourceMatch = sourceRegex.exec(itemContent)
    const pubDateMatch = pubDateRegex.exec(itemContent)

    if (titleMatch && linkMatch) {
      const fullTitle = titleMatch[1].trim()
      let cleanTitle = fullTitle
      let sourceName = sourceMatch ? sourceMatch[1].trim() : defaultSource

      if (fullTitle.includes(' - ')) {
        const parts = fullTitle.split(' - ')
        sourceName = parts.pop() || sourceName
        cleanTitle = parts.join(' - ')
      }

      cleanTitle = cleanTitle
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/<!\[CDATA\[|\]\]>/g, '')

      items.push({
        title: cleanTitle,
        link: linkMatch[1].trim(),
        source: sourceName || defaultSource,
        pubDate: pubDateMatch ? pubDateMatch[1].trim() : ''
      })
    }
  }
  return items
}

export async function GET() {
  try {
    const feeds = [
      { url: 'https://news.google.com/rss/search?q=Mundial%202026%22%20OR%20%22Copa%20Mundial%202026%22%20OR%20%22fifa&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
      { url: 'https://www.espn.com/espn/rss/soccer/news', source: 'ESPN' },
    ]

    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        const res = await fetch(feed.url, { next: { revalidate: 300 } })
        if (!res.ok) return []
        const xmlText = await res.text()
        return parseRssItems(xmlText, feed.source)
      })
    )

    const items = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])

    return NextResponse.json({ news: items.slice(0, 40) })
  } catch (error: any) {
    console.error('RSS News Fetch Error:', error)
    return NextResponse.json({ error: 'Failed to fetch news', details: error.message }, { status: 500 })
  }
}
