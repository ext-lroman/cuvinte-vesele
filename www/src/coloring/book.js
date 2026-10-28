// Cartea de colorat: galeria de desene și cardul din Zona părinților pentru importul de desene.
// Desenele importate (de ex. cele de la Suncatcher Studio, gratuite doar pentru uz personal)
// rămân pe dispozitiv; aplicația publică nu le conține și nu le trimite nicăieri.
import { h } from '../ui.js';
import { T } from '../strings.js';
import { DINOS } from '../content.js';
import { unicornSVG, dinoSVG } from '../art.js';
import * as store from './store.js';
import { loadImage, rasterize, analyze, thumbnail, toPNG } from './lineart.js';

export const SOURCE_URL = 'https://suncatcherstudio.com/printable-coloring-pages/unicorn/';

export const SVG_PAGES = [
  { id: 'unicorn-1', title: T.unicornPages[0], make: (f, blank = true) => unicornSVG({ fills: f, blank }) },
  { id: 'unicorn-2', title: T.unicornPages[1], make: (f, blank = true) => unicornSVG({ fills: f, blank, flip: true }) },
  ...['stegozaur', 'triceratops', 'trex', 'diplodocus', 'pterodactil'].map((d) => ({
    id: `dino-${d}`, title: DINOS.find((x) => x.id === d).ro, make: (f, blank = true) => dinoSVG(d, { fills: f, blank }),
  })),
];

// Desene raster incluse în aplicație: OpenClipart (domeniu public, CC0).
export const BUNDLED = [
  { id: 'cc0-vesel', title: T.bookPages.vesel, src: 'assets/coloring/unicorn-vesel.png' },
  { id: 'cc0-aripi', title: T.bookPages.aripi, src: 'assets/coloring/unicorn-aripi.png' },
  { id: 'cc0-regal', title: T.bookPages.regal, src: 'assets/coloring/unicorn-regal.png' },
];

const urls = new Set();
const blobURL = (data, type) => { const u = URL.createObjectURL(new Blob([data], { type })); urls.add(u); return u; };
export function releaseURLs() { urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear(); }

function card({ id, title, art, onOpen, colored }) {
  return h('button', { class: 'book-card' + (colored ? ' colored' : ''), dataset: { bookPage: id }, 'aria-label': title, onClick: onOpen },
    h('span', { class: 'book-thumb' }, art),
    h('span', { class: 'book-title' }, title));
}

// Grila galeriei. Desenele importate se adaugă după ce sunt citite din IndexedDB.
export function bookGrid({ art, ops, open, addPages, isAlive }) {
  const grid = h('div', { class: 'book-grid' });
  for (const p of SVG_PAGES) {
    const fills = art[p.id] || {};
    grid.append(card({ id: p.id, title: p.title, art: p.make(fills, true), colored: Object.keys(fills).length > 0, onOpen: () => open(p.id) }));
  }
  const bundledCards = new Map();
  for (const p of BUNDLED) {
    const img = h('img', { src: p.src, alt: '', loading: 'lazy' });
    bundledCards.set(p.id, img);
    grid.append(card({ id: p.id, title: p.title, art: img, colored: (ops[p.id] || []).length > 0, onOpen: () => open(p.id) }));
  }
  const addCard = h('button', { class: 'book-card add', dataset: { bookAdd: '' }, onClick: addPages },
    h('span', { class: 'book-plus' }, '➕'), h('span', { class: 'book-title' }, T.bookAddKid));
  grid.append(addCard);

  (async () => {
    try {
      const [pages, thumbs] = await Promise.all([store.listPages(), store.coloredThumbs()]);
      if (!isAlive()) return;
      for (const [id, img] of bundledCards) if (thumbs.has(id)) img.src = blobURL(thumbs.get(id), 'image/jpeg');
      pages.forEach((p, i) => {
        const data = thumbs.get(p.id) || p.thumb;
        const img = h('img', { src: blobURL(data, 'image/jpeg'), alt: '' });
        addCard.before(card({ id: p.id, title: `${T.bookPageNo} ${i + 1}`, art: img, colored: (ops[p.id] || []).length > 0, onOpen: () => open(p.id) }));
      });
    } catch { /* fără IndexedDB: rămân desenele incluse */ }
  })();
  return grid;
}

// Pagina pentru un id: { kind: 'svg' | 'raster', page }
export async function resolvePage(id) {
  const svg = SVG_PAGES.find((p) => p.id === id);
  if (svg) return { kind: 'svg', page: svg };
  const b = BUNDLED.find((p) => p.id === id);
  if (b) return { kind: 'raster', page: { id, title: b.title, load: async () => b.src } };
  if (id.startsWith('imp-')) {
    const meta = await store.getPage(id).catch(() => null);
    if (meta) return { kind: 'raster', page: { id, title: meta.name, load: () => store.getImage(id) } };
  }
  return null;
}

// Cardul din Zona părinților: sursa desenelor, importul și lista cu ștergere.
export function parentsCard({ sfx }) {
  const status = h('p', { class: 'note', 'aria-live': 'polite' });
  const list = h('div', { class: 'import-list' });
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hidden-input', dataset: { bookInput: '' } });

  async function refresh() {
    releaseURLs();
    list.replaceChildren();
    let pages = [];
    try { pages = await store.listPages(); } catch { status.textContent = T.bookNoStorage; return; }
    if (!pages.length) { list.append(h('p', { class: 'note' }, T.bookEmpty)); return; }
    pages.forEach((p, i) => list.append(h('div', { class: 'import-item', dataset: { importItem: p.id } },
      h('img', { src: blobURL(p.thumb, 'image/jpeg'), alt: '' }),
      h('span', { class: 'grow' }, T.bookItem(i + 1, p.groups)),
      h('button', { class: 'btn small danger', 'aria-label': T.delete, onClick: async () => {
        if (!confirm(T.bookDeleteConfirm)) return;
        await store.deletePage(p.id);
        refresh();
      } }, '🗑️'))));
  }

  input.addEventListener('change', async () => {
    const files = [...input.files];
    input.value = '';
    if (!files.length) return;
    let ok = 0, failed = 0;
    for (let i = 0; i < files.length; i++) {
      status.textContent = T.bookImporting(i + 1, files.length);
      try {
        const img = await loadImage(files[i]);
        const r = rasterize(img);
        const res = analyze(r.data, r.W, r.H);
        const [png, thumb] = await Promise.all([toPNG(r.canvas), thumbnail(r.canvas, 320)]);
        const name = (files[i].name || '').replace(/\.[a-z0-9]+$/i, '') || `${T.bookPageNo} ${i + 1}`;
        await store.addPage({ name, image: await png.arrayBuffer(), imageType: 'image/png', thumb: await thumb.arrayBuffer(), groups: res.groups, W: r.W, H: r.H });
        ok++;
      } catch { failed++; }
    }
    store.persist();
    sfx.correct();
    status.textContent = T.bookImported(ok) + (failed ? ` ${T.bookImportFail}` : '');
    refresh();
  });

  refresh();
  return h('div', { class: 'card', dataset: { bookParents: '' } },
    h('h3', {}, `🎨 ${T.book}`),
    h('p', { class: 'note' }, T.bookParentsText),
    h('p', { class: 'note' }, h('a', { class: 'link', href: SOURCE_URL, target: '_blank', rel: 'noopener' }, `🦄 ${T.bookSourceLink}`)),
    h('p', { class: 'note' }, T.bookParentsSteps),
    h('div', { class: 'row' }, status, h('button', { class: 'btn primary', onClick: () => { sfx.tap(); input.click(); } }, `➕ ${T.bookAdd}`), input),
    list);
}
