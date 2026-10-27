// Drumul prietenilor: DinoZ și UniCORN pe o hartă cu obstacole. Copilul pune piese de drum (drepte și
// curbe) până când drumul leagă eroii; apoi atinge un erou și acesta călătorește până la celălalt,
// iar la întâlnire apare o animație pe tot ecranul. Șase nivele, tot mai grele: hartă mai mare, mai
// multe obstacole, steluțe prin care trebuie să treacă drumul, un râu care se trece doar pe pod,
// piese numărate și ajutoare limitate.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { unicornSVG, dinoSVG } from '../art.js';

export const LEVELS = {
  1: { size: 5, obstacles: 3, hints: 99, stars: 0, river: false, limited: false, corners: true },
  2: { size: 5, obstacles: 4, hints: 5, stars: 0, river: false, limited: false, corners: false },
  3: { size: 6, obstacles: 5, hints: 4, stars: 1, river: false, limited: false, corners: false },
  4: { size: 6, obstacles: 4, hints: 4, stars: 1, river: true, limited: false, corners: false },
  5: { size: 7, obstacles: 7, hints: 3, stars: 2, river: false, limited: true, corners: false },
  6: { size: 7, obstacles: 6, hints: 3, stars: 2, river: true, limited: true, corners: false },
};
export const LEVEL_COUNT = Object.keys(LEVELS).length;

const PIECES = { h: ['w', 'e'], v: ['n', 's'], ne: ['n', 'e'], nw: ['n', 'w'], se: ['s', 'e'], sw: ['s', 'w'], bh: ['w', 'e'], bv: ['n', 's'] };
const BRIDGES = ['bh', 'bv'];
const DIR = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const OBSTACLES = ['🌳', '🪨', '🌋', '🌲', '🏔️', '🌵'];
const key = (x, y) => `${x},${y}`;
const rand = (n) => Math.floor(Math.random() * n);

export function tileSVG(type) {
  const [a, b] = PIECES[type];
  const pt = { n: [50, 0], s: [50, 100], e: [100, 50], w: [0, 50] };
  const [x1, y1] = pt[a], [x2, y2] = pt[b];
  const straight = a === 'n' && b === 's' || a === 'w' && b === 'e';
  const d = straight ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} Q 50 50 ${x2} ${y2}`;
  const bridge = BRIDGES.includes(type);
  const rails = bridge ? (type === 'bh'
    ? '<path d="M0 26 L100 26 M0 74 L100 74" stroke="#5D4037" stroke-width="8" stroke-dasharray="12 6"/>'
    : '<path d="M26 0 L26 100 M74 0 L74 100" stroke="#5D4037" stroke-width="8" stroke-dasharray="12 6"/>') : '';
  return new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="tile"><path d="${d}" stroke="${bridge ? '#A1887F' : '#8D6E63'}" stroke-width="42" fill="none"/><path d="${d}" stroke="#FFF3B0" stroke-width="5" stroke-dasharray="10 9" fill="none"/>${rails}</svg>`,
    'image/svg+xml').documentElement;
}

const pieceFor = (inDir, outDir, water) => {
  const base = Object.keys(PIECES).find((k) => !BRIDGES.includes(k) && PIECES[k].includes(inDir) && PIECES[k].includes(outDir) && inDir !== outDir);
  return water ? (base === 'h' ? 'bh' : 'bv') : base;
};

// Drumul cel mai scurt între două celule; pe apă se merge doar drept (acolo intră un pod).
function findPath(map, from, to, blocked = new Set()) {
  const { size, obstacles, water } = map;
  const start = `${from.x},${from.y},`;
  const parent = { [start]: null };
  const queue = [[from.x, from.y, '']];
  while (queue.length) {
    const [x, y, dirIn] = queue.shift();
    if (x === to.x && y === to.y) {
      const path = [];
      for (let k = `${x},${y},${dirIn}`; k; k = parent[k]) { const [px, py] = k.split(','); path.unshift([Number(px), Number(py)]); }
      return path;
    }
    const dirs = water.has(key(x, y)) && dirIn ? [dirIn] : ['e', 's', 'n', 'w'];
    for (const d of dirs) {
      const nx = x + DIR[d][0], ny = y + DIR[d][1];
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const k = key(nx, ny);
      if (obstacles.has(k) || blocked.has(k)) continue;
      const nk = `${nx},${ny},${d}`;
      if (nk in parent) continue;
      parent[nk] = `${x},${y},${dirIn}`;
      queue.push([nx, ny, d]);
    }
  }
  return null;
}

// Drum prin toate steluțele (în ordinea cea mai scurtă), fără celule repetate.
function pathThrough(map) {
  const orders = map.stars.length === 2 ? [[0, 1], [1, 0]] : [map.stars.map((_, i) => i)];
  let best = null;
  for (const order of orders) {
    const stops = [map.A, ...order.map((i) => map.stars[i]), map.B];
    let full = [];
    let ok = true;
    for (let i = 0; i < stops.length - 1 && ok; i++) {
      const used = new Set(full.slice(0, -1).map(([x, y]) => key(x, y)));
      const seg = findPath(map, stops[i], stops[i + 1], used);
      if (!seg) { ok = false; break; }
      full = full.length ? full.concat(seg.slice(1)) : seg;
    }
    if (ok && (!best || full.length < best.length)) best = full;
  }
  return best;
}

function makeMap(level) {
  const L = LEVELS[level];
  const N = L.size;
  for (let tries = 0; tries < 400; tries++) {
    let A, B;
    if (L.corners) { A = { x: 0, y: 0 }; B = { x: N - 1, y: N - 1 }; }
    else {
      A = rand(2) ? { x: 0, y: rand(N) } : { x: rand(N), y: 0 };
      B = rand(2) ? { x: N - 1, y: rand(N) } : { x: rand(N), y: N - 1 };
      if (Math.abs(A.x - B.x) + Math.abs(A.y - B.y) < N) continue;
    }
    const near = (c, x, y) => Math.abs(c.x - x) + Math.abs(c.y - y) <= 1;
    const free = (x, y) => !near(A, x, y) && !near(B, x, y);
    const water = new Set();
    if (L.river) {
      const vertical = Math.abs(A.x - B.x) >= Math.abs(A.y - B.y);
      const line = 2 + rand(N - 4);
      for (let i = 0; i < N; i++) { const [x, y] = vertical ? [line, i] : [i, line]; if (!near(A, x, y) && !near(B, x, y)) water.add(key(x, y)); else { water.clear(); break; } }
      if (!water.size) continue;
    }
    const stars = [];
    while (stars.length < L.stars) {
      const x = rand(N), y = rand(N);
      if (!free(x, y) || water.has(key(x, y)) || stars.some((s) => s.x === x && s.y === y)) continue;
      stars.push({ x, y });
    }
    const obstacles = new Set();
    let guard = 0;
    while (obstacles.size < L.obstacles && guard++ < 200) {
      const x = rand(N), y = rand(N);
      const k = key(x, y);
      if (!free(x, y) || water.has(k) || stars.some((s) => s.x === x && s.y === y)) continue;
      obstacles.add(k);
    }
    const map = { level, size: N, A, B, water, stars, obstacles };
    const path = pathThrough(map);
    if (!path || path.length < N + 2) continue;
    const seen = new Set(path.map(([x, y]) => key(x, y)));
    if (seen.size !== path.length) continue;                   // fără celule repetate
    map.hintPath = path;
    return map;
  }
  // rezervă: harta simplă de nivel 1
  const map = { level, size: N, A: { x: 0, y: 0 }, B: { x: N - 1, y: N - 1 }, water: new Set(), stars: [], obstacles: new Set([key(2, 2)]) };
  map.hintPath = pathThrough(map);
  return map;
}

function piecesAlong(map, path) {
  const out = [];
  for (let i = 1; i < path.length - 1; i++) {
    const [px, py] = path[i - 1], [x, y] = path[i], [nx, ny] = path[i + 1];
    const inDir = Object.keys(DIR).find((d) => x + DIR[d][0] === px && y + DIR[d][1] === py);
    const outDir = Object.keys(DIR).find((d) => x + DIR[d][0] === nx && y + DIR[d][1] === ny);
    out.push({ x, y, type: pieceFor(inDir, outDir, map.water.has(key(x, y))) });
  }
  return out;
}

export function mount(root, ctx) {
  const { sayRo, sfx, setProgress, onDone, art = {}, level = 1 } = ctx;
  const L = LEVELS[level] || LEVELS[1];
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const map = makeMap(level);
  const N = map.size;
  const { A, B } = map;
  const isHero = (x, y) => (x === A.x && y === A.y) || (x === B.x && y === B.y);
  const grid = Array.from({ length: N }, () => Array(N).fill(null));
  const needed = piecesAlong(map, map.hintPath);
  const stock = {};
  if (L.limited) {
    for (const t of Object.keys(PIECES)) stock[t] = needed.filter((p) => p.type === t).length + (t === 'h' || t === 'v' ? 2 : BRIDGES.includes(t) ? 1 : 1);
  }
  let selected = 'h';
  let hintsLeft = L.hints;
  let hintsUsed = 0;
  let ready = false;
  let traveling = false;

  // ---- tabla ----
  const cells = [];
  const board = h('div', { class: 'board', style: { '--n': String(N) }, dataset: { level: String(level), size: String(N) } });
  const cellsEl = h('div', { class: 'cells', style: { gridTemplateColumns: `repeat(${N}, 1fr)`, gridTemplateRows: `repeat(${N}, 1fr)` } });
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = key(x, y);
      const obstacle = map.obstacles.has(k);
      const water = map.water.has(k);
      const star = map.stars.some((s) => s.x === x && s.y === y);
      const cell = h('button', {
        class: 'cell' + (obstacle ? ' obstacle' : '') + (water ? ' water' : '') + (star ? ' star' : '') + (isHero(x, y) ? ' hero-cell' : ''),
        dataset: { x: String(x), y: String(y), ...(water ? { water: '1' } : {}), ...(star ? { star: '1' } : {}) }, 'aria-label': `${x + 1},${y + 1}`,
        disabled: obstacle || isHero(x, y),
        onClick: () => place(x, y),
      }, obstacle ? h('span', { class: 'obstacle-emoji' }, OBSTACLES[(x * 7 + y * 3 + level) % OBSTACLES.length]) : null,
        star ? h('span', { class: 'star-emoji' }, '⭐') : null);
      cells.push(cell);
      cellsEl.append(cell);
    }
  }
  const heroA = h('div', { class: 'rhero dino', style: { '--x': String(A.x), '--y': String(A.y) }, dataset: { hero: 'dino' } }, dinoSVG('trex', { fills: art['dino-trex'] }), h('span', { class: 'rhero-name' }, T.heroes.dino));
  const heroB = h('div', { class: 'rhero unicorn', style: { '--x': String(B.x), '--y': String(B.y) }, dataset: { hero: 'unicorn' } }, unicornSVG({ fills: art['unicorn-1'] }), h('span', { class: 'rhero-name' }, T.heroes.unicorn));
  const natural = (svg) => svg.dataset.faces || 'left';
  const setFacing = (hero, dir) => { const svg = hero.querySelector('svg'); svg.classList.toggle('flipped', natural(svg) !== (dir === 'e' ? 'right' : 'left')); };
  setFacing(heroA, B.x >= A.x ? 'e' : 'w');
  setFacing(heroB, A.x <= B.x ? 'w' : 'e');
  heroA.addEventListener('click', () => travel(heroA, heroB));
  heroB.addEventListener('click', () => travel(heroB, heroA));
  board.append(cellsEl, heroA, heroB);

  // ---- piese ----
  const types = Object.keys(PIECES).filter((t) => !BRIDGES.includes(t) || L.river);
  const pieceBtns = {};
  const palette = h('div', { class: 'road-palette' }, [
    ...types.map((type) => (pieceBtns[type] = h('button', { class: 'road-piece' + (type === selected ? ' on' : ''), dataset: { piece: type }, 'aria-label': type, onClick: (e) => select(type, e.currentTarget) },
      tileSVG(type), L.limited ? h('span', { class: 'count' }, String(stock[type])) : null))),
    h('button', { class: 'road-piece eraser', dataset: { piece: 'erase' }, 'aria-label': T.eraser, onClick: (e) => select('erase', e.currentTarget) }, '🧽'),
    h('button', { class: 'road-piece hint-btn', dataset: { hint: '' }, 'aria-label': T.hint, onClick: hint }, '💡', hintsLeft < 99 ? h('span', { class: 'count' }, String(hintsLeft)) : null),
  ]);
  const status = h('p', { class: 'instruction' }, T.spoken.roadIntro);
  const title = h('div', { class: 'page-title' }, `${T.level} ${level} · ${N}×${N}` + (L.stars ? ` · ${T.roadFeatures.stars}` : '') + (L.river ? ` · ${T.roadFeatures.river}` : '') + (L.limited ? ` · ${T.roadFeatures.limited}` : ''));

  root.replaceChildren(h('div', { class: 'game road' }, title, board, status, palette));
  setProgress(0);
  later(() => sayRo(T.spoken.roadIntro), 300);
  const extra = L.stars ? T.spoken.roadStars : L.river ? T.spoken.roadRiver : L.limited ? T.spoken.roadLimited : null;
  if (extra) later(() => sayRo(extra), 4200);

  function select(type, btn) {
    selected = type;
    sfx.tap();
    palette.querySelectorAll('.road-piece').forEach((b) => b.classList.toggle('on', b === btn));
  }
  const cellAt = (x, y) => cells[y * N + x];
  const refreshStock = () => { if (L.limited) for (const t of types) { pieceBtns[t].querySelector('.count').textContent = String(stock[t]); pieceBtns[t].classList.toggle('empty', stock[t] <= 0); } };

  function place(x, y) {
    if (traveling) return;
    const cell = cellAt(x, y);
    const water = map.water.has(key(x, y));
    cell.classList.remove('ghost');
    if (selected === 'erase') {
      if (grid[y][x]) { if (L.limited) stock[grid[y][x]]++; grid[y][x] = null; cell.replaceChildren(...[...cell.children].filter((c) => !c.classList.contains('tile'))); sfx.flip(); refreshStock(); }
      check();
      return;
    }
    if (water && !BRIDGES.includes(selected)) { sfx.wrong(); sayRo(T.spoken.roadWaterOnly); return; }
    if (!water && BRIDGES.includes(selected)) { sfx.wrong(); sayRo(T.spoken.roadLandOnly); return; }
    if (L.limited && stock[selected] <= 0 && grid[y][x] !== selected) { sfx.wrong(); return; }
    if (L.limited) { if (grid[y][x]) stock[grid[y][x]]++; stock[selected]--; }
    grid[y][x] = selected;
    cell.querySelectorAll('.tile').forEach((t) => t.remove());
    cell.append(tileSVG(selected));
    sfx.pop();
    refreshStock();
    check();
  }

  // Drumul leagă eroii? (parcurgere pe deschiderile pieselor; trebuie să treacă și pe la steluțe)
  function connectedPath() {
    const parent = { [key(A.x, A.y)]: null };
    const queue = [[A.x, A.y]];
    while (queue.length) {
      const [x, y] = queue.shift();
      for (const d of ['e', 's', 'n', 'w']) {
        const nx = x + DIR[d][0], ny = y + DIR[d][1];
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const k = key(nx, ny);
        if (k in parent) continue;
        const fromOk = isHero(x, y) || (grid[y][x] && PIECES[grid[y][x]].includes(d));
        const toOk = isHero(nx, ny) || (grid[ny][nx] && PIECES[grid[ny][nx]].includes(OPP[d]));
        if (!fromOk || !toOk) continue;
        parent[k] = key(x, y);
        if (nx === B.x && ny === B.y) {
          const path = [];
          for (let p = k; p; p = parent[p]) path.unshift(p.split(',').map(Number));
          return path;
        }
        queue.push([nx, ny]);
      }
    }
    return null;
  }
  const starsOn = (path) => map.stars.every((s) => path.some(([x, y]) => x === s.x && y === s.y));

  function check() {
    const path = connectedPath();
    const placedCount = grid.flat().filter(Boolean).length;
    setProgress(Math.min(0.9, placedCount / Math.max(1, needed.length)));
    const complete = !!path && starsOn(path);
    if (complete && !ready) {
      ready = true;
      board.classList.add('ready');
      status.textContent = T.spoken.roadReady;
      sfx.sparkle();
      later(() => sayRo(T.spoken.roadReady), 100);
    } else if (!complete && ready) {
      ready = false;
      board.classList.remove('ready');
      status.textContent = T.spoken.roadIntro;
    } else if (path && !complete) {
      status.textContent = T.spoken.roadStars;
    }
  }

  // Ajutor: arată piesa potrivită în prima celulă a drumului-model care nu e corectă încă.
  function hint() {
    if (traveling || ready) return;
    if (hintsLeft <= 0) { sfx.wrong(); sayRo(T.spoken.roadNoHints); return; }
    sfx.tap();
    for (const p of needed) {
      if (grid[p.y][p.x] !== p.type) {
        hintsLeft--; hintsUsed++;
        const badge = palette.querySelector('.hint-btn .count');
        if (badge) badge.textContent = String(hintsLeft);
        const cell = cellAt(p.x, p.y);
        cell.querySelectorAll('.tile').forEach((t) => t.remove());
        cell.append(tileSVG(p.type));
        cell.classList.add('ghost');
        selected = p.type;
        palette.querySelectorAll('.road-piece').forEach((b) => b.classList.toggle('on', b.dataset.piece === p.type));
        later(() => sayRo(T.spoken.roadHint), 50);
        return;
      }
    }
  }

  // Eroul atins călătorește pe drum până la celălalt erou; steluțele de pe drum se culeg.
  function travel(hero, other) {
    if (!ready || traveling) return;
    const path = connectedPath();
    if (!path) return;
    traveling = true;
    board.classList.add('traveling');
    sfx.tap();
    const steps = hero === heroA ? path.slice(1, -1) : path.slice(1, -1).reverse();
    let i = 0;
    let cx = hero === heroA ? A.x : B.x;
    const step = () => {
      if (i >= steps.length) { meet(); return; }
      const [x, y] = steps[i++];
      if (x > cx) setFacing(hero, 'e');
      if (x < cx) setFacing(hero, 'w');
      cx = x;
      hero.style.setProperty('--x', String(x));
      hero.style.setProperty('--y', String(y));
      hero.classList.add('hop');
      later(() => hero.classList.remove('hop'), 380);
      const cell = cellAt(x, y);
      if (cell.classList.contains('star') && !cell.classList.contains('collected')) {
        cell.classList.add('collected');
        sfx.sparkle();
        later(() => sayRo(T.spoken.roadStarGot), 50);
      } else sfx.pop();
      later(step, 460);
    };
    later(step, 100);
  }

  function meet() {
    sfx.win();
    setProgress(1);
    const overlay = h('div', { class: 'meet' },
      h('div', { class: 'meet-stage' },
        h('div', { class: 'meet-hero left' }, dinoSVG('trex', { fills: art['dino-trex'] })),
        h('div', { class: 'meet-hero right' }, unicornSVG({ fills: art['unicorn-1'] }))),
      h('div', { class: 'hearts' }, Array.from({ length: 14 }, (_, i) => h('span', { class: 'heart', style: { '--i': String(i), '--l': `${6 + (i * 37) % 88}%`, '--d': `${(i * 0.23) % 1.6}s` } }, ['💖', '💕', '✨', '💗', '🌟'][i % 5]))),
      h('h2', { class: 'meet-title' }, `${T.heroes.dino} 💕 ${T.heroes.unicorn}`),
      h('p', { class: 'meet-sub' }, T.metTitle));
    root.append(overlay);
    later(() => overlay.classList.add('hug'), 1300);
    later(() => sayRo(T.spoken.roadMeet), 1400);
    later(() => onDone(score()), 4200);
  }

  const score = () => (hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1);
  return () => timers.forEach(clearTimeout);
}
