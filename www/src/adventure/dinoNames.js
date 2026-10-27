// Numele dinozaurilor: întâi îi vezi pe rând și le auzi numele, apoi îi găsești după nume.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { DINOS } from '../content.js';
import { dinoSVG } from '../art.js';

const ROUNDS = 6;

export function mount(root, ctx) {
  const { lang, speak, sayRo, sfx, setProgress, onDone, art } = ctx;
  const tag = lang === 'en' ? 'en-US' : 'ro-RO';
  const nameOf = (d) => d[lang];
  const fillsOf = (d) => (art && art[`dino-${d.id}`]) || undefined;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  let i = 0;

  function learn() {
    const d = DINOS[i];
    setProgress((i + 1) / (DINOS.length + ROUNDS));
    root.replaceChildren(h('div', { class: 'game names' },
      h('button', { class: 'dino-card', dataset: { dino: d.id }, 'aria-label': nameOf(d), onClick: () => { sfx.flip(); speak(nameOf(d), { lang: tag }); } },
        dinoSVG(d.id, { fills: fillsOf(d) }),
        h('span', { class: 'dino-name' }, nameOf(d)),
        h('span', { class: 'speaker' }, '🔊')),
      h('div', { class: 'dots' }, DINOS.map((_, k) => h('span', { class: 'dot' + (k === i ? ' on' : k < i ? ' done' : '') }))),
      h('div', { class: 'nav-row' },
        h('button', { class: 'btn big', disabled: i === 0, onClick: () => { sfx.tap(); i--; learn(); } }, '← ', T.back),
        i < DINOS.length - 1
          ? h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); i++; learn(); } }, T.next, ' →')
          : h('button', { class: 'btn primary big', dataset: { quiz: '' }, onClick: () => { sfx.tap(); quiz(); } }, `🔍 ${T.findIt}`))));
    later(() => speak(nameOf(d), { lang: tag }), 300);
  }

  let round = 0, mistakes = 0, locked = false;
  const seq = [...shuffle(DINOS), DINOS[Math.floor(Math.random() * DINOS.length)]].slice(0, ROUNDS);

  function quiz() {
    const target = seq[round];
    const options = shuffle([target, ...shuffle(DINOS.filter((d) => d !== target)).slice(0, 2)]);
    setProgress((DINOS.length + round) / (DINOS.length + ROUNDS));
    locked = false;
    root.replaceChildren(h('div', { class: 'game names quiz' },
      h('button', { class: 'prompt', onClick: () => { sfx.tap(); sayRo(T.spoken.whereIs[target.id]); } },
        h('span', { class: 'speaker-big' }, '🔊'), h('span', { class: 'prompt-text small', dataset: { dino: target.id } }, T.whereIs(target.def))),
      h('div', { class: 'choices three dinos' }, options.map((o) =>
        h('button', { class: 'choice dino', 'aria-label': nameOf(o), dataset: { dino: o.id }, onClick: (e) => pick(o, e.currentTarget) }, dinoSVG(o.id, { fills: fillsOf(o) }))))));
    later(() => sayRo(T.spoken.whereIs[target.id]), 250);

    function pick(o, btn) {
      if (locked) return;
      if (o === target) {
        locked = true;
        btn.classList.add('correct');
        sfx.correct();
        later(() => speak(nameOf(o), { lang: tag }), 350);
        round++;
        later(() => { if (round >= ROUNDS) { setProgress(1); onDone(score()); } else quiz(); }, 1300);
      } else {
        mistakes++;
        btn.classList.add('wrong');
        btn.disabled = true;
        sfx.wrong();
      }
    }
  }

  const score = () => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
  learn();
  later(() => sayRo(T.spoken.namesIntro), 1400);
  return () => timers.forEach(clearTimeout);
}
