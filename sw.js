const CACHE_NAME = 'sujana-chat-v4';
const ASSETS_TO_CACHE = [
  'index.html',
  'message.html',
  'style.css',
  'manifest.json',
  'Sujana.png'
];

// १. Install Event - नयाँ फाइलहरू क्यास गर्ने
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// २. Activate Event - पुराना सबै क्यासहरू मेटाएर नयाँ भर्सन सक्रिय गर्ने
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ३. Fetch Event - Gemini API जस्ता बाह्य अनुरोध सिधै नेटवर्कबाट लिने, स्थानीय फाइलमा Cache First
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Gemini API वा बाह्य नेटवर्क रिक्वेस्टहरू क्यास नगर्ने
  if (url.origin !== self.location.origin || url.pathname.includes('generateContent')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // अफलाइनमा पेज खुल्दा index.html fallback दिने
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});
