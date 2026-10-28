// Colorează curcubeul: fiecare dungă se colorează cu culoarea cerută (învață numele culorilor și ordinea lor).
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { COLORS, RAINBOW } from '../content.js';
import { rainbowSVG, paint } from '../art.js';

const hexOf = (id) => COLORS.find((c) => c.id === id).hex;
const nameOf = (id) => COLORS.find((c) => c.id === id).ro;

export function mount(root, ctx) {
  const { sayRo, sfx, setProgress, onDone } = ctx;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  let k = 0, mistakes = 0, wrongHere = 0;
  const fills = {};

  const svg = rainbowSVG({});
  const bands = [...svg.querySelectorAll('[data-band]')];
  const prompt = h('span', { class: 'prompt-text small' });
  const order = shuffle(RAINBOW);
  const palette = h('div', { class: 'palette' }, order.map((id) =>
    h('button', { class: 'swatch', style: { '--sw': hexOf(id) }, dataset: { color: id }, 'aria-label': nameOf(id), onClick: (e) => pick(id, e.currentTarget) })));
  const canvas = h('div', { class: 'canvas rainbow-canvas' }, svg);

  root.replaceChildren(h('div', { class: 'game rainbow' },
    h('button', { class: 'prompt', onClick: () => { sfx.tap(); sayRo(T.spoken.colorWith[RAINBOW[k]]); } }, h('span', { class: 'speaker-big' }, '🔊'), prompt),
    canvas,
    palette));

  function ask() {
    bands.forEach((b, i) => b.classList.toggle('target', i === k));
    prompt.textContent = T.colorWith(nameOf(RAINBOW[k]));
    setProgress(k / RAINBOW.length);
    wrongHere = 0;
    palette.querySelectorAll('.swatch').forEach((s) => s.classList.remove('hint'));
    later(() => sayRo(T.spoken.colorWith[RAINBOW[k]]), 350);
  }

  function pick(id, btn) {
    if (k >= RAINBOW.length) return;
    if (id === RAINBOW[k]) {
      fills[`band-${k}`] = id;
      paint(bands[k], hexOf(id));
      bands[k].classList.remove('target');
      bands[k].classList.add('filled');
      btn.classList.add('used');
      sfx.correct();
      k++;
      if (k >= RAINBOW.length) {
        setProgress(1);
        canvas.replaceChildren(rainbowSVG({ fills, happy: true }));
        later(() => sayRo(T.spoken.rainbowDone), 400);
        later(() => onDone(score()), 2000);
      } else {
        later(ask, 600);
      }
    } else {
      mistakes++;
      wrongHere++;
      sfx.wrong();
      btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
      if (wrongHere >= 2) palette.querySelector(`.swatch[data-color="${RAINBOW[k]}"]`).classList.add('hint');
    }
  }

  const score = () => (mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1);
  later(() => sayRo(T.spoken.rainbowIntro), 200);
  later(ask, 2200);
  return () => timers.forEach(clearTimeout);
}
