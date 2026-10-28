// Sortează culorile: trage fiecare formă (cerc, stea, inimă) în coșul de culoarea ei.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { COLORS } from '../content.js';

const NS = 'http://www.w3.org/2000/svg';
const OUTLINE = '#4A3B5C';
// Cele trei forme, desenate în viewBox 0 0 100 100; fiecare se umple cu culoarea piesei.
const SHAPES = {
  cerc: 'M8 50 a42 42 0 1 0 84 0 a42 42 0 1 0 -84 0 Z',
  stea: 'M50 6 L61.2 34.6 L91.8 36.4 L68.1 55.9 L75.9 85.6 L50 69 L24.1 85.6 L31.9 55.9 L8.2 36.4 L38.8 34.6 Z',
  inima: 'M50 88 C20 64 6 48 6 30 C6 16 18 8 30 8 C40 8 47 14 50 22 C53 14 60 8 70 8 C82 8 94 16 94 30 C94 48 80 64 50 88 Z',
};
// Perechi pe care un copil mic le confundă ușor: nu apar împreună în același joc.
const SIMILAR = { albastru: 'bleu', bleu: 'albastru', rosu: 'roz', roz: 'rosu' };
// Aspectul jocului (app.css nu are reguli .colorsort-*): coșurile sunt discuri în culoarea lor (--bin), pe un rând sub tavă.
const CSS = `
.colorsort-bins { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(24px, 5vw, 44px); width: 100%; padding-top: 8px; }
.colorsort-bin { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.colorsort-basket { position: relative; width: clamp(80px, 21vw, 124px); aspect-ratio: 1; border-radius: 50%; background: var(--bin); border: 5px solid #fff; box-shadow: var(--shadow); display: grid; place-items: center; font-size: clamp(38px, 10vw, 58px); line-height: 1; transition: transform .15s, box-shadow .15s; }
.colorsort-count { position: absolute; top: -6px; right: -6px; min-width: 30px; height: 30px; padding: 0 6px; border-radius: 999px; background: #fff; color: var(--ink); font-size: 17px; font-weight: 700; display: grid; place-items: center; box-shadow: var(--shadow); }
.colorsort-name { font-size: clamp(15px, 4vw, 19px); font-weight: 700; text-align: center; }
.colorsort-bin.over .colorsort-basket { transform: scale(1.12); box-shadow: 0 0 0 5px var(--ink), var(--shadow); }
.colorsort-bin.correct .colorsort-basket { animation: pop .35s; }
.colorsort-bin.wrong .colorsort-basket { animation: shake .4s; }`;

// Trei culori la întâmplare (fără alb și fără două culori „surori”).
function pickColors() {
  const out = [];
  for (const c of shuffle(COLORS.filter((c) => c.id !== 'alb'))) {
    if (out.length === 3) break;
    if (!out.some((o) => SIMILAR[o.id] === c.id)) out.push(c);
  }
  return out;
}

function shapeSVG(shape, hex) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'colorsort-shape');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', SHAPES[shape]);
  p.setAttribute('fill', hex);
  p.setAttribute('stroke', OUTLINE);
  p.setAttribute('stroke-width', '5');
  p.setAttribute('stroke-linejoin', 'round');
  svg.append(p);
  return svg;
}

export function mount(root, ctx) {
  const { lang, speak, sayRo, sfx, preload, setProgress, onDone } = ctx;
  const tag = lang === 'en' ? 'en-US' : 'ro-RO';
  const colors = pickColors();
  const total = colors.length * Object.keys(SHAPES).length;
  let sorted = 0, mistakes = 0, finished = false;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const sayColor = (c) => speak(c[lang], { lang: tag });

  // Coșurile: un disc colorat cu un coș și un contor, numele culorii dedesubt.
  const bins = colors.map((c) => {
    const count = h('span', { class: 'colorsort-count' }, '0');
    const basket = h('div', { class: 'colorsort-basket' }, '🧺', count);
    const el = h('div', { class: 'colorsort-bin', dataset: { color: c.id, count: '0' }, style: { '--bin': c.hex }, 'aria-label': c[lang] },
      basket, h('div', { class: 'colorsort-name' }, c[lang]));
    return { c, el, basket, count, n: 0 };
  });

  // Piesele: câte o formă de fiecare fel, pentru fiecare culoare, amestecate.
  const pieces = shuffle(colors.flatMap((c) => Object.keys(SHAPES).map((shape) => ({ c, shape }))));
  const tray = h('div', { class: 'tray' }, pieces.map((p) => {
    const el = h('button', { class: 'piece', dataset: { color: p.c.id, shape: p.shape }, 'aria-label': `${T.sortShapes[p.shape]} ${p.c[lang]}` },
      shapeSVG(p.shape, p.c.hex));
    attachDrag(el, p);
    return el;
  }));

  const prompt = h('button', { class: 'prompt', onClick: () => { sfx.tap(); sayRo(T.spoken.sortIntro); } },
    h('span', { class: 'speaker-big' }, '🔊'),
    h('span', { class: 'prompt-text small' }, T.spoken.sortIntro));

  root.replaceChildren(h('div', { class: 'game colorsort' },
    prompt, tray, h('div', { class: 'colorsort-bins' }, bins.map((b) => b.el)), h('style', {}, CSS)));
  setProgress(0);
  preload([T.spoken.sortIntro, T.spoken.sortWrong, T.spoken.sortDone], 'ro-RO');
  preload(colors.map((c) => c[lang]), tag);
  later(() => sayRo(T.spoken.sortIntro), 300);

  const within = (r, x, y, pad) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const binAt = (x, y) => bins.find((b) => within(b.el.getBoundingClientRect(), x, y, 12));
  const flash = (el, cls, ms) => { el.classList.add(cls); later(() => el.classList.remove(cls), ms); };

  // Tragere cu pointer events (același tipar ca la „Pune cornul”): piesa urmează degetul, coșul de dedesubt se luminează.
  function attachDrag(el, p) {
    let start = null, dx = 0, dy = 0;
    el.addEventListener('pointerdown', (e) => {
      if (finished || el.classList.contains('used')) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY };
      dx = 0; dy = 0;
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      dx = e.clientX - start.x; dy = e.clientY - start.y;
      el.style.transform = `translate(${dx}px, ${dy}px) scale(1.2)`;
      const { x, y } = center(el);
      const over = binAt(x, y);
      bins.forEach((b) => b.el.classList.toggle('over', b === over));
    });
    const end = () => {
      if (!start) return;
      start = null;
      el.classList.remove('dragging');
      bins.forEach((b) => b.el.classList.remove('over'));
      const { x, y } = center(el);
      const hit = binAt(x, y);
      if (Math.hypot(dx, dy) < 8) { el.style.transform = ''; sfx.tap(); sayColor(p.c); return; }   // doar o atingere: spune culoarea
      if (hit && hit.c === p.c) { drop(el, p, hit, { dx, dy, x, y }); return; }
      if (hit) { mistakes++; sfx.wrong(); flash(hit.el, 'wrong', 500); later(() => sayRo(T.spoken.sortWrong), 150); }
      el.classList.add('returning');
      el.style.transform = '';
      later(() => el.classList.remove('returning'), 400);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // Coș potrivit: piesa se micșorează în coș, contorul crește, se aude culoarea.
  function drop(el, p, bin, { dx, dy, x, y }) {
    const b = center(bin.basket);
    el.style.transform = `translate(${dx + b.x - x}px, ${dy + b.y - y}px) scale(.15)`;
    el.classList.add('used');
    bin.n++;
    bin.count.textContent = String(bin.n);
    bin.el.dataset.count = String(bin.n);
    flash(bin.el, 'correct', 600);
    sfx.pop();
    later(() => sayColor(p.c), 120);
    sorted++;
    setProgress(sorted / total);
    if (sorted < total) return;
    finished = true;
    sfx.win();
    later(() => sayRo(T.spoken.sortDone), 1000);
    later(() => onDone(score()), 2600);
  }

  const score = () => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
  return () => timers.forEach(clearTimeout);
}
