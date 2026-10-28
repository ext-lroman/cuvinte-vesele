// Hrănește dinozaurul: DinoZ cere o mâncare, iar tu o tragi din tavă până la gura lui. 6 runde, 4 mâncăruri pe rundă.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { dinoSVG, DINO_ANCHORS } from '../art.js';

const ROUNDS = 6;
// Mâncărurile: `id` este cheia din T.spoken.wantFood, `ro` se folosește doar pentru aria-label.
const FOODS = [
  { id: 'mar', ro: 'măr', emoji: '🍎' }, { id: 'banana', ro: 'banană', emoji: '🍌' },
  { id: 'morcov', ro: 'morcov', emoji: '🥕' }, { id: 'biscuit', ro: 'biscuit', emoji: '🍪' },
  { id: 'capsuna', ro: 'căpșună', emoji: '🍓' }, { id: 'pepene', ro: 'pepene', emoji: '🍉' },
  { id: 'branza', ro: 'brânză', emoji: '🧀' }, { id: 'paine', ro: 'pâine', emoji: '🍞' },
];

export function mount(root, ctx) {
  const { sayRo, sfx, preload, setProgress, onDone, art = {} } = ctx;
  const seq = shuffle(FOODS).slice(0, ROUNDS);          // 6 mâncăruri diferite, câte una pe rundă
  let round = 0, mistakes = 0, locked = false, target = seq[0];
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const want = (f) => T.spoken.wantFood[f.id];
  // Cererea întârziată se rostește doar dacă runda e tot aceeași: altfel DinoZ ar cere mâncarea abia mâncată și ar tăia „Mmm, delicios!”.
  const askLater = (ms) => { const r = round; later(() => { if (round === r) sayRo(want(target)); }, ms); };

  // Scena: dinozaurul (cu culorile din album, dacă a fost colorat) și gura lui ca zonă de drop.
  const { x, y } = DINO_ANCHORS.trex.mouth;
  const mouth = h('div', { class: 'feed-mouth', dataset: { target: 'mouth' }, style: { position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -50%)' } });
  const stage = h('div', { class: 'feed-stage', style: { position: 'relative' } }, dinoSVG('trex', { fills: art['dino-trex'] }), mouth);
  const prompt = h('button', { class: 'prompt feed-prompt', onClick: () => { sfx.tap(); sayRo(want(target)); } });
  const tray = h('div', { class: 'tray feed-tray' });
  root.replaceChildren(h('div', { class: 'game feed' }, prompt, stage, tray));
  if (preload) preload([T.spoken.feedIntro, T.spoken.yum, ...seq.map(want)], 'ro-RO');
  later(() => sayRo(T.spoken.feedIntro), 300);

  function draw() {
    target = seq[round];
    const options = shuffle([target, ...shuffle(FOODS.filter((f) => f !== target)).slice(0, 3)]);
    setProgress(round / ROUNDS);
    locked = false;
    prompt.setAttribute('aria-label', want(target));
    prompt.replaceChildren(
      h('span', { class: 'speaker-big' }, '🔊'),
      h('span', { class: 'feed-want', 'aria-hidden': 'true' }, target.emoji),
      h('span', { class: 'prompt-text small', dataset: { food: target.id } }, want(target)));
    tray.replaceChildren(...options.map((f) => {
      const el = h('button', { class: 'piece feed-piece', 'aria-label': f.ro, style: { touchAction: 'none' }, dataset: f === target ? { food: f.id, correct: '1' } : { food: f.id } },
        h('span', { class: 'piece-emoji' }, f.emoji));
      attachDrag(el, f);
      return el;
    }));
    askLater(round === 0 ? 2600 : 250);                   // prima rundă așteaptă să se termine introducerea
  }

  const within = (r, cx, cy, pad) => cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad;

  // Tragere cu pointer events (același tipar ca la cornul unicornului): piesa urmărește degetul, apoi fie e mâncată, fie se întoarce.
  function attachDrag(el, f) {
    let start = null, dx = 0, dy = 0;
    el.addEventListener('pointerdown', (e) => {
      if (locked || el.classList.contains('used') || el.classList.contains('wrong')) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY }; dx = 0; dy = 0;
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      dx = e.clientX - start.x; dy = e.clientY - start.y;
      el.style.transform = `translate(${dx}px, ${dy}px) scale(1.2)`;
    });
    const end = () => {
      if (!start) return;
      start = null;
      el.classList.remove('dragging');
      const r = el.getBoundingClientRect();
      const onMouth = within(mouth.getBoundingClientRect(), r.left + r.width / 2, r.top + r.height / 2, 40);
      if (onMouth && !locked) {
        if (f === target) return eat(el, dx, dy);
        refuse(el);
      }
      el.classList.add('returning');
      el.style.transform = '';
      later(() => el.classList.remove('returning'), 400);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // Mâncarea potrivită: se micșorează chiar la gură, dinozaurul ronțăie, apoi runda următoare.
  function eat(el, dx, dy) {
    locked = true;
    el.style.transform = `translate(${dx}px, ${dy}px) scale(.2)`;
    el.classList.add('used', 'correct');
    stage.classList.add('feed-chomp');
    sfx.pop();
    later(() => sfx.correct(), 250);
    later(() => sayRo(T.spoken.yum), 500);
    later(() => stage.classList.remove('feed-chomp'), 700);
    round++;
    later(() => { if (round >= ROUNDS) { setProgress(1); onDone(score()); } else draw(); }, 1700);
  }

  // Mâncare greșită la gură: dinozaurul scutură din cap, piesa se întoarce în tavă și rămâne stinsă, cererea se repetă.
  function refuse(el) {
    mistakes++;
    el.disabled = true;                                   // iese din joc imediat; clasa `wrong` vine după ce s-a întors în tavă
    sfx.wrong();
    stage.classList.add('feed-no');
    later(() => stage.classList.remove('feed-no'), 500);
    later(() => el.classList.add('wrong'), 400);
    askLater(500);
  }

  const score = () => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
  draw();
  return () => timers.forEach(clearTimeout);
}
