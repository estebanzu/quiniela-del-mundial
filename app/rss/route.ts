import { createClient } from '@supabase/supabase-js'

export const revalidate = 600; // Cache the response for 10 minutes (600 seconds)

const TEAM_FLAGS: Record<string, string> = {
  'Algeria': '🇩🇿',
  'Argentina': '🇦🇷',
  'Australia': '🇦🇺',
  'Austria': '🇦🇹',
  'Belgium': '🇧🇪',
  'Bosnia and Herzegovina': '🇧🇦',
  'Brazil': '🇧🇷',
  'Cabo Verde': '🇨🇻',
  'Canada': '🇨🇦',
  'Colombia': '🇨🇴',
  'Congo DR': '🇨🇩',
  'Croatia': '🇭🇷',
  'Curaçao': '🇨🇼',
  'Czechia': '🇨🇿',
  "Côte d'Ivoire": '🇨🇮',
  "Côte'Ivoire": '🇨🇮',
  'Ecuador': '🇪🇨',
  'Egypt': '🇪🇬',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Ghana': '🇬🇭',
  'Haiti': '🇭🇹',
  'IR Iran': '🇮🇷',
  'Iraq': '🇮🇶',
  'Japan': '🇯🇵',
  'Jordan': '🇯🇴',
  'Korea Republic': '🇰🇷',
  'Mexico': '🇲🇽',
  'Morocco': '🇲🇦',
  'Netherlands': '🇳🇱',
  'New Zealand': '🇳🇿',
  'Norway': '🇳🇴',
  'Panama': '🇵🇦',
  'Paraguay': '🇵🇾',
  'Portugal': '🇵🇹',
  'Qatar': '🇶🇦',
  'Saudi Arabia': '🇸🇦',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Senegal': '🇸🇳',
  'South Africa': '🇿🇦',
  'Spain': '🇪🇸',
  'Sweden': '🇸🇪',
  'Switzerland': '🇨🇭',
  'Tunisia': '🇹🇳',
  'Türkiye': '🇹🇷',
  'USA': '🇺🇸',
  'Uruguay': '🇺🇾',
  'Uzbekistan': '🇺🇿'
};

const TEAM_CODES: Record<string, string> = {
  'Algeria': 'ALG',
  'Argentina': 'ARG',
  'Australia': 'AUS',
  'Austria': 'AUT',
  'Belgium': 'BEL',
  'Bosnia and Herzegovina': 'BIH',
  'Brazil': 'BRA',
  'Cabo Verde': 'CPV',
  'Canada': 'CAN',
  'Colombia': 'COL',
  'Congo DR': 'COD',
  'Croatia': 'CRO',
  'Curaçao': 'CUW',
  'Czechia': 'CZE',
  "Côte d'Ivoire": 'CIV',
  "Côte'Ivoire": 'CIV',
  'Ecuador': 'ECU',
  'Egypt': 'EGY',
  'England': 'ENG',
  'France': 'FRA',
  'Germany': 'GER',
  'Ghana': 'GHA',
  'Haiti': 'HAI',
  'IR Iran': 'IRN',
  'Iraq': 'IRQ',
  'Japan': 'JPN',
  'Jordan': 'JOR',
  'Korea Republic': 'KOR',
  'Mexico': 'MEX',
  'Morocco': 'MAR',
  'Netherlands': 'NED',
  'New Zealand': 'NZL',
  'Norway': 'NOR',
  'Panama': 'PAN',
  'Paraguay': 'PAR',
  'Portugal': 'POR',
  'Qatar': 'QAT',
  'Saudi Arabia': 'KSA',
  'Scotland': 'SCO',
  'Senegal': 'SEN',
  'South Africa': 'RSA',
  'Spain': 'ESP',
  'Sweden': 'SWE',
  'Switzerland': 'SUI',
  'Tunisia': 'TUN',
  'Türkiye': 'TUR',
  'USA': 'USA',
  'Uruguay': 'URU',
  'Uzbekistan': 'UZB'
};

const DB_TEAM_TO_SPANISH: Record<string, string> = {
  'Algeria': 'Argelia',
  'Argentina': 'Argentina',
  'Australia': 'Australia',
  'Austria': 'Austria',
  'Belgium': 'Bélgica',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Brazil': 'Brasil',
  'Cabo Verde': 'Cabo Verde',
  'Canada': 'Canadá',
  'Colombia': 'Colombia',
  'Congo DR': 'R. D. del Congo',
  'Croatia': 'Croacia',
  'Curaçao': 'Curazao',
  'Czechia': 'Chequia',
  "Côte d'Ivoire": 'Costa de Marfil',
  "Côte'Ivoire": 'Costa de Marfil',
  'Ecuador': 'Ecuador',
  'Egypt': 'Egipto',
  'England': 'Inglaterra',
  'France': 'Francia',
  'Germany': 'Alemania',
  'Ghana': 'Ghana',
  'Haiti': 'Haití',
  'IR Iran': 'Irán',
  'Iraq': 'Irak',
  'Japan': 'Japón',
  'Jordan': 'Jordania',
  'Korea Republic': 'Corea del Sur',
  'Mexico': 'México',
  'Morocco': 'Marruecos',
  'Netherlands': 'Países Bajos',
  'New Zealand': 'Nueva Zelanda',
  'Norway': 'Noruega',
  'Panama': 'Panamá',
  'Paraguay': 'Paraguay',
  'Portugal': 'Portugal',
  'Qatar': 'Qatar',
  'Saudi Arabia': 'Arabia Saudita',
  'Scotland': 'Escocia',
  'Senegal': 'Senegal',
  'South Africa': 'Sudáfrica',
  'Spain': 'España',
  'Sweden': 'Suecia',
  'Switzerland': 'Suiza',
  'Tunisia': 'Túnez',
  'Türkiye': 'Turquía',
  'USA': 'EE. UU.',
  'Uruguay': 'Uruguay',
  'Uzbekistan': 'Uzbekistán'
};

const tTeam = (team: string): string => DB_TEAM_TO_SPANISH[team] || team;
const getFlag = (team: string): string => TEAM_FLAGS[team] || '⚽';

const getCode = (team: string): string => {
  if (TEAM_CODES[team]) return TEAM_CODES[team];
  if (team.startsWith('Ganador Partido ')) {
    return `W${team.replace('Ganador Partido ', '')}`;
  }
  if (team.startsWith('Perdedor Partido ')) {
    return `L${team.replace('Perdedor Partido ', '')}`;
  }
  return team.substring(0, 3).toUpperCase();
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Get Costa Rica date (UTC-6)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const formatDate = (d: Date) => new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);

    const todayCR = formatDate(today);
    const yesterdayCR = formatDate(yesterday);

    const startOfLocalYesterday = `${yesterdayCR}T00:00:00-06:00`;
    const endOfLocalToday = `${todayCR}T23:59:59-06:00`;

    // Fetch matches for the last two days
    let { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .gte('match_date', startOfLocalYesterday)
      .lte('match_date', endOfLocalToday)
      .order('match_date', { ascending: true });

    if (error) throw error;

    // Fallback: if no matches in the last two calendar days, find the last two days that had finished matches
    let isFallback = false;
    if (!matches || matches.length === 0) {
      isFallback = true;
      const { data: latestFinished, error: latestErr } = await supabase
        .from('matches')
        .select('match_date')
        .eq('status', 'finished')
        .order('match_date', { ascending: false })
        .limit(1);

      if (!latestErr && latestFinished && latestFinished.length > 0) {
        const latestDate = new Date(latestFinished[0].match_date);
        const prevDate = new Date(latestDate);
        prevDate.setDate(prevDate.getDate() - 1);

        const latestCR = formatDate(latestDate);
        const prevCR = formatDate(prevDate);

        const startOfPrev = `${prevCR}T00:00:00-06:00`;
        const endOfLatest = `${latestCR}T23:59:59-06:00`;

        const { data: fallbackMatches, error: fallbackErr } = await supabase
          .from('matches')
          .select('*')
          .gte('match_date', startOfPrev)
          .lte('match_date', endOfLatest)
          .order('match_date', { ascending: true });

        if (!fallbackErr && fallbackMatches && fallbackMatches.length > 0) {
          matches = fallbackMatches;
        }
      }
    }

    // Secondary fallback: get last 10 matches overall
    if (!matches || matches.length === 0) {
      const { data: last10Matches, error: last10Error } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: false })
        .limit(10);
      matches = last10Matches || [];
    }

    const items = matches.map((match: any) => {
      const homeName = tTeam(match.home_team);
      const awayName = tTeam(match.away_team);
      const homeFlag = getFlag(match.home_team);
      const awayFlag = getFlag(match.away_team);
      const homeCode = getCode(match.home_team);
      const awayCode = getCode(match.away_team);

      const isFinished = match.status === 'finished';
      const scoreText = isFinished ? `${match.home_score} - ${match.away_score}` : 'vs';
      
      // Title format: "bandera1 " # - # "bandera2" (where bandera1 is flag + code, e.g. 🇩🇪 GER)
      const title = isFinished
        ? `${homeFlag} ${homeCode} ${match.home_score} - ${match.away_score} ${awayFlag} ${awayCode}`
        : `${homeFlag} ${homeCode} vs ${awayFlag} ${awayCode}`;

      const kickoffStr = new Date(match.match_date).toLocaleString('es-CR', {
        timeZone: 'America/Costa_Rica',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const htmlDescription = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px; background-color: #ffffff; color: #1e293b;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; background-color: #f1f5f9; padding: 4px 8px; border-radius: 4px;">
              ${match.stage_group || 'Partido'}
            </span>
            <span style="font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 4px; color: ${isFinished ? '#10b981' : '#f59e0b'}; background-color: ${isFinished ? '#d1fae5' : '#fef3c7'}; text-transform: uppercase;">
              ${isFinished ? 'Finalizado' : 'Pendiente'}
            </span>
          </div>
          
          <div style="display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; margin: 20px 0; gap: 8px;">
            <div style="text-align: right; flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
              <span>${homeName}</span>
              <span style="font-size: 24px;">${homeFlag}</span>
            </div>
            
            <div style="background-color: #0f172a; color: #ffffff; padding: 6px 16px; border-radius: 8px; font-weight: 900; font-size: 18px; font-family: monospace; min-width: 60px; text-align: center;">
              ${scoreText}
            </div>
            
            <div style="text-align: left; flex: 1; display: flex; align-items: center; justify-content: flex-start; gap: 8px;">
              <span style="font-size: 24px;">${awayFlag}</span>
              <span>${awayName}</span>
            </div>
          </div>

          <div style="font-size: 12px; color: #475569; text-align: center; margin-top: 16px; border-top: 1px solid #f1f5f9; padding-top: 12px; line-height: 1.6;">
            📍 <strong>Sede:</strong> ${match.venue || 'Estadio del Mundial'}<br/>
            ⏰ <strong>Kickoff (CR):</strong> ${kickoffStr}
          </div>
        </div>
      `;

      return `
        <item>
          <title><![CDATA[${title}]]></title>
          <description><![CDATA[${htmlDescription.trim()}]]></description>
          <link>https://wcup2026.org</link>
          <pubDate>${new Date(match.match_date).toUTCString()}</pubDate>
          <guid isPermaLink="false">${match.id}</guid>
        </item>
      `;
    }).join('');

    const feedTitle = isFallback ? 'Resultados Recientes - Copa Mundial 2026' : `Resultados del Día y Ayer - Copa Mundial 2026`;
    const feedDescription = isFallback ? 'Últimos resultados finalizados de la Copa Mundial 2026' : `Resultados de hoy (${todayCR}) y ayer (${yesterdayCR}) de la Copa Mundial 2026`;

    const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${feedTitle}</title>
    <description>${feedDescription}</description>
    <link>https://wcup2026.org</link>
    <copyright>${new Date().getFullYear()} Quiniela Mundial 2026</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

    return new Response(rssFeed, {
      headers: { 
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300'
      },
    });
  } catch (error: any) {
    console.error("Error generating RSS feed:", error);
    return new Response("Error generating RSS feed", { status: 500 });
  }
}
