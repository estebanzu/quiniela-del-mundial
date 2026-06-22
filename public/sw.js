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

// Push notification receiver event
self.addEventListener('push', (event) => {
  let data = { title: '🏆 Quiniela Mundial', body: '¡Llene sus predicciones para el próximo partido!' }
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data = { title: '🏆 Quiniela Mundial', body: event.data.text() }
    }
  }

  const options = {
    body: data.body,
    icon: '/logo-wc2026.png',
    badge: '/favicon.svg',
    data: data.data || {},
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open_app', title: 'Abrir Quiniela' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Push notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  let urlToOpen = '/'
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        const clientUrl = new URL(client.url)
        const targetUrl = new URL(urlToOpen, self.location.origin)
        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})

