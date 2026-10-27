// Puzzle: o poză (unicorn, dinozaur sau curcubeu) tăiată în bucăți amestecate; atingi două bucăți și ele fac schimb de loc.
// 2×2 bucăți la început, 2×3 după ce ai luat deja 3 stele. Bucățile ajunse la locul lor se blochează (contur verde).
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { unicornSVG, dinoSVG, rainbowSVG } from '../art.js';

const RAINBOW_FILLS = { 'band-0': 'rosu', 'band-1': 'portocaliu', 'band-2': 'galben', 'band-3': 'verde', 'band-4': 'albastru', 'band-5': 'mov' };
// Pozele posibile; unicornul și dinozaurii folosesc culorile din album (dacă au fost colorați).
const PICTURES = [
  { id: 'unicorn', make: (art) => unicornSVG({ fills: art['unicorn-1'] }) },
  { id: 'stegozaur', make: (art) => dinoSVG('stegozaur', { fills: art['dino-stegozaur'] }) },
  { id: 'trex', make: (art) => dinoSVG('trex', { fills: art['dino-trex'] }) },
  { id: 'curcubeu', make: () => rainbowSVG({ fills: RAINBOW_FILLS, happy: true }) },
];

export function mount(root, ctx) {
  const { sayRo, sfx, setProgress, onDone, art = {}, best = 0 } = ctx;
  const cols = best >= 3 ? 3 : 2, rows = 2, n = cols * rows;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  // Poza întreagă și dreptunghiul ei (viewBox): fiecare bucată este o clonă care vede doar felia ei.
  const picture = PICTURES[Math.floor(Math.random() * PICTURES.length)];
  const whole = picture.make(art || {});
  const [vx, vy, vw, vh] = whole.getAttribute('viewBox').split(/[\s,]+/).map(Number);
  const tw = vw / cols, th = vh / rows;

  // Amestecăm până când nicio bucată nu e la locul ei, deci puzzle-ul nu e niciodată gata de la început.
  let order;
  do order = shuffle([...Array(n).keys()]); while (order.some((index, slot) => index === slot));

  let selected = null, swaps = 0, locked = 0, done = false;

  // data-index = locul corect al bucății, data-slot = locul pe care stă acum (și `order` în grilă).
  const tiles = order.map((index, slot) => {
    const piece = whole.cloneNode(true);
    piece.setAttribute('viewBox', `${vx + (index % cols) * tw} ${vy + Math.floor(index / cols) * th} ${tw} ${th}`);
    const tile = h('button', {
      class: 'puzzle-tile', dataset: { index: String(index), slot: String(slot) }, style: { order: String(slot) },
      'aria-label': `${T.puzzlePiece} ${index + 1}`, onClick: () => tap(tile),
    }, piece);
    return tile;
  });

  const board = h('div', {
    class: 'puzzle-board', 'aria-label': T.puzzle, dataset: { picture: picture.id, cols: String(cols), rows: String(rows) },
    style: { '--cols': String(cols), '--tile-ar': String(tw / th) },
  }, tiles);
  const prompt = h('button', { class: 'prompt', onClick: () => { sfx.tap(); sayRo(T.spoken.puzzleIntro); } },
    h('span', { class: 'speaker-big' }, '🔊'), h('span', { class: 'prompt-text small' }, T.spoken.puzzleIntro));
  const preview = h('div', { class: 'puzzle-preview', 'aria-hidden': 'true' }, whole);

  root.replaceChildren(h('div', { class: 'game puzzle' }, prompt, preview, board));
  setProgress(0);
  later(() => sayRo(T.spoken.puzzleIntro), 300);

  function tap(tile) {
    if (done || tile.classList.contains('puzzle-locked')) return;
    if (!selected) { selected = tile; tile.classList.add('puzzle-selected'); sfx.tap(); return; }
    const first = selected;
    first.classList.remove('puzzle-selected');
    selected = null;
    if (first === tile) return;                       // a atins aceeași bucată: renunță la selecție
    swaps++;
    swap(first, tile);
    const fresh = [first, tile].filter((t) => t.dataset.slot === t.dataset.index);
    fresh.forEach((t) => { t.classList.add('puzzle-locked'); t.disabled = true; });
    locked += fresh.length;
    setProgress(locked / n);
    if (fresh.length) sfx.pop(); else sfx.flip();
    if (locked === n) finish();
  }

  // Schimbă locurile (data-slot + `order` în grilă) și animează drumul fiecărei bucăți de la locul vechi la cel nou.
  function swap(a, b) {
    const before = [a, b].map((t) => t.getBoundingClientRect());
    [a.dataset.slot, b.dataset.slot] = [b.dataset.slot, a.dataset.slot];
    [a, b].forEach((t) => { t.style.order = t.dataset.slot; });
    [a, b].forEach((t, i) => {
      const r = t.getBoundingClientRect();
      t.style.transition = 'none';
      t.style.transform = `translate(${before[i].left - r.left}px, ${before[i].top - r.top}px)`;
    });
    void board.offsetWidth;                            // forțează reflow: tranziția pornește de la locul vechi
    [a, b].forEach((t) => { t.style.transition = ''; t.style.transform = ''; });
  }

  function finish() {
    done = true;
    board.classList.add('puzzle-done');
    sfx.win();
    setProgress(1);
    later(() => sayRo(T.spoken.puzzleDone), 200);
    later(() => onDone(swaps <= n ? 3 : swaps <= n * 2 ? 2 : 1), 1900);
  }

  return () => timers.forEach(clearTimeout);
}
