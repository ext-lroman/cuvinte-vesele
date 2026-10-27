// Îmbracă unicornul: trage accesoriile din tavă pe unicorn (cap, ochi, gât, spate, coadă).
// Nu există răspunsuri greșite — e joc liber; „Gata” se aprinde după cel puțin două accesorii purtate.
import { h } from '../ui.js';
import { T } from '../strings.js';
import { unicornSVG, UNICORN_ANCHORS } from '../art.js';

const ACCESSORIES = [
  { key: 'funda', emoji: '🎀' }, { key: 'coroana', emoji: '👑' }, { key: 'palarie', emoji: '🎩' }, { key: 'fular', emoji: '🧣' },
  { key: 'ochelari', emoji: '👓' }, { key: 'floare', emoji: '🌸' }, { key: 'balon', emoji: '🎈' },
];
const ZONES = ['head', 'eye', 'neck', 'back', 'tail'];   // fără corn: cornul are jocul lui
const SNAP = 60;                                          // px: cât de aproape de zonă trebuie lăsat accesoriul
const MIN_WORN = 2;                                       // câte accesorii purtate deblochează „Gata”

export function mount(root, ctx) {
  const { art = {}, sayRo, sfx, setProgress, onDone } = ctx;
  const worn = {};                                        // zonă → { piece (în tavă), el (pe unicorn) }
  let finishing = false;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const pct = (f) => `${(f * 100).toFixed(1)}%`;

  // Scena: unicornul colorat de ea (dacă există) + zonele de prindere, ancorate ca fracții din desen.
  const zoneEls = ZONES.map((z) => h('div', {
    class: 'dressup-zone', dataset: { zone: z }, 'aria-label': T.dressZones[z],
    style: { left: pct(UNICORN_ANCHORS[z].x), top: pct(UNICORN_ANCHORS[z].y) },
  }));
  const stage = h('div', { class: 'dressup-stage' }, unicornSVG({ fills: art['unicorn-1'] }), zoneEls);

  const prompt = h('button', { class: 'prompt', 'aria-label': T.spoken.dressIntro, onClick: () => { sfx.tap(); sayRo(T.spoken.dressIntro); } },
    h('span', { class: 'speaker-big' }, '🔊'),
    h('span', { class: 'prompt-text small' }, T.dressUpHint));

  const tray = h('div', { class: 'tray' }, ACCESSORIES.map((a) => {
    const el = h('button', { class: 'piece', dataset: { accessory: a.key }, 'aria-label': T.dressNames[a.key] },
      h('span', { class: 'piece-emoji' }, a.emoji));
    attachDrag(el, a);
    return el;
  }));

  const doneBtn = h('button', { class: 'btn primary big', dataset: { done: '' }, disabled: true, onClick: () => {
    if (finishing) return;
    finishing = true;
    doneBtn.disabled = true;
    stage.classList.add('happy');
    sfx.tap();
    sayRo(T.spoken.dressDone);
    later(() => onDone(3), 1000);
  } }, `${T.done} ✓`);

  root.replaceChildren(h('div', { class: 'game dressup' }, prompt, stage, tray, h('div', { class: 'nav-row' }, doneBtn)));
  setProgress(0);
  later(() => sayRo(T.spoken.dressIntro), 300);

  const refresh = () => {
    const count = Object.keys(worn).length;
    doneBtn.disabled = finishing || count < MIN_WORN;
    setProgress(Math.min(1, count / MIN_WORN));
  };

  // Zona cea mai apropiată de centrul piesei (sau null dacă e lăsată prea departe de orice zonă).
  const nearestZone = (el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bestD = SNAP;
    for (const z of zoneEls) {
      const zr = z.getBoundingClientRect();
      const d = Math.hypot(zr.left + zr.width / 2 - cx, zr.top + zr.height / 2 - cy);
      if (d < bestD) { bestD = d; best = z; }
    }
    return best;
  };

  function wear(a, piece, zone) {
    if (worn[zone]) unwear(zone);                         // un singur accesoriu pe zonă: cel vechi se întoarce în tavă
    piece.classList.add('used');
    const el = h('button', {
      class: 'dressup-worn', dataset: { accessory: a.key, zone }, 'aria-label': T.dressNames[a.key],
      style: { left: pct(UNICORN_ANCHORS[zone].x), top: pct(UNICORN_ANCHORS[zone].y) },
      onClick: () => { if (finishing) return; sfx.pop(); unwear(zone); },   // atingi accesoriul purtat → se dă jos
    }, a.emoji);
    worn[zone] = { piece, el };
    stage.append(el);
    sfx.sparkle();
    later(() => sayRo(T.spoken.dressAccessory[a.key]), 150);
    refresh();
  }

  function unwear(zone) {
    const w = worn[zone];
    if (!w) return;
    delete worn[zone];
    w.el.remove();
    w.piece.classList.remove('used');
    refresh();
  }

  // Tragere cu pointer events (același tipar ca la „Pune cornul”): piesa urmează degetul prin transform.
  function attachDrag(el, a) {
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      if (finishing || el.classList.contains('used')) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY };
      el.classList.add('dragging');
      stage.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      el.style.transform = `translate(${e.clientX - start.x}px, ${e.clientY - start.y}px) scale(1.2)`;
      const near = nearestZone(el);
      zoneEls.forEach((z) => z.classList.toggle('near', z === near));
    });
    const end = () => {
      if (!start) return;
      start = null;
      el.classList.remove('dragging');
      stage.classList.remove('dragging');
      const zone = nearestZone(el);
      zoneEls.forEach((z) => z.classList.remove('near'));
      el.classList.add('returning');                      // în tavă piesa alunecă înapoi (sau se micșorează dacă e purtată)
      el.style.transform = '';
      later(() => el.classList.remove('returning'), 400);
      if (zone) wear(a, el, zone.dataset.zone);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  return () => timers.forEach(clearTimeout);
}
