// O pagină de colorat raster (desen importat sau desen inclus): paletă, atingi o zonă → se colorează.
// Colorarea se salvează ca listă de atingeri (punct + culoare), deci se poate reface și anula oricând.
import { h } from '../ui.js';
import { T } from '../strings.js';
import { COLORS } from '../content.js';
import { loadImage, rasterize, analyze, Painter, thumbnail } from './lineart.js';
import { paletteEl, toolbarEl } from './widgets.js';

const hexOf = (id) => (COLORS.find((c) => c.id === id) || COLORS[0]).hex;

export function mount(root, ctx) {
  const { page, ops: savedOps = [], saveOps, saveThumb, sfx, sayRo, speak, lang, setProgress, onDone } = ctx;
  const ops = savedOps.slice();
  const groupColor = new Map();
  let painter = null, res = null, alive = true, color = COLORS[0].id;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  const canvas = h('canvas', { class: 'paint-canvas', 'aria-label': page.title });
  const wrap = h('div', { class: 'paint-wrap loading' }, canvas, h('div', { class: 'paint-loading' }, '🎨'));
  const palette = paletteEl({ selected: color, lang, speak, sfx, onPick: (id) => { color = id; } });
  const tools = toolbarEl({
    sfx,
    onUndo: () => { if (!painter || !ops.length) return; ops.pop(); redraw(); persist(); },
    onZoom: (on) => { wrap.classList.toggle('zoomed', on); fit(); if (on) wrap.scrollTo({ left: (wrap.scrollWidth - wrap.clientWidth) / 2, top: (wrap.scrollHeight - wrap.clientHeight) / 3 }); },
    onClear: () => { if (!painter) return; ops.length = 0; redraw(); persist(); },
    onDone: async () => {
      if (!painter) return;
      sfx.tap();
      try { saveThumb && saveThumb(await thumbnail(canvas, 320)); } catch { /* fără miniatură */ }
      sayRo(T.spoken.colorDone);
      later(() => onDone(3), 900);
    },
  });

  root.replaceChildren(h('div', { class: 'game paint', dataset: { page: page.id } }, palette, wrap, tools));
  setProgress(0);

  const persist = () => { saveOps && saveOps(ops.slice()); };
  // Desenul încape în spațiul rămas (lățime și înălțime); „Mărește” îl dublează și se poate derula.
  function fit() {
    if (!res) return;
    const z = wrap.classList.contains('zoomed') ? 2 : 1;
    const s = Math.min(wrap.clientWidth / res.W, wrap.clientHeight / res.H) * z;
    if (!(s > 0)) return;
    canvas.style.width = `${Math.floor(res.W * s)}px`;
    canvas.style.height = `${Math.floor(res.H * s)}px`;
  }
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => fit()) : null;
  if (ro) ro.observe(wrap); else window.addEventListener('resize', fit);
  const progress = () => { if (res) setProgress(Math.min(1, groupColor.size / Math.max(1, Math.min(res.groups, 25)))); };

  function apply(op, flush) {
    const g = painter.groupAt(op.x * res.W, op.y * res.H);
    if (!g) return false;
    painter.paint(g, hexOf(op.c), flush);
    groupColor.set(g, op.c);
    return true;
  }
  function redraw() {
    painter.reset();
    groupColor.clear();
    for (const op of ops) apply(op, false);
    painter.flush();
    progress();
  }

  canvas.addEventListener('click', (e) => {
    if (!painter) return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * res.W;
    const y = ((e.clientY - r.top) / r.height) * res.H;
    const g = painter.groupAt(x, y);
    if (!g) { sfx.flip(); return; }
    if (groupColor.get(g) === color) return;
    const op = { x: +(x / res.W).toFixed(4), y: +(y / res.H).toFixed(4), c: color };
    apply(op, true);
    ops.push(op);
    sfx.pop();
    progress();
    persist();
  });

  (async () => {
    try {
      const src = await page.load();
      const img = await loadImage(src);
      if (!alive) return;
      const r = rasterize(img);
      res = analyze(r.data, r.W, r.H);
      painter = new Painter(canvas, r.data, res);
      canvas.dataset.groups = String(res.groups);
      redraw();
      wrap.classList.remove('loading');
      fit();
      wrap.dataset.ready = '1';
      later(() => sayRo(T.spoken.colorIntro), 200);
    } catch (err) {
      wrap.classList.remove('loading');
      wrap.replaceChildren(h('p', { class: 'note' }, '⚠️ ', T.bookLoadError));
      void err;
    }
  })();

  return () => { alive = false; timers.forEach(clearTimeout); if (ro) ro.disconnect(); else window.removeEventListener('resize', fit); };
}
