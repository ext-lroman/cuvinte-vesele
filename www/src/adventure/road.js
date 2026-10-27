// Drumul prietenilor: DinoZ (stânga-sus) și UniCORN (dreapta-jos) pe o hartă 5×5 cu obstacole.
// Copilul pune piese de drum (drepte și curbe) până când drumul leagă eroii; apoi atinge un erou
// și acesta călătorește pe drum până la celălalt, iar la întâlnire apare o animație pe tot ecranul.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { unicornSVG, dinoSVG } from '../art.js';

const N = 5;
const PIECES = { h: ['w', 'e'], v: ['n', 's'], ne: ['n', 'e'], nw: ['n', 'w'], se: ['s', 'e'], sw: ['s', 'w'] };
const DIR = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const OBSTACLES = ['🌳', '🪨', '🌋', '🌲', '🏔️'];
const A = { x: 0, y: 0 };
const B = { x: N - 1, y: N - 1 };
const key = (x, y) => `${x},${y}`;
const isHero = (x, y) => (x === A.x && y === A.y) || (x === B.x && y === B.y);

export function tileSVG(type) {
  const [a, b] = PIECES[type];
  const pt = { n: [50, 0], s: [50, 100], e: [100, 50], w: [0, 50] };
  const [x1, y1] = pt[a], [x2, y2] = pt[b];
  const straight = type === 'h' || type === 'v';
  const d = straight ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} Q 50 50 ${x2} ${y2}`;
  return new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="tile"><path d="${d}" stroke="#8D6E63" stroke-width="42" fill="none"/><path d="${d}" stroke="#FFF3B0" stroke-width="5" stroke-dasharray="10 9" fill="none"/></svg>`,
    'image/svg+xml').documentElement;
}

function pieceFor(inDir, outDir) {
  return Object.keys(PIECES).find((k) => PIECES[k].includes(inDir) && PIECES[k].includes(outDir) && inDir !== outDir);
}

// Drumul cel mai scurt pe celule libere (pentru hartă validă și pentru ajutor).
function shortestPath(obstacles) {
  const parent = { [key(A.x, A.y)]: null };
  const queue = [[A.x, A.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === B.x && y === B.y) break;
    for (const d of ['e', 's', 'n', 'w']) {
      const nx = x + DIR[d][0], ny = y + DIR[d][1];
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const k = key(nx, ny);
      if (k in parent || obstacles.has(k)) continue;
      parent[k] = key(x, y);
      queue.push([nx, ny]);
    }
  }
  if (!(key(B.x, B.y) in parent)) return null;
  const path = [];
  for (let k = key(B.x, B.y); k; k = parent[k]) path.unshift(k.split(',').map(Number));
  return path;
}

function makeMap() {
  for (let tries = 0; tries < 200; tries++) {
    const obstacles = new Set();
    const count = 2 + Math.floor(Math.random() * 2);
    while (obstacles.size < count) {
      const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
      if (x + y <= 1 || x + y >= 2 * N - 3) continue;        // nu lângă eroi
      obstacles.add(key(x, y));
    }
    const path = shortestPath(obstacles);
    if (path && path.length >= 7) return { obstacles, path };
  }
  return { obstacles: new Set([key(2, 2)]), path: shortestPath(new Set([key(2, 2)])) };
}

export function mount(root, ctx) {
  const { sayRo, sfx, setProgress, onDone, art = {} } = ctx;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const { obstacles, path: hintPath } = makeMap();
  const grid = Array.from({ length: N }, () => Array(N).fill(null));
  let selected = 'h';
  let hints = 0;
  let ready = false;
  let traveling = false;

  // ---- tabla ----
  const cells = [];
  const board = h('div', { class: 'board' });
  const cellsEl = h('div', { class: 'cells' });
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = key(x, y);
      const obstacle = obstacles.has(k);
      const cell = h('button', {
        class: 'cell' + (obstacle ? ' obstacle' : '') + (isHero(x, y) ? ' hero-cell' : ''),
        dataset: { x: String(x), y: String(y) }, 'aria-label': `${x + 1},${y + 1}`,
        disabled: obstacle || isHero(x, y),
        onClick: () => place(x, y),
      }, obstacle ? h('span', { class: 'obstacle-emoji' }, OBSTACLES[(x * 7 + y * 3) % OBSTACLES.length]) : null);
      cells.push(cell);
      cellsEl.append(cell);
    }
  }
  const heroA = h('div', { class: 'rhero dino', style: { '--x': '0', '--y': '0' }, dataset: { hero: 'dino' } }, dinoSVG('trex', { fills: art['dino-trex'] }), h('span', { class: 'rhero-name' }, T.heroes.dino));
  const heroB = h('div', { class: 'rhero unicorn', style: { '--x': String(N - 1), '--y': String(N - 1) }, dataset: { hero: 'unicorn' } }, unicornSVG({ fills: art['unicorn-1'] }), h('span', { class: 'rhero-name' }, T.heroes.unicorn));
  heroA.querySelector('svg').classList.add('face-right');
  heroA.addEventListener('click', () => travel(heroA, heroB));
  heroB.addEventListener('click', () => travel(heroB, heroA));
  board.append(cellsEl, heroA, heroB);

  // ---- piese ----
  const palette = h('div', { class: 'road-palette' }, [
    ...Object.keys(PIECES).map((type) => h('button', { class: 'road-piece' + (type === selected ? ' on' : ''), dataset: { piece: type }, 'aria-label': type, onClick: (e) => select(type, e.currentTarget) }, tileSVG(type))),
    h('button', { class: 'road-piece eraser', dataset: { piece: 'erase' }, 'aria-label': T.eraser, onClick: (e) => select('erase', e.currentTarget) }, '🧽'),
    h('button', { class: 'road-piece hint-btn', dataset: { hint: '' }, 'aria-label': T.hint, onClick: hint }, '💡'),
  ]);
  const status = h('p', { class: 'instruction' }, T.spoken.roadIntro);

  root.replaceChildren(h('div', { class: 'game road' }, board, status, palette));
  setProgress(0);
  later(() => sayRo(T.spoken.roadIntro), 300);

  function select(type, btn) {
    selected = type;
    sfx.tap();
    palette.querySelectorAll('.road-piece').forEach((b) => b.classList.toggle('on', b === btn));
  }

  function cellAt(x, y) { return cells[y * N + x]; }

  function place(x, y) {
    if (traveling) return;
    const cell = cellAt(x, y);
    cell.classList.remove('ghost');
    if (selected === 'erase') {
      if (grid[y][x]) { grid[y][x] = null; cell.replaceChildren(); sfx.flip(); }
    } else {
      grid[y][x] = selected;
      cell.replaceChildren(tileSVG(selected));
      sfx.pop();
    }
    check();
  }

  // Drumul leagă eroii? (parcurgere pe deschiderile pieselor)
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

  function check() {
    const path = connectedPath();
    const placedCount = grid.flat().filter(Boolean).length;
    setProgress(Math.min(0.9, placedCount / (hintPath.length - 2)));
    if (path && !ready) {
      ready = true;
      board.classList.add('ready');
      status.textContent = T.spoken.roadReady;
      sfx.sparkle();
      later(() => sayRo(T.spoken.roadReady), 100);
    } else if (!path && ready) {
      ready = false;
      board.classList.remove('ready');
      status.textContent = T.spoken.roadIntro;
    }
  }

  // Ajutor: arată piesa potrivită în prima celulă a drumului scurt care nu e corectă încă.
  function hint() {
    if (traveling || ready) return;
    sfx.tap();
    hints++;
    for (let i = 1; i < hintPath.length - 1; i++) {
      const [px, py] = hintPath[i - 1], [x, y] = hintPath[i], [nx, ny] = hintPath[i + 1];
      const inDir = Object.keys(DIR).find((d) => x + DIR[d][0] === px && y + DIR[d][1] === py);
      const outDir = Object.keys(DIR).find((d) => x + DIR[d][0] === nx && y + DIR[d][1] === ny);
      const need = pieceFor(inDir, outDir);
      if (grid[y][x] !== need) {
        const cell = cellAt(x, y);
        cell.replaceChildren(tileSVG(need));
        cell.classList.add('ghost');
        selected = need;
        palette.querySelectorAll('.road-piece').forEach((b) => b.classList.toggle('on', b.dataset.piece === need));
        later(() => sayRo(T.spoken.roadHint), 50);
        return;
      }
    }
  }

  // Eroul atins călătorește pe drum până la celălalt erou.
  function travel(hero, other) {
    if (!ready || traveling) return;
    const path = connectedPath();
    if (!path) return;
    traveling = true;
    board.classList.add('traveling');
    sfx.tap();
    const steps = hero === heroA ? path.slice(1, -1) : path.slice(1, -1).reverse();
    let i = 0;
    let [cx, cy] = hero === heroA ? [A.x, A.y] : [B.x, B.y];
    const step = () => {
      if (i >= steps.length) { meet(hero, other); return; }
      const [x, y] = steps[i++];
      const svg = hero.querySelector('svg');
      if (x > cx) svg.classList.add('face-right');
      if (x < cx) svg.classList.remove('face-right');
      cx = x; cy = y;
      hero.style.setProperty('--x', String(x));
      hero.style.setProperty('--y', String(y));
      hero.classList.add('hop');
      later(() => hero.classList.remove('hop'), 380);
      sfx.pop();
      later(step, 460);
    };
    later(step, 100);
  }

  function meet(hero, other) {
    const [ox, oy] = [Number(other.style.getPropertyValue('--x')), Number(other.style.getPropertyValue('--y'))];
    void ox; void oy;
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

  const score = () => (hints === 0 ? 3 : hints <= 2 ? 2 : 1);
  return () => timers.forEach(clearTimeout);
}
