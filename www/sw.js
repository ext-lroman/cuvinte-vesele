// Service worker: aplicația merge și fără internet după prima deschidere (doar pe https).
// __BUILD__ este înlocuit la publicare (workflow-ul de GitHub Pages) cu numărul commit-ului, deci
// fiecare publicare are alt cache; cel vechi se șterge la activare și pagina se reîncarcă singură.
const VERSION = 'cuvinte-vesele-__BUILD__';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './styles/app.css',
  './src/adventure/coloring.js', './src/adventure/dinoNames.js', './src/adventure/horn.js', './src/adventure/rainbow.js',
  './src/adventure/road.js', './src/app.js', './src/art.js', './src/art/unicornToy.js',
  './src/audio.js', './src/coloring/book.js', './src/coloring/lineart.js', './src/coloring/rasterPage.js',
  './src/coloring/store.js', './src/coloring/svgPage.js', './src/coloring/widgets.js', './src/content.js',
  './src/extras/balloons.js', './src/extras/colorSort.js', './src/extras/dressUp.js', './src/extras/feedDino.js',
  './src/extras/puzzle.js', './src/extras/trace.js', './src/games/count.js', './src/games/learn.js',
  './src/games/listen.js', './src/games/memory.js', './src/games/oddOne.js', './src/games/pattern.js',
  './src/games/shadow.js', './src/games/spell.js', './src/music.js', './src/storage.js', './src/strings.js',
  './src/ui.js',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-180.png',
  './assets/fonts/fredoka.css', './assets/fonts/fredoka-latin.woff2', './assets/fonts/fredoka-latin-ext.woff2',
  './assets/coloring/unicorn-aripi.png', './assets/coloring/unicorn-regal.png', './assets/coloring/unicorn-vesel.png',
  './assets/audio/manifest.json',
];

// Clipurile audio: toate, din manifest, cu încercări individuale (un clip lipsă nu blochează instalarea).
// Rulează separat de instalare (la mesajul 'precache-audio'), reia doar ce lipsește și revalidează ieftin (304).
async function cacheAudio() {
  try {
    const cache = await caches.open(VERSION);
    const res = await fetch(new Request('./assets/audio/manifest.json', { cache: 'no-cache' }));
    if (!res.ok) return;
    const manifest = await res.json();
    const urls = [];
    for (const [lang, files] of Object.entries(manifest)) for (const f of Object.values(files)) urls.push(`./assets/audio/${lang}/${f}`);
    for (let i = 0; i < urls.length; i += 8) {
      await Promise.all(urls.slice(i, i + 8).map(async (u) => {
        if (await cache.match(u)) return;
        await cache.add(new Request(u, { cache: 'no-cache' })).catch(() => {});
      }));
    }
  } catch { /* fără internet: rămân clipurile de la cererile următoare */ }
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })));   // mereu de la server, nu din cache-ul HTTP
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const fresh = await caches.open(VERSION);
    for (const k of keys.filter((k) => k !== VERSION && k.startsWith('cuvinte-vesele-'))) {
      const old = await caches.open(k);
      for (const req of await old.keys()) {
        if (req.url.includes('/assets/audio/') && !(await fresh.match(req))) { const r = await old.match(req); if (r) await fresh.put(req, r); }
      }
    }
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'precache-audio') e.waitUntil(cacheAudio());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {})); }
    return res;
  })());
});
