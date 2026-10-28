// O pagină de colorat desenată de noi (SVG cu zone data-region): aceeași paletă și aceleași unelte.
import { h } from '../ui.js';
import { T } from '../strings.js';
import { COLORS } from '../content.js';
import { paint } from '../art.js';
import { paletteEl, toolbarEl } from './widgets.js';

const hexOf = (id) => (COLORS.find((c) => c.id === id) || COLORS[0]).hex;

export function mount(root, ctx) {
  const { page, fills, saveArt, sfx, sayRo, speak, lang, setProgress, onDone } = ctx;
  const history = [];
  let color = COLORS[0].id;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const canvas = h('div', { class: 'canvas' });
  let svg = null;

  const regions = () => new Set([...svg.querySelectorAll('[data-region]')].map((n) => n.dataset.region)).size;
  const progress = () => setProgress(Math.min(1, Object.keys(fills).length / Math.max(1, regions())));
  function draw() {
    svg = page.make(fills);
    svg.addEventListener('click', (e) => {
      const node = e.target.closest('[data-region]');
      if (!node) return;
      const r = node.dataset.region;
      if (fills[r] === color) return;
      history.push([r, fills[r]]);
      fills[r] = color;
      svg.querySelectorAll(`[data-region="${r}"]`).forEach((n) => paint(n, hexOf(color)));
      saveArt();
      sfx.pop();
      progress();
    });
    canvas.replaceChildren(svg);
    progress();
  }

  const palette = paletteEl({ selected: color, lang, speak, sfx, onPick: (id) => { color = id; } });
  const tools = toolbarEl({
    sfx,
    onUndo: () => { const last = history.pop(); if (!last) return; const [r, prev] = last; if (prev) fills[r] = prev; else delete fills[r]; saveArt(); draw(); },
    onZoom: (on) => canvas.classList.toggle('zoomed', on),
    onClear: () => { for (const k of Object.keys(fills)) delete fills[k]; history.length = 0; saveArt(); draw(); },
    onDone: () => { sfx.tap(); sayRo(T.spoken.colorDone); later(() => onDone(3), 900); },
  });
  root.replaceChildren(h('div', { class: 'game paint', dataset: { page: page.id } }, palette, canvas, tools));
  draw();
  later(() => sayRo(T.spoken.colorIntro), 300);
  return () => timers.forEach(clearTimeout);
}
