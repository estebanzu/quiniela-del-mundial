export const revalidate = 3600; // Cache the response for 1 hour (3600 seconds)

export async function GET() {
  try {
    // Fetch data from the API
    const response = await fetch("https://wcup2026.org/api/data.php?action=today");

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data = await response.json();

    // Map the API data to RSS feed items.
    const items = data.map((match: any) => {
      // Construct an HTML string for the description. 
      // Update the property names (homeTeam, awayTeam, imageUrl) based on the actual API response.
      const htmlDescription = `
        <div>
          <h3><strong>${match.homeTeam || 'Home Team'}</strong> ${match.homeScore || 0} - ${match.awayScore || 0} <strong>${match.awayTeam || 'Away Team'}</strong></h3>
          ${match.imageUrl ? `<img src="${match.imageUrl}" alt="Match Image" style="max-width: 100%; height: auto;" />` : ''}
          <p>${match.description || 'Match details and updates.'}</p>
          <p><em>Status: ${match.status || 'Finished'}</em></p>
        </div>
      `;

      return `
        <item>
          <title><![CDATA[${match.title || 'World Cup Match Update'}]]></title>
          <description><![CDATA[${htmlDescription.trim()}]]></description>
          <link>https://wcup2026.org</link>
          <pubDate>${new Date().toUTCString()}</pubDate>
          <guid isPermaLink="false">${match.id || Math.random().toString(36).substring(7)}</guid>
        </item>
      `;
    }).join('');

    // Construct the final XML
    const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>World Cup 2026 - Today's Matches</title>
    <description>Daily match updates and results for the 2026 World Cup.</description>
    <link>https://wcup2026.org</link>
    <copyright>${new Date().getFullYear()} World Cup 2026</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

    return new Response(rssFeed, {
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    return new Response("Error generating RSS feed", { status: 500 });
  }
}