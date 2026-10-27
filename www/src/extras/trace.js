// Trasează cifrele: urmărești cu degetul linia cifrelor 1–5, una după alta.
// Nu există greșeli — linia se umple sub deget; dacă ridici degetul, continui de unde ai rămas. La final: 3 stele.
import { h } from '../ui.js';
import { T } from '../strings.js';
import { NUMBER_WORDS } from '../content.js';

// Fiecare cifră e o singură linie (viewBox 0 0 100 140). „4” are două bucăți: după prima, degetul sare la a doua.
const PATHS = {
  1: 'M35 40 L55 20 L55 120',
  2: 'M30 40 C30 10 75 10 75 40 C75 60 30 90 25 120 L80 120',
  3: 'M30 25 C45 5 80 15 80 40 C80 60 55 70 50 70 C55 70 82 80 82 100 C82 130 40 135 25 110',
  4: 'M65 20 L25 90 L85 90 M65 20 L65 125',
  5: 'M80 20 L35 20 L30 70 C55 55 85 70 85 95 C85 125 45 135 25 110',
};
const DIGITS = [1, 2, 3, 4, 5];
const STEP = 4;        // distanța (unități SVG) dintre punctele de pe traseu
const RADIUS = 22;     // cât de aproape de următorul punct trebuie să fie degetul
const SKIP = 5;        // câte puncte poate sări un deget care merge repede
const DONE_AT = 0.97;  // cât din linie trebuie acoperit ca cifra să fie gata

// Element SVG (h() face doar elemente HTML).
const s = (tag, attrs = {}) => {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
const dist = ([px, py], x, y) => Math.hypot(px - x, py - y);

export function mount(root, ctx) {
  const { lang, speak, sayRo, sfx, preload, setProgress, onDone } = ctx;
  const tag = lang === 'en' ? 'en-US' : 'ro-RO';
  let at = 0;  // a câta cifră (index în DIGITS)
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  preload(DIGITS.map((n) => NUMBER_WORDS[lang][n]), tag);

  const prompt = h('button', { class: 'prompt', onClick: () => { sfx.tap(); sayRo(T.spoken.traceIntro); } },
    h('span', { class: 'speaker-big' }, '🔊'), h('span', { class: 'prompt-text small' }, T.spoken.traceIntro));
  const big = h('div', { class: 'trace-digit', 'aria-live': 'polite' });
  const box = h('div', { class: 'trace-box' });
  const steps = h('div', { class: 'trace-steps' }, DIGITS.map((n) =>
    h('span', { class: 'trace-step', dataset: { n: String(n) } }, String(n))));
  root.replaceChildren(h('div', { class: 'game trace' }, prompt, big, box, steps));

  function draw() {
    const n = DIGITS[at];
    let idx = 0, down = false, done = false;
    const svg = s('svg', { class: 'trace-svg', viewBox: '0 0 100 140', 'data-digit': n, 'data-progress': 0, role: 'img', 'aria-label': `${T.traceName}: ${n}` });
    const guide = s('path', { class: 'trace-guide', d: PATHS[n] });
    const fill = s('path', { class: 'trace-fill', d: PATHS[n] });
    const start = s('circle', { class: 'trace-start', r: 9 });
    const cursor = s('circle', { class: 'trace-cursor', r: 6 });
    svg.append(guide, fill, start, cursor);
    big.textContent = String(n);
    big.dataset.digit = n;
    box.classList.remove('done');
    box.replaceChildren(svg);
    steps.querySelectorAll('.trace-step').forEach((el) => el.classList.toggle('now', el.dataset.n === String(n)));
    setProgress(at / DIGITS.length);
    later(() => sayRo(T.spoken.traceIntro), at === 0 ? 300 : 500);

    // Eșantionăm linia din 4 în 4 unități; degetul trebuie să treacă pe rând pe lângă aceste puncte.
    const total = guide.getTotalLength();
    const points = [];
    for (let l = 0; l < total + STEP; l += STEP) {
      const p = guide.getPointAtLength(Math.min(l, total));
      points.push([+p.x.toFixed(1), +p.y.toFixed(1)]);
    }
    const last = points.length - 1;
    svg.dataset.points = JSON.stringify(points);
    fill.setAttribute('stroke-dasharray', total);
    const moveTo = (c, [x, y]) => { c.setAttribute('cx', x); c.setAttribute('cy', y); };
    moveTo(start, points[0]);
    const show = () => {
      fill.setAttribute('stroke-dashoffset', total - Math.min(total, idx * STEP));
      moveTo(cursor, points[Math.min(idx + 1, last)]);
      svg.dataset.progress = idx;
    };
    show();

    // Coordonatele degetului în unitățile desenului.
    const toSvg = (e) => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y]; };
    // Următorul punct (dintre cele SKIP care urmează) de care degetul e destul de aproape.
    const next = (x, y) => { for (let k = 1; k <= SKIP; k++) if (idx + k <= last && dist(points[idx + k], x, y) <= RADIUS) return idx + k; return null; };
    const follow = (e) => {
      if (done) return;
      const [x, y] = toSvg(e);
      let moved = false;
      for (let j = next(x, y); j != null; j = next(x, y)) { idx = j; moved = true; }
      if (!moved) return;
      show();
      if (idx / last >= DONE_AT) finish();
    };
    const finish = () => {
      done = true; idx = last; show();
      svg.dataset.done = '1';
      box.classList.add('done');
      steps.querySelector(`.trace-step[data-n="${n}"]`).classList.add('ok');
      sfx.correct();
      later(() => speak(NUMBER_WORDS[lang][n], { lang: tag }), 250);
      at++;
      setProgress(at / DIGITS.length);
      later(() => { if (at >= DIGITS.length) { setProgress(1); onDone(3); } else draw(); }, 1100);
    };

    svg.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch { /* evenimentele sintetice (teste) nu au un pointer activ */ }
      down = true;
      follow(e);
    });
    svg.addEventListener('pointermove', (e) => { if (down) follow(e); });
    const lift = () => { down = false; };  // ridicarea degetului nu pierde nimic: continui de unde ai rămas
    svg.addEventListener('pointerup', lift);
    svg.addEventListener('pointercancel', lift);
  }

  draw();
  return () => timers.forEach(clearTimeout);
}
