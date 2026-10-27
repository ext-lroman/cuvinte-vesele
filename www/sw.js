// Service worker: aplicația merge și fără internet după prima deschidere (doar pe https).
// __BUILD__ este înlocuit la publicare (workflow-ul de GitHub Pages) cu numărul commit-ului, deci
// fiecare publicare are alt cache; cel vechi se șterge la activare și pagina se reîncarcă singură.
const VERSION = 'cuvinte-vesele-__BUILD__';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './styles/app.css',
  './src/app.js', './src/content.js', './src/strings.js', './src/storage.js', './src/audio.js', './src/ui.js',
  './src/art.js', './src/games/learn.js', './src/games/listen.js', './src/games/memory.js', './src/games/shadow.js', './src/games/count.js', './src/games/spell.js',
  './src/adventure/horn.js', './src/adventure/coloring.js', './src/adventure/dinoNames.js', './src/adventure/rainbow.js', './src/adventure/road.js',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-180.png',
  './assets/fonts/fredoka.css', './assets/fonts/fredoka-latin.woff2', './assets/fonts/fredoka-latin-ext.woff2',
  './assets/audio/manifest.json',
];

// Clipurile audio: toate, din manifest, cu încercări individuale (un clip lipsă nu blochează instalarea).
async function cacheAudio(cache) {
  try {
    const res = await fetch('./assets/audio/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const manifest = await res.json();
    const urls = [];
    for (const [lang, files] of Object.entries(manifest)) for (const f of Object.values(files)) urls.push(`./assets/audio/${lang}/${f}`);
    for (let i = 0; i < urls.length; i += 12) {
      await Promise.all(urls.slice(i, i + 12).map((u) => cache.add(u).catch(() => {})));
    }
  } catch { /* fără internet: rămân clipurile de la cererile următoare */ }
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(ASSETS);
    await cacheAudio(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })());
});
