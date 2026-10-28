// Voce: clipuri audio pre-generate (assets/audio, voce neurală) cu Web Speech API ca rezervă;
// efecte sonore sintetizate (Web Audio API).
let ctx = null;
let enabled = true;
let pendingSpeak = null;
let manifest = null;              // { ro: { slug: fișier }, en: { ... } }
const buffers = new Map();        // url → Promise<AudioBuffer>
let current = null;               // clipul care se aude acum

export function setSoundEnabled(v) {
  enabled = v;
  if (!v) stopSpeech();
}

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// iOS/Safari permit audio și voce doar după o atingere; le „deblocăm” la prima interacțiune.
export function unlockAudio() {
  ac();
  if ('speechSynthesis' in window) {
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { /* ignorat */ }
  }
}

function tone(freq, start, dur, type = 'sine', gain = 0.16) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  tap() { if (enabled) tone(660, 0, 0.08, 'triangle', 0.1); },
  flip() { if (enabled) tone(440, 0, 0.07, 'sine', 0.1); },
  pop() { if (enabled) { tone(880, 0, 0.06, 'sine', 0.12); tone(1320, 0.05, 0.08, 'sine', 0.08); } },
  correct() { if (enabled) [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.09, 0.28, 'triangle')); },
  wrong() { if (enabled) { tone(200, 0, 0.22, 'sawtooth', 0.07); tone(160, 0.12, 0.3, 'sawtooth', 0.07); } },
  win() { if (enabled) [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.12, 0.35, 'triangle')); },
  sparkle() { if (enabled) [1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, i * 0.06, 0.25, 'sine', 0.07)); },
};

// ---- clipuri audio -----------------------------------------------------------
export function slug(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function loadClips(url = 'assets/audio/manifest.json') {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (r.ok) manifest = await r.json();
  } catch { manifest = null; }
}

function clipUrl(text, lang) {
  const l = String(lang).slice(0, 2).toLowerCase();
  const file = manifest && manifest[l] && manifest[l][slug(text)];
  return file ? `assets/audio/${l}/${file}` : null;
}

export function hasClip(text, lang) { return !!clipUrl(text, lang); }

function getBuffer(url) {
  if (buffers.has(url)) return buffers.get(url);
  const p = (async () => {
    const c = ac();
    if (!c) throw new Error('no audio');
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const data = await res.arrayBuffer();
    return new Promise((resolve, reject) => {
      const r = c.decodeAudioData(data, resolve, reject);
      if (r && typeof r.catch === 'function') r.catch(reject);
    });
  })();
  buffers.set(url, p);
  p.catch(() => buffers.delete(url));
  return p;
}

export function preload(texts, lang) {
  if (!manifest) return;
  for (const t of texts) { const u = clipUrl(t, lang); if (u) getBuffer(u).catch(() => {}); }
}

async function playClip(url) {
  const c = ac();
  const buf = await getBuffer(url);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  current = src;
  src.onended = () => { if (current === src) current = null; };
  src.start();
}

export function stopSpeech() {
  clearTimeout(pendingSpeak);
  if (current) { try { current.stop(); } catch { /* deja oprit */ } current = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// ---- Web Speech API (rezervă) ----------------------------------------------------
const PREFERRED = {
  ro: ['Ioana', 'Google română', 'Romanian', 'Microsoft Andrei', 'Microsoft Emil'],
  en: ['Samantha', 'Google US English', 'Karen', 'Daniel', 'Moira', 'Alex'],
};
const quality = (v) => (/premium/i.test(v.voiceURI + v.name) ? 3 : /enhanced/i.test(v.voiceURI + v.name) ? 2 : /compact/i.test(v.voiceURI) ? 0 : 1);

function pickVoice(lang) {
  if (!('speechSynthesis' in window)) return null;
  const base = lang.slice(0, 2).toLowerCase();
  const list = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith(base))
    .sort((a, b) => quality(b) - quality(a));
  for (const p of PREFERRED[base] || []) {
    const v = list.find((x) => x.name.includes(p));
    if (v) return v;
  }
  return list.find((v) => v.default) || list[0] || null;
}

export function hasVoice(lang) { return !!pickVoice(lang); }

function tts(text, lang, rate) {
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.lang = lang;
    u.rate = rate;
    u.pitch = 1;
    // Chrome pierde uneori o rostire trimisă în același tick cu cancel(); o amânăm puțin.
    pendingSpeak = setTimeout(() => speechSynthesis.speak(u), 40);
  } catch { /* fără voce pe acest dispozitiv */ }
}

export function speak(text, { lang = 'ro-RO', rate = 0.95 } = {}) {
  if (!enabled || !text) return;
  stopSpeech();
  const url = clipUrl(text, lang);
  if (url && ac()) {
    playClip(url).then(() => { document.documentElement.dataset.voice = 'clip'; }).catch(() => { document.documentElement.dataset.voice = 'tts'; tts(text, lang, rate); });
    return;
  }
  document.documentElement.dataset.voice = 'tts';
  tts(text, lang, rate);
}
