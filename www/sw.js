// Service worker: aplicația merge și fără internet după prima deschidere (doar pe https).
const VERSION = 'cuvinte-vesele-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './styles/app.css',
  './src/app.js', './src/content.js', './src/strings.js', './src/storage.js', './src/audio.js', './src/ui.js',
  './src/art.js', './src/games/learn.js', './src/games/listen.js', './src/games/memory.js', './src/games/shadow.js', './src/games/count.js', './src/games/spell.js',
  './src/adventure/horn.js', './src/adventure/coloring.js', './src/adventure/dinoNames.js', './src/adventure/rainbow.js', './src/adventure/road.js', './assets/audio/manifest.json',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-180.png',
  './assets/fonts/fredoka.css', './assets/fonts/fredoka-latin.woff2', './assets/fonts/fredoka-latin-ext.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
