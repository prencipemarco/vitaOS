// vitaOS Service Worker — offline-first strategy
const CACHE_NAME = 'vitaos-v8'
const STATIC_CACHE = 'vitaos-static-v8'

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

  // Skip non-GET and external requests
  if (e.request.method !== 'GET' || !url.origin.includes(self.location.origin)) return

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (url.pathname.match(/\.(js|css|png|svg|woff2?|ico)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          if (!res || res.status !== 200) return res
          const clone = res.clone()
          caches.open(STATIC_CACHE).then(cache => cache.put(e.request, clone))
          return res
        }).catch(() => null) // Fallback handled by browser
      }).then(res => res || fetch(e.request))
    )
    return
  }

  // Network-first for HTML (navigation)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => {
        return caches.match(e.request).then(c => {
          if (c) return c
          return caches.match('/')
        }).then(c => c || fetch(e.request)) // Ensure we don't return null
      })
  )
})
