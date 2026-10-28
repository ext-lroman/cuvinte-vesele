// Muzică: melodii de pe YouTube, cântate în playerul YouTube încorporat (merge doar cu internet).
// Lista de început e aici; părintele adaugă sau șterge melodii din Zona părinților (lista lui se salvează local).
// Playerul rămâne vizibil și neacoperit (așa cer regulile YouTube) și vine de pe youtube-nocookie.com.
import { h } from './ui.js';
import { T } from './strings.js';

export const SONGS = [
  { id: 'GXioir-fujY', title: 'No Batidão', artist: 'ZXKAI' },
  { id: 'fcnDmrtj6Sk', title: 'Dai Dai', artist: 'Shakira, Burna Boy' },
  { id: 'pRpeEdMmmQ0', title: 'Waka Waka', artist: 'Shakira' },
  { id: 'ekr2nIex040', title: 'APT.', artist: 'ROSÉ & Bruno Mars' },
  { id: 'YnopHCL1Jk8', title: 'Dragostea din tei', artist: 'O-Zone' },
  { id: '4r6-USLYsbA', title: 'Bună dimineața', artist: 'Hi-Q' },
  { id: 'dDaBzSmME0o', title: 'Gașca mea', artist: 'Hi-Q' },
];

const VIDEO_ID = /^[\w-]{11}$/;
const sameAsDefault = (list) => list.length === SONGS.length && list.every((s, i) => s.id === SONGS[i].id && s.title === SONGS[i].title);

// Codul clipului din orice fel de link: watch?v=, youtu.be/, shorts/, embed/, live/, music.youtube.com sau doar codul.
export function videoId(text) {
  const s = String(text || '').trim();
  if (VIDEO_ID.test(s)) return s;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/) || [])[1];
  return id && VIDEO_ID.test(id) ? id : null;
}

// Titlul și canalul, din oEmbed-ul YouTube. null = clipul nu există sau nu poate fi pus în alte aplicații.
async function lookupSong(id) {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
  if (!res.ok) return null;
  const j = await res.json();
  return { title: shortTitle(j.title || ''), artist: j.author_name || '' };
}

// „Baby Shark Dance | #babyshark Most Viewed…” → „Baby Shark Dance”; fără „(Official Video)”, „[Lyrics]” și altele.
const shortTitle = (t) => t.split(/\s+[|•]\s+/)[0]
  .replace(/\s*[([][^)\]]*\b(official|oficial|video|videoclip|lyrics?|audio|hd|4k|mv)\b[^)\]]*[)\]]/gi, '')
  .replace(/\s*#\S+/g, '').trim() || t;

// Poza clipului; fără internet rămâne nota muzicală de dedesubt.
function thumb(id, cls = '') {
  const img = h('img', { src: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.remove());
  return h('span', { class: `song-thumb ${cls}`.trim() }, '🎵', img);
}

let apiPromise = null;
function loadAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
      const s = h('script', { src: 'https://www.youtube.com/iframe_api', async: true });
      s.addEventListener('error', () => { s.remove(); reject(new Error('offline')); });
      document.head.append(s);
      setTimeout(() => reject(new Error('timeout')), 15000);
    }).catch((e) => { apiPromise = null; throw e; });
  }
  return apiPromise;
}

// Ecranul „Muzică”: playerul sus, melodiile dedesubt. La final de melodie trece singur la următoarea.
export function mountMusic(screen, { songs, sfx, openParents }) {
  if (!songs.length) {
    screen.append(h('div', { class: 'scroll' },
      h('p', { class: 'lead center' }, T.musicEmpty),
      h('div', { class: 'center-row' }, h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); openParents(); } }, `🔒 ${T.parents}`))));
    return null;
  }
  let index = 0, player = null, ready = false, wantPlay = false, alive = true, timer = 0;
  const broken = new Set();
  const frame = h('div', { class: 'music-frame' });
  const nowTitle = h('span', { class: 'music-title' });
  const nowArtist = h('span', { class: 'music-artist' });
  const cards = songs.map((s, i) => h('button', { class: 'song-card', dataset: { song: s.id }, 'aria-label': s.title, onClick: () => play(i) },
    thumb(s.id), h('span', { class: 'song-name' }, s.title)));

  function show() {
    const s = songs[index];
    nowTitle.textContent = s.title;
    nowArtist.textContent = broken.has(s.id) ? `⚠️ ${T.musicBroken}` : s.artist || '';
    cards.forEach((c, i) => c.classList.toggle('current', i === index));
  }
  function play(i) {
    clearTimeout(timer);
    index = (i + songs.length) % songs.length;
    show();
    if (ready) player.loadVideoById(songs[index].id); else wantPlay = true;
  }
  function step(dir) {
    for (let k = 1; k <= songs.length; k++) {
      const j = (((index + dir * k) % songs.length) + songs.length) % songs.length;
      if (!broken.has(songs[j].id)) return play(j);
    }
  }
  function start() {
    frame.replaceChildren(h('div', { class: 'music-loading' }, '🎵'));
    loadAPI().then((YT) => {
      if (!alive) return;
      const target = h('div');
      frame.replaceChildren(target);
      player = new YT.Player(target, {
        host: 'https://www.youtube-nocookie.com',
        width: '100%', height: '100%',
        videoId: songs[index].id,
        playerVars: { playsinline: 1, rel: 0, fs: 0, iv_load_policy: 3, hl: 'ro' },
        events: {
          onReady: () => { if (!alive) return; ready = true; if (wantPlay) player.loadVideoById(songs[index].id); },
          onStateChange: (e) => { if (alive && e.data === YT.PlayerState.ENDED) step(1); },
          onError: () => {            // clip șters, privat sau cu încorporarea oprită: îl sărim
            if (!alive) return;
            broken.add(songs[index].id);
            cards[index].classList.add('broken');
            show();
            timer = setTimeout(() => step(1), 1500);
          },
        },
      });
    }).catch(() => {
      if (!alive) return;
      frame.replaceChildren(h('div', { class: 'music-offline' },
        h('span', { class: 'music-offline-icon' }, '📶'),
        h('p', {}, T.musicOffline),
        h('button', { class: 'btn primary', onClick: () => { sfx.tap(); start(); } }, `🔁 ${T.musicRetry}`)));
    });
  }

  screen.append(
    h('div', { class: 'music-player' },
      frame,
      h('div', { class: 'music-now' },
        h('button', { class: 'btn icon', 'aria-label': T.musicPrev, dataset: { musicPrev: '' }, onClick: () => step(-1) }, '⏮'),
        h('span', { class: 'music-info' }, nowTitle, nowArtist),
        h('button', { class: 'btn icon', 'aria-label': T.musicNext, dataset: { musicNext: '' }, onClick: () => step(1) }, '⏭'))),
    h('div', { class: 'scroll' }, h('div', { class: 'song-grid' }, cards)));
  show();
  start();
  return () => {
    alive = false;
    clearTimeout(timer);
    try { if (player) player.destroy(); } catch { /* ignorat */ }
  };
}

// Cardul din Zona părinților: adaugă (link YouTube), șterge, revino la lista de început.
// saveList(null) = lista de început.
export function musicParentsCard({ list, saveList, sfx }) {
  let songs = [...list];
  const status = h('p', { class: 'note', 'aria-live': 'polite' });
  const link = h('input', { class: 'text-input wide', type: 'url', inputmode: 'url', autocomplete: 'off', placeholder: T.musicLinkPlaceholder, dataset: { musicLink: '' } });
  const name = h('input', { class: 'text-input', maxlength: '30', autocomplete: 'off', placeholder: T.musicNamePlaceholder, dataset: { musicName: '' } });
  const items = h('div', { class: 'import-list' });
  const addBtn = h('button', { class: 'btn primary', dataset: { musicAdd: '' }, onClick: () => add() }, `➕ ${T.musicAdd}`);
  const resetRow = h('div', { class: 'row' },
    h('button', { class: 'btn ghost', dataset: { musicReset: '' }, onClick: () => { sfx.tap(); commit([...SONGS]); status.textContent = ''; } }, `↺ ${T.musicReset}`));

  function commit(next) {
    songs = next;
    saveList(sameAsDefault(next) ? null : next);
    draw();
  }
  function draw() {
    items.replaceChildren(...songs.map((s) => h('div', { class: 'import-item', dataset: { musicItem: s.id } },
      thumb(s.id, 'small'),
      h('span', { class: 'grow' }, h('b', {}, s.title), s.artist ? ` · ${s.artist}` : ''),
      h('button', { class: 'btn small danger', 'aria-label': T.delete, onClick: () => {
        if (!confirm(T.musicDeleteConfirm)) return;
        commit(songs.filter((x) => x !== s));
      } }, '🗑️'))));
    if (!songs.length) items.append(h('p', { class: 'note' }, T.musicEmpty));
    resetRow.style.display = sameAsDefault(songs) ? 'none' : '';
  }
  async function add() {
    const id = videoId(link.value);
    if (!id) { status.textContent = T.musicBadLink; return; }
    if (songs.some((s) => s.id === id)) { status.textContent = T.musicDuplicate; return; }
    addBtn.disabled = true;
    status.textContent = T.musicChecking;
    let info = { title: '', artist: '' };
    try {
      const found = await lookupSong(id);
      if (!found) { status.textContent = T.musicNotAllowed; addBtn.disabled = false; return; }
      info = found;
    } catch { /* fără internet: o adăugăm oricum; dacă nu merge, playerul o sare */ }
    addBtn.disabled = false;
    const title = name.value.trim() || info.title || `${T.music} ${songs.length + 1}`;
    commit([...songs, { id, title, artist: info.artist }]);
    link.value = '';
    name.value = '';
    sfx.correct();
    status.textContent = T.musicAdded(title);
  }
  link.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

  draw();
  return h('div', { class: 'card', dataset: { musicParents: '' } },
    h('h3', {}, `🎵 ${T.music}`),
    h('p', { class: 'note' }, T.musicParentsText),
    h('p', { class: 'note' }, T.musicParentsSteps),
    h('div', { class: 'row' }, link, name, addBtn),
    status,
    items,
    resetRow);
}
