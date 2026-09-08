/* ==========================================================================
   ⚡ PWA SERVICE WORKER - ઑફલાઇન સપોર્ટ અને કેશ મેનેજમેન્ટ
   ========================================================================== */

const CACHE_NAME = 'krishna-grocery-cache-v1';

// કેશ (સેવ) કરવા માટેની તમામ અલગ-અલગ ફાઇલોનું લિસ્ટ
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './customer-style.css',
    './customer-app.js',
    './customer-cart.js',
    './firebase-config.js',
    './manifest.json',
    './logo.png',
    'https://cloudflare.com'
];

// ૧. ઇન્સ્ટોલેશન સ્ટેજ: બધી ફાઇલોને ફોનની મેમરીમાં સેવ કરવી [૧]
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('Service Worker: App Assets Caching In Progress...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
        .then(() => self.skipWaiting())
    );
});

// ૨. એક્ટિવેશન સ્ટેજ: જુનો કેશ ડેટા સાફ કરીને નવો ડેટા લાઇવ કરવો [૧]
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing Old Cache...', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ૩. ફેચ સ્ટેજ: નેટવર્ક ન હોય ત્યારે કેશ મેમરીમાંથી એપ સુપર ફાસ્ટ ઓપન કરવી [૧]
// ડેટાબેઝ (REST API) રિક્વેસ્ટ સિવાયની બધી ફાઇલો આનાથી લોડ થશે
self.addEventListener('fetch', (event) => {
    // ફાયરબેઝ રીઅલ ટાઇમ ડેટાબેઝની REST API રિક્વેસ્ટોને કેશમાંથી બાયપાસ કરવી (જેથી લાઈવ ડેટા મળે)
    if (event.request.url.includes('firebaseio.com')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // જો ફાઇલ કેશમાં હાજર હોય તો ત્યાંથી જ બતાવો, નહીંતર ઇન્ટરનેટ પરથી લોડ કરો [૧]
            return cachedResponse || fetch(event.request).catch(() => {
                // સેફ્ટી બાયપાસ: જો નેટવર્ક તદ્દન બંધ હોય તો મુખ્ય ઇન્ડેક્સ પેજ ઓપન રાખશે
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
