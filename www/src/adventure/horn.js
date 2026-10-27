// Pune cornul la unicorn: trage cornul (nu morcovul, pălăria sau înghețata) pe capul fiecărui unicorn.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { unicornSVG, hornPieceSVG } from '../art.js';

export function mount(root, ctx) {
  const { sayRo, sfx, setProgress, onDone } = ctx;
  let placed = 0, mistakes = 0;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  const unis = [unicornSVG({ horn: false }), unicornSVG({ horn: false, flip: true })];
  const targets = unis.map((svg) => ({ svg, el: svg.querySelector('[data-horn]'), filled: false }));
  const pieces = shuffle([{ kind: 'horn' }, { kind: 'horn' }, { kind: 'x', emoji: '🥕' }, { kind: 'x', emoji: '🎩' }, { kind: 'x', emoji: '🍦' }]);

  const tray = h('div', { class: 'tray' }, pieces.map((p) => {
    const el = h('button', { class: 'piece', dataset: { kind: p.kind }, 'aria-label': p.kind === 'horn' ? 'corn' : p.emoji },
      p.kind === 'horn' ? hornPieceSVG() : h('span', { class: 'piece-emoji' }, p.emoji));
    attachDrag(el, p);
    return el;
  }));

  root.replaceChildren(h('div', { class: 'game horn' },
    h('div', { class: 'unicorns' }, h('div', { class: 'uni big' }, unis[0]), h('div', { class: 'uni small' }, unis[1])),
    h('p', { class: 'instruction' }, T.spoken.hornIntro),
    tray));
  setProgress(0);
  later(() => sayRo(T.spoken.hornIntro), 300);

  const within = (r, x, y, pad) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;

  function attachDrag(el, p) {
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      if (el.classList.contains('used')) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY };
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      el.style.transform = `translate(${e.clientX - start.x}px, ${e.clientY - start.y}px) scale(1.2)`;
    });
    const end = (e) => {
      if (!start) return;
      start = null;
      el.classList.remove('dragging');
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hit = targets.find((t) => !t.filled && within(t.el.getBoundingClientRect(), cx, cy, 44));
      if (hit && p.kind === 'horn') {
        hit.filled = true;
        hit.el.removeAttribute('visibility');
        hit.svg.parentElement.classList.add('sparkle');
        el.classList.add('used');
        el.style.transform = '';
        sfx.sparkle();
        placed++;
        setProgress(placed / targets.length);
        if (placed === targets.length) {
          later(() => sayRo(T.spoken.hornDone), 150);
          later(() => onDone(score()), 2000);
        } else {
          later(() => sayRo(T.spoken.hornOne), 150);
        }
      } else {
        if (hit) { mistakes++; sfx.wrong(); later(() => sayRo(T.spoken.hornWrong), 100); }
        el.classList.add('returning');
        el.style.transform = '';
        later(() => el.classList.remove('returning'), 400);
      }
      void e;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  const score = () => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
  return () => timers.forEach(clearTimeout);
}
