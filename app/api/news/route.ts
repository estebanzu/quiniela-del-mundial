import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const rssUrl = 'https://news.google.com/rss/search?q=Mundial%202026%22%20OR%20%22Copa%20Mundial%202026%22%20OR%20%22fifa&hl=en-US&gl=US&ceid=US:en'
    const res = await fetch(rssUrl, {
      next: { revalidate: 300 } // Cache for 5 minutes
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch RSS feed: ${res.statusText}`)
    }

    const xmlText = await res.text()

    // Simple RegExp XML parser for RSS items
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
        // Clean up title (Google News titles end with " - Source Name")
        const fullTitle = titleMatch[1].trim()
        let cleanTitle = fullTitle
        let sourceName = sourceMatch ? sourceMatch[1].trim() : ''
        
        if (fullTitle.includes(' - ')) {
          const parts = fullTitle.split(' - ')
          sourceName = parts.pop() || sourceName
          cleanTitle = parts.join(' - ')
        }

        // Decode XML entities commonly found in titles
        cleanTitle = cleanTitle
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'")

        items.push({
          title: cleanTitle,
          link: linkMatch[1].trim(),
          source: sourceName,
          pubDate: pubDateMatch ? pubDateMatch[1].trim() : ''
        })
      }
    }

    return NextResponse.json({ news: items.slice(0, 30) })
  } catch (error: any) {
    console.error('RSS News Fetch Error:', error)
    return NextResponse.json({ error: 'Failed to fetch news', details: error.message }, { status: 500 })
  }
}
