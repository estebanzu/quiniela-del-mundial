const CACHE_NAME = 'quiniela-v2'
const OFFLINE_URLS = [
  '/manifest.json',
  '/favicon.svg',
  '/portada.png',
  '/fifaloading.mp4',
]

// Install: pre-cache static assets only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  )
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
})

// Fetch: network-first for everything, cache only specific static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, non-http(s) schemes (chrome-extension, etc), and supabase
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return
  if (url.hostname.includes('supabase')) return

  // Navigation requests (HTML pages): ALWAYS network-first, no caching
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/') || new Response('Offline', { status: 503 }))
    )
    return
  }

  // API requests: network-only
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return // Let browser handle normally
  }

  // Static assets: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.pathname.match(/\.(mp4|png|svg|jpg|jpeg|woff2?|ico)$/)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
