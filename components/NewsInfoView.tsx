'use client'

import { useEffect, useState } from 'react'

interface NewsItem {
  title: string
  link: string
  source: string
  pubDate: string
}

interface Stadium {
  id: string
  name: string
  city: string
  state: string
  country: 'USA' | 'Mexico' | 'Canada'
  flag: string
  capacity: string
  matches: string
  facts: string[]
  x: number
  y: number
}

const STADIUMS_DATA: Stadium[] = [
  {
    id: 'azteca',
    name: 'Estadio Azteca',
    city: 'Ciudad de México',
    state: 'CDMX',
    country: 'Mexico',
    flag: '🇲🇽',
    capacity: '87,523',
    matches: 'Partido Inaugural, Fase de Grupos, 16avos y Octavos de final',
    facts: [
      'Primer estadio en albergar tres Copas del Mundo (1970, 1986, 2026).',
      'Sede del famoso "Gol del Siglo" y la "Mano de Dios" de Diego Maradona en 1986.',
      'Ubicado a 2,240 metros sobre el nivel del mar.'
    ],
    x: 328,
    y: 395
  },
  {
    id: 'metlife',
    name: 'MetLife Stadium',
    city: 'Nueva York / Nueva Jersey',
    state: 'New Jersey',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '82,500',
    matches: 'Gran Final, Fase de Grupos, 16avos, Octavos y Semifinal',
    facts: [
      'Sede elegida para la Gran Final de la Copa del Mundo el 19 de julio de 2026.',
      'Estadio sin techo más costoso de construir en los EE.UU.',
      'Hogar de los New York Giants y New York Jets de la NFL.'
    ],
    x: 630,
    y: 190
  },
  {
    id: 'att',
    name: 'AT&T Stadium',
    city: 'Dallas',
    state: 'Texas',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '80,000',
    matches: 'Fase de Grupos, 16avos, Octavos y Semifinal',
    facts: [
      'Cuenta con una de las pantallas de video suspendidas más grandes del planeta.',
      'Su techo retráctil se puede abrir o cerrar en solo 12 minutos.',
      'Conocido popularmente como "Jerry World" por el dueño de los Dallas Cowboys.'
    ],
    x: 390,
    y: 290
  },
  {
    id: 'arrowhead',
    name: 'Arrowhead Stadium',
    city: 'Kansas City',
    state: 'Missouri',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '76,416',
    matches: 'Fase de Grupos, 16avos y Cuartos de final',
    facts: [
      'Tiene el Récord Guinness del estadio abierto más ruidoso del mundo (142.2 dB).',
      'Famoso por su cultura de asados (tailgating) en los estacionamientos.',
      'Inaugurado en 1972 y remodelado extensamente.'
    ],
    x: 410,
    y: 230
  },
  {
    id: 'nrg',
    name: 'NRG Stadium',
    city: 'Houston',
    state: 'Texas',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '72,220',
    matches: 'Fase de Grupos, 16avos y Octavos de final',
    facts: [
      'Primer estadio de la NFL con techo retráctil.',
      'Alberga anualmente el Rodeo de Houston, el más grande del mundo.',
      'Ha sido sede de dos Super Bowls (XXXVIII y LI).'
    ],
    x: 395,
    y: 330
  },
  {
    id: 'mercedes',
    name: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
    state: 'Georgia',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '71,000',
    matches: 'Fase de Grupos, 16avos, Octavos y Semifinal',
    facts: [
      'Su techo retráctil tiene un diseño único inspirado en un oculus romano.',
      'Posee una pantalla gigante circular de 360 grados ("Halo Board").',
      'Sede con certificación LEED Platinum por su alta sustentabilidad.'
    ],
    x: 520,
    y: 280
  },
  {
    id: 'sofi',
    name: 'SoFi Stadium',
    city: 'Los Ángeles',
    state: 'California',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '70,000',
    matches: 'Fase de Grupos (incluyendo debut de EE.UU.), 16avos y Cuartos de final',
    facts: [
      'El estadio más caro del mundo, costó más de $5 mil millones de dólares.',
      'Su pantalla de doble vista en forma de óvalo ("Infinity Screen") pesa más de 1,000 toneladas.',
      'Ubicado parcialmente bajo el nivel del suelo para no interferir con las rutas del aeropuerto LAX.'
    ],
    x: 130,
    y: 240
  },
  {
    id: 'lumen',
    name: 'Lumen Field',
    city: 'Seattle',
    state: 'Washington',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '69,000',
    matches: 'Fase de Grupos y 16avos de final',
    facts: [
      'Diseñado con techos parciales que amplifican el ruido de los fanáticos.',
      'Ofrece vistas espectaculares del horizonte de Seattle y el estrecho de Puget.',
      'Hogar de los Seattle Sounders (MLS) y Seattle Seahawks (NFL).'
    ],
    x: 130,
    y: 120
  },
  {
    id: 'levis',
    name: "Levi's Stadium",
    city: 'San Francisco Bay Area',
    state: 'California',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '68,500',
    matches: 'Fase de Grupos y 16avos de final',
    facts: [
      'Ubicado en Santa Clara, en el corazón de Silicon Valley.',
      'Primer estadio deportivo profesional en los EE.UU. con un techo verde con paneles solares.',
      'Albergó el Super Bowl 50 en 2016.'
    ],
    x: 100,
    y: 185
  },
  {
    id: 'gillette',
    name: 'Gillette Stadium',
    city: 'Boston',
    state: 'Massachusetts',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '65,878',
    matches: 'Fase de Grupos, 16avos y Cuartos de final',
    facts: [
      'Hogar de los New England Patriots de la NFL y New Revolution de la MLS.',
      'Su entrada norte cuenta con un emblemático faro de 67 metros de altura.',
      'Ubicado en Foxborough, a unos 35 km al sur de Boston.'
    ],
    x: 650,
    y: 170
  },
  {
    id: 'lincoln',
    name: 'Lincoln Financial Field',
    city: 'Filadelfia',
    state: 'Pennsylvania',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '69,796',
    matches: 'Fase de Grupos y 16avos de final',
    facts: [
      'Apodado popularmente "The Linc".',
      'Genera parte de su propia energía mediante más de 11,000 paneles solares.',
      'Famoso por el ambiente apasionado e intenso de sus espectadores.'
    ],
    x: 605,
    y: 205
  },
  {
    id: 'hardrock',
    name: 'Hard Rock Stadium',
    city: 'Miami',
    state: 'Florida',
    country: 'USA',
    flag: '🇺🇸',
    capacity: '64,767',
    matches: 'Partido por el Tercer Lugar, Fase de Grupos, 16avos y Cuartos de final',
    facts: [
      'Ha albergado 6 Super Bowls y múltiples conciertos masivos.',
      'Su enorme dosel de techo protege al 90% de los espectadores de la lluvia y el sol.',
      'Hogar de los Miami Dolphins y sede del Masters de Tenis de Miami.'
    ],
    x: 580,
    y: 350
  },
  {
    id: 'bbva',
    name: 'Estadio BBVA',
    city: 'Monterrey',
    state: 'Nuevo León',
    country: 'Mexico',
    flag: '🇲🇽',
    capacity: '53,500',
    matches: 'Fase de Grupos y 16avos de final',
    facts: [
      'Apodado "El Gigante de Acero" por su imponente estructura metálica.',
      'Ofrece una vista icónica directa al monumental Cerro de la Silla.',
      'Considerado uno de los estadios más modernos de América Latina.'
    ],
    x: 335,
    y: 345
  },
  {
    id: 'akron',
    name: 'Estadio Akron',
    city: 'Guadalajara',
    state: 'Jalisco',
    country: 'Mexico',
    flag: '🇲🇽',
    capacity: '48,071',
    matches: 'Fase de Grupos (incluye debut de México en Guadalajara)',
    facts: [
      'Su diseño exterior simula un volcán coronado por una nube.',
      'Sede del prestigioso Club Deportivo Guadalajara (Chivas).',
      'Estadio altamente ecológico con recolección de agua pluvial y ventilación natural.'
    ],
    x: 290,
    y: 385
  },
  {
    id: 'bcplace',
    name: 'BC Place',
    city: 'Vancouver',
    state: 'British Columbia',
    country: 'Canada',
    flag: '🇨🇦',
    capacity: '54,500',
    matches: 'Fase de Grupos, 16avos y Octavos de final',
    facts: [
      'Posee el techo soportado por cables más grande del mundo.',
      'Ubicado en el centro de Vancouver, junto a la ensenada False Creek.',
      'Albergó las ceremonias de los Juegos Olímpicos de Invierno de 2010.'
    ],
    x: 120,
    y: 90
  },
  {
    id: 'bmo',
    name: 'BMO Field',
    city: 'Toronto',
    state: 'Ontario',
    country: 'Canada',
    flag: '🇨🇦',
    capacity: '45,000',
    matches: 'Fase de Grupos (incluye debut de Canadá) y 16avos de final',
    facts: [
      'Estadio nacional de fútbol de Canadá.',
      'Ampliado especialmente para el Mundial 2026 para cumplir con el aforo de la FIFA.',
      'Ubicado en Exhibition Place, a orillas del Lago Ontario.'
    ],
    x: 550,
    y: 155
  }
]

const FAN_GUIDE_DATA = [
  {
    id: 'safety',
    title: '🛡️ Seguridad y Reglas del Estadio',
    items: [
      {
        title: 'Política de Bolsas Transparentes (Clear Bag Policy)',
        content: 'Se restringe el ingreso de bolsos y mochilas. Solo se permiten bolsas de plástico, vinilo o PVC transparente que no excedan las dimensiones de 30 x 15 x 30 cm (12" x 6" x 12"), o carteras de mano pequeñas de hasta 11.5 x 16.5 cm (4.5" x 6.5").'
      },
      {
        title: 'Objetos Prohibidos',
        content: 'Queda estrictamente prohibido el ingreso de armas, fuegos artificiales, envases de vidrio o metal, bocinas de aire, punteros láser, palos de selfie y cámaras profesionales de video o foto con lentes desmontables.'
      },
      {
        title: 'Código de Conducta',
        content: 'La FIFA promueve un ambiente inclusivo y seguro. Cualquier manifestación de racismo, discriminación, homofobia o violencia física/verbal resultará en expulsión inmediata del estadio y posibles cargos legales.'
      }
    ]
  },
  {
    id: 'transport',
    title: '🚇 Transporte y Llegada',
    items: [
      {
        title: 'Transporte Público Recomendado',
        content: 'La mayoría de las sedes contarán con rutas especiales y tarifas integradas para buses y trenes el día del partido. Se recomienda encarecidamente utilizar el transporte público debido al alto tráfico vehicular.'
      },
      {
        title: 'Pases de Estacionamiento',
        content: 'Los estacionamientos oficiales del estadio requieren reserva previa y compra digital. No se venderán accesos físicos el día del encuentro. Las zonas aledañas tendrán restricciones estrictas para vehículos no autorizados.'
      },
      {
        title: 'Zonas de Rideshare (Uber/Lyft)',
        content: 'Cada estadio dispondrá de zonas delimitadas de ascenso y descenso de pasajeros de transporte compartido para evitar congestión en los accesos principales. Prepárate para caminar unos minutos desde estas zonas asignadas.'
      }
    ]
  },
  {
    id: 'tickets',
    title: '🎫 Boletos e Ingreso',
    items: [
      {
        title: 'Boletos 100% Digitales',
        content: 'La entrada se realiza exclusivamente a través de la aplicación oficial de FIFA Tickets. Se aconseja descargar el boleto en la wallet de tu móvil antes de llegar al estadio para evitar problemas por saturación de red local.'
      },
      {
        title: 'Horario de Apertura de Puertas',
        content: 'Las puertas de los estadios abrirán aproximadamente 3 horas antes del silbazo inicial de cada partido. Te recomendamos llegar al menos 2 horas antes para pasar los controles de seguridad sin prisas.'
      },
      {
        title: 'Política de Reingreso',
        content: 'Una vez escaneado el boleto e ingresado al recinto, no se permitirá el reingreso si decides salir del perímetro del estadio por motivos de seguridad.'
      }
    ]
  },
  {
    id: 'experience',
    title: '🎉 Eventos y Fan Zones',
    items: [
      {
        title: 'FIFA Fan Festivals',
        content: 'Espacios gratuitos en cada ciudad sede con pantallas gigantes, música en vivo, gastronomía local y actividades de patrocinadores. Abierto todos los días del torneo para fanáticos con o sin boleto.'
      },
      {
        title: 'Pagos sin Efectivo (Cashless Recints)',
        content: 'Dentro y fuera del estadio encontrarás tiendas oficiales con productos licenciados del Mundial. Se aceptan únicamente pagos con tarjeta o billeteras electrónicas. Si traes efectivo, habrá terminales de "reverse ATM" para cargarlo a una tarjeta temporal.'
      }
    ]
  }
]

export default function NewsInfoView() {
  const [subTab, setSubTab] = useState<'news' | 'stadiums' | 'guide'>('news')

  // News State
  const [news, setNews] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [errorNews, setErrorNews] = useState<string | null>(null)

  // Stadiums State
  const [selectedStadium, setSelectedStadium] = useState<Stadium>(STADIUMS_DATA[0])
  const [countryFilter, setCountryFilter] = useState<'All' | 'USA' | 'Mexico' | 'Canada'>('All')

  // Fan Guide State
  const [expandedSection, setExpandedSection] = useState<string | null>('safety')
  const [expandedItemIndex, setExpandedItemIndex] = useState<string | null>('0')

  // Fetch News from RSS
  useEffect(() => {
    if (subTab !== 'news') return

    async function fetchNews() {
      try {
        setLoadingNews(true)
        setErrorNews(null)
        const res = await fetch('/api/news')
        if (!res.ok) throw new Error('Error al obtener noticias')
        const data = await res.json()
        if (data.news) {
          setNews(data.news)
        } else {
          setNews([])
        }
      } catch (err: any) {
        console.error(err)
        setErrorNews(err.message || 'No se pudieron cargar las noticias')
      } finally {
        setLoadingNews(false)
      }
    }

    fetchNews()
  }, [subTab])

  // Filter stadiums based on selected country
  const filteredStadiums = STADIUMS_DATA.filter(s => {
    if (countryFilter === 'All') return true
    return s.country === countryFilter
  })

  // Format RSS pubDate to a readable localized string
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <section className="mt-8 animate-fadeIn text-left max-w-6xl mx-auto">
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            📰 Centro de Información y Noticias
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Mantente al día con noticias en tiempo real, explora los estadios oficiales y entérate de las reglas para fanáticos.
          </p>
        </div>

        {/* Sub-tab Selector */}
        <div className="flex p-1 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md self-start md:self-auto shadow-inner">
          <button
            onClick={() => setSubTab('news')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              subTab === 'news'
                ? 'bg-primary text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Noticias RSS
          </button>
          <button
            onClick={() => setSubTab('stadiums')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              subTab === 'stadiums'
                ? 'bg-primary text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sedes y Estadios
          </button>
          <button
            onClick={() => setSubTab('guide')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              subTab === 'guide'
                ? 'bg-primary text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Guía del Fan
          </button>
        </div>
      </div>

      {/* SUB-TAB: NEWS */}
      {subTab === 'news' && (
        <div className="space-y-6">
          {loadingNews ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-card p-6 animate-pulse flex flex-col gap-4">
                  <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                  <div className="h-6 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-800 rounded w-full"></div>
                  <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/3 mt-2"></div>
                </div>
              ))}
            </div>
          ) : errorNews ? (
            <div className="glass-card p-8 text-center border-red-500/20">
              <span className="text-3xl mb-2 block">⚠️</span>
              <p className="text-red-400 font-bold">{errorNews}</p>
              <button
                onClick={() => {
                  setLoadingNews(true)
                  setErrorNews(null)
                  // Trigger reload
                  setNews([])
                  fetch('/api/news')
                    .then(res => res.json())
                    .then(data => {
                      if (data.news) setNews(data.news)
                      setLoadingNews(false)
                    })
                    .catch(err => {
                      setErrorNews('Error al recargar noticias')
                      setLoadingNews(false)
                    })
                }}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Reintentar Carga
              </button>
            </div>
          ) : news.length === 0 ? (
            <div className="glass-card p-12 text-center text-slate-400">
              <span className="text-4xl block mb-2">📰</span>
              <p className="font-bold">No se encontraron noticias recientes.</p>
              <p className="text-xs text-slate-500 mt-1">Por favor, inténtalo más tarde.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {news.map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="collectible-card p-6 flex flex-col justify-between group cursor-pointer hover:border-primary/40"
                >
                  <div>
                    {/* Source and Time */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded-full text-slate-950 font-black tracking-wider uppercase ${
                        item.source.toLowerCase().includes('espn') 
                          ? 'bg-red-500 text-white' 
                          : item.source.toLowerCase().includes('google')
                          ? 'bg-blue-600 text-white'
                          : 'bg-primary'
                      }`}>
                        {item.source}
                      </span>
                      <span>{formatDate(item.pubDate)}</span>
                    </div>

                    {/* Title */}
                    <h4 className="text-[14px] md:text-[15px] font-bold text-white group-hover:text-primary transition-colors line-clamp-3 leading-snug">
                      {item.title}
                    </h4>
                  </div>

                  {/* Read More link indicator */}
                  <div className="mt-4 flex items-center justify-end text-xs font-bold text-primary group-hover:underline">
                    <span>Leer artículo completo</span>
                    <svg className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: STADIUMS */}
      {subTab === 'stadiums' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left / Top: Interactive SVG Map & Country Filter */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-400">Mapa del Torneo</h4>
              
              {/* Country filter selector */}
              <div className="flex gap-1.5 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                {(['All', 'USA', 'Mexico', 'Canada'] as const).map((country) => (
                  <button
                    key={country}
                    onClick={() => {
                      setCountryFilter(country)
                      // Auto-select first matching stadium
                      const firstMatch = STADIUMS_DATA.find(s => country === 'All' || s.country === country)
                      if (firstMatch) setSelectedStadium(firstMatch)
                    }}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                      countryFilter === country
                        ? 'bg-slate-800 text-primary'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {country === 'All' ? 'Todos' : country === 'USA' ? '🇺🇸 EE.UU.' : country === 'Mexico' ? '🇲🇽 México' : '🇨🇦 Canadá'}
                  </button>
                ))}
              </div>
            </div>

            {/* Stylized Interactive Map */}
            <div className="relative glass-card p-4 overflow-hidden border-slate-800/80 bg-slate-950/40">
              <svg 
                viewBox="0 0 750 480" 
                className="w-full h-auto bg-slate-950/70 rounded-xl border border-slate-900"
              >
                {/* Background grid pattern */}
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="750" height="480" fill="url(#grid)" />

                {/* Country Stylized Outlines */}
                {/* Canada outline polygon */}
                <path 
                  d="M 50,50 L 700,50 L 680,135 L 580,135 L 530,155 L 480,135 L 250,135 L 120,95 Z" 
                  fill={countryFilter === 'Canada' || countryFilter === 'All' ? 'rgba(0,128,128,0.04)' : 'rgba(255,255,255,0.01)'} 
                  stroke={countryFilter === 'Canada' ? 'rgba(0,128,128,0.4)' : 'rgba(255,255,255,0.08)'} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* USA outline polygon */}
                <path 
                  d="M 120,95 L 250,135 L 480,135 L 530,155 L 580,135 L 680,135 L 710,145 L 720,210 L 670,225 L 600,290 L 580,360 L 515,315 L 400,315 L 345,340 L 290,265 L 100,245 L 120,115 Z" 
                  fill={countryFilter === 'USA' || countryFilter === 'All' ? 'rgba(124,58,237,0.03)' : 'rgba(255,255,255,0.01)'} 
                  stroke={countryFilter === 'USA' ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.08)'} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />

                {/* Mexico outline polygon */}
                <path 
                  d="M 290,265 L 345,340 L 400,315 L 395,345 L 345,355 L 340,410 L 350,430 L 375,445 L 360,465 L 320,445 L 280,380 L 255,345 Z" 
                  fill={countryFilter === 'Mexico' || countryFilter === 'All' ? 'rgba(234,179,8,0.02)' : 'rgba(255,255,255,0.01)'} 
                  stroke={countryFilter === 'Mexico' ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.06)'} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />

                {/* Stadium Locator Nodes */}
                {STADIUMS_DATA.map((std) => {
                  const isFilteredOut = countryFilter !== 'All' && std.country !== countryFilter
                  const isSelected = selectedStadium.id === std.id

                  return (
                    <g 
                      key={std.id}
                      onClick={() => setSelectedStadium(std)}
                      className={`cursor-pointer transition-all duration-300 group ${
                        isFilteredOut ? 'opacity-20 pointer-events-none' : 'opacity-100'
                      }`}
                    >
                      {/* Pulse Ring when selected */}
                      {isSelected && (
                        <circle 
                          cx={std.x} 
                          cy={std.y} 
                          r="12" 
                          fill="none" 
                          stroke="var(--primary)" 
                          strokeWidth="1.5"
                          className="animate-ping"
                          style={{ transformOrigin: `${std.x}px ${std.y}px` }}
                        />
                      )}
                      
                      {/* Outer interactive circle */}
                      <circle 
                        cx={std.x} 
                        cy={std.y} 
                        r={isSelected ? 6 : 4} 
                        fill={isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.5)'}
                        stroke={isSelected ? '#ffffff' : 'rgba(0,0,0,0.4)'}
                        strokeWidth={isSelected ? 1.5 : 1}
                        className="group-hover:fill-primary group-hover:scale-125 transition-all duration-200"
                        style={{ transformOrigin: `${std.x}px ${std.y}px` }}
                      />

                      {/* City Text Label */}
                      <text
                        x={std.x}
                        y={std.y}
                        dx={std.x === 120 && std.y === 90 ? -10 : std.x === 100 && std.y === 185 ? -10 : std.x === 120 && std.y === 240 ? -10 : std.x === 290 && std.y === 385 ? -10 : std.x === 410 && std.y === 230 ? -10 : std.x === 605 && std.y === 205 ? -10 : std.x === 550 && std.y === 155 ? -10 : 10}
                        dy={std.x === 128 && std.y === 110 ? 12 : std.x === 120 && std.y === 240 ? 12 : std.x === 328 && std.y === 395 ? 18 : std.x === 395 && std.y === 330 ? 12 : std.x === 520 && std.y === 280 ? 12 : std.x === 335 && std.y === 345 ? -6 : std.x === 390 && std.y === 290 ? -4 : std.x === 410 && std.y === 230 ? -4 : std.x === 630 && std.y === 190 ? -4 : std.x === 650 && std.y === 170 ? -8 : std.x === 605 && std.y === 205 ? -6 : std.x === 550 && std.y === 155 ? -4 : 4}
                        textAnchor={std.x === 120 && std.y === 90 ? 'end' : std.x === 100 && std.y === 185 ? 'end' : std.x === 120 && std.y === 240 ? 'end' : std.x === 290 && std.y === 385 ? 'end' : std.x === 410 && std.y === 230 ? 'end' : std.x === 605 && std.y === 205 ? 'end' : std.x === 550 && std.y === 155 ? 'end' : std.x === 328 && std.y === 395 ? 'middle' : 'start'}
                        fill={isSelected ? '#ffffff' : 'rgba(255,255,255,0.45)'}
                        fontSize="8.5px"
                        fontWeight={isSelected ? '900' : '700'}
                        className="pointer-events-none select-none transition-colors duration-200"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                      >
                        {std.city}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Responsive Stadium Quick Grid Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
              {filteredStadiums.map((std) => (
                <button
                  key={std.id}
                  onClick={() => setSelectedStadium(std)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    selectedStadium.id === std.id
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span>{std.flag}</span>
                  <span>{std.city}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right / Bottom: Detailed Stadium Info Panel */}
          <div className="lg:col-span-5 space-y-6">
            <h4 className="text-sm font-bold text-slate-400">Detalles de la Sede</h4>

            <div className="glass-card p-6 border-primary/10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-950/90 shadow-xl flex flex-col justify-between min-h-[420px]">
              {/* Background watermark icon/gradient */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              
              <div>
                {/* Header Flag & Country */}
                <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedStadium.flag}</span>
                    <div>
                      <h5 className="text-lg font-black text-white leading-tight">
                        {selectedStadium.name}
                      </h5>
                      <p className="text-xs text-slate-400">
                        {selectedStadium.city}, {selectedStadium.state}
                      </p>
                    </div>
                  </div>
                  
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedStadium.country === 'Mexico' ? 'México' : selectedStadium.country}
                  </span>
                </div>

                {/* Capacity and Matches */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Capacidad</p>
                    <p className="text-[15px] font-extrabold text-white mt-0.5">{selectedStadium.capacity}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ciudad Sede</p>
                    <p className="text-[15px] font-extrabold text-white mt-0.5">{selectedStadium.city}</p>
                  </div>
                </div>

                {/* Key Matches Hosted */}
                <div className="mb-6">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    ⚽ Partidos a Albergar:
                  </p>
                  <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/40 leading-relaxed font-semibold">
                    {selectedStadium.matches}
                  </p>
                </div>

                {/* Facts List */}
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    💡 Datos Curiosos:
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400 leading-relaxed font-medium">
                    {selectedStadium.facts.map((fact, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottom Decorative Indicator */}
              <div className="text-[10px] text-slate-500 font-bold text-right pt-4 border-t border-slate-800/40 mt-6 flex justify-between items-center">
                <span>COORDENADAS DE SEDE:</span>
                <span className="font-mono text-slate-400">X: {selectedStadium.x}px | Y: {selectedStadium.y}px</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: FAN GUIDE */}
      {subTab === 'guide' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Menu Selection */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-400 mb-2">Categorías</h4>
            {FAN_GUIDE_DATA.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setExpandedSection(cat.id)
                  setExpandedItemIndex('0')
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-between cursor-pointer ${
                  expandedSection === cat.id
                    ? 'bg-primary/15 border-primary text-primary shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>{cat.title.split(' ')[0]} {cat.title.substring(cat.title.indexOf(' ') + 1)}</span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${expandedSection === cat.id ? 'translate-x-1 text-primary' : 'text-slate-500'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            ))}
          </div>

          {/* Right Content Accordions */}
          <div className="md:col-span-8 space-y-4">
            {(() => {
              const currentCat = FAN_GUIDE_DATA.find(c => c.id === expandedSection)
              if (!currentCat) return null

              return (
                <div className="animate-fadeIn">
                  <h4 className="text-sm font-bold text-slate-400 mb-4">{currentCat.title}</h4>

                  <div className="space-y-4">
                    {currentCat.items.map((item, index) => {
                      const itemKey = `${currentCat.id}-${index}`
                      const isItemExpanded = expandedItemIndex === itemKey || (expandedItemIndex === `${index}` && expandedSection === currentCat.id)
                      
                      return (
                        <div 
                          key={index} 
                          className="glass-card overflow-hidden border-slate-800/80 transition-all duration-300"
                        >
                          <button
                            onClick={() => setExpandedItemIndex(isItemExpanded ? null : itemKey)}
                            className="w-full flex items-center justify-between p-5 text-left font-bold text-white hover:text-primary transition-colors cursor-pointer"
                          >
                            <span className="text-[14px]">{item.title}</span>
                            <span className="p-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 transition-transform duration-300">
                              <svg 
                                className={`w-3.5 h-3.5 transition-transform duration-300 ${isItemExpanded ? 'rotate-180 text-primary' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
                              </svg>
                            </span>
                          </button>

                          <div 
                            className={`transition-all duration-300 ease-in-out ${
                              isItemExpanded ? 'max-h-60 border-t border-slate-800/60' : 'max-h-0'
                            } overflow-hidden`}
                          >
                            <div className="p-5 text-xs text-slate-400 leading-relaxed font-semibold bg-slate-950/20">
                              {item.content}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </section>
  )
}
