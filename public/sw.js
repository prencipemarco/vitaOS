// vitaOS Service Worker — offline-first strategy
const CACHE_NAME = 'vitaos-v6'
const STATIC_CACHE = 'vitaos-static-v6'

// On install: cache nothing (assets are content-hashed, handled by Vite)
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== STATIC_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Network-first for navigation, cache-first for assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Skip non-GET and external requests (e.g. Anthropic API)
  if (e.request.method !== 'GET' || !url.origin.includes(self.location.origin)) return

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (url.pathname.match(/\.(js|css|png|svg|woff2?|ico)$/)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fetched = fetch(e.request).then(res => { cache.put(e.request, res.clone()); return res })
          return cached || fetched
        })
      )
    )
    return
  }

  // Network-first for HTML (navigation)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request).then(c => c || caches.match('/')))
  )
})
