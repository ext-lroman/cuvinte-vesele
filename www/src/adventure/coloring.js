// Colorat: alege o culoare din paletă și atinge o zonă din desen. Desenele se păstrează în album.
import { h } from '../ui.js';
import { T } from '../strings.js';
import { COLORS, DINOS } from '../content.js';
import { unicornSVG, dinoSVG } from '../art.js';

const hexOf = (id) => COLORS.find((c) => c.id === id).hex;

export function mount(root, ctx) {
  const { step, art, saveArt, sayRo, speak, lang, sfx, setProgress, onDone } = ctx;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const tag = lang === 'en' ? 'en-US' : 'ro-RO';

  const pages = step === 'unicorni'
    ? [
      { key: 'unicorn-1', title: T.unicornPages[0], make: (f) => unicornSVG({ fills: f, blank: true }) },
      { key: 'unicorn-2', title: T.unicornPages[1], make: (f) => unicornSVG({ fills: f, blank: true, flip: true }) },
    ]
    : ['stegozaur', 'triceratops', 'trex'].map((id) => ({
      key: `dino-${id}`, title: DINOS.find((d) => d.id === id).ro, make: (f) => dinoSVG(id, { fills: f, blank: true }),
    }));
  let page = 0;
  let color = COLORS[0].id;

  const palette = h('div', { class: 'palette' }, COLORS.map((c) =>
    h('button', { class: 'swatch' + (c.id === color ? ' on' : ''), style: { '--sw': c.hex }, dataset: { color: c.id }, 'aria-label': c.ro,
      onClick: (e) => {
        color = c.id;
        palette.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', s === e.currentTarget));
        sfx.pop();
        speak(c[lang], { lang: tag });
      } })));
  const title = h('div', { class: 'page-title' });
  const canvas = h('div', { class: 'canvas' });
  const doneBtn = h('button', { class: 'btn primary big', onClick: () => {
    sfx.tap();
    sayRo(T.spoken.colorDone);
    later(() => onDone(3), 1000);
  } }, `${T.done} ✓`);

  const coloredCount = () => pages.reduce((n, p) => n + Object.keys(art[p.key] || {}).length, 0);
  const refresh = () => { doneBtn.disabled = coloredCount() < 3; setProgress(Math.min(1, coloredCount() / 8)); };

  function draw() {
    const p = pages[page];
    art[p.key] = art[p.key] || {};
    const svg = p.make(art[p.key]);
    svg.addEventListener('click', (e) => {
      const node = e.target.closest('[data-region]');
      if (!node) return;
      const r = node.dataset.region;
      art[p.key][r] = color;
      svg.querySelectorAll(`[data-region="${r}"]`).forEach((n) => n.setAttribute('fill', hexOf(color)));
      saveArt();
      sfx.pop();
      refresh();
    });
    canvas.replaceChildren(svg);
    title.textContent = pages.length > 1 ? `${p.title} (${page + 1}/${pages.length})` : p.title;
    refresh();
  }

  root.replaceChildren(h('div', { class: 'game coloring' },
    palette,
    title,
    canvas,
    h('div', { class: 'nav-row' },
      h('button', { class: 'btn', onClick: () => { sfx.tap(); art[pages[page].key] = {}; saveArt(); draw(); } }, `🧽 ${T.clear}`),
      pages.length > 1 && h('button', { class: 'btn', dataset: { nextPage: '' }, onClick: () => { sfx.tap(); page = (page + 1) % pages.length; draw(); } }, step === 'unicorni' ? T.nextUnicorn : T.nextDino),
      doneBtn)));
  draw();
  later(() => sayRo(T.spoken.colorIntro), 300);
  return () => timers.forEach(clearTimeout);
}
