// Ascultă și atinge: auzi un cuvânt, alegi imaginea potrivită din 4.
import { h, shuffle } from '../ui.js';

const ROUNDS = 6;

export function mount(root, ctx) {
  const { words, wordOf, say, sfx, setProgress, onDone } = ctx;
  const seq = shuffle(words).slice(0, Math.min(ROUNDS, words.length));
  let round = 0, mistakes = 0, locked = false;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  function draw() {
    const target = seq[round];
    const options = shuffle([target, ...shuffle(words.filter((w) => w !== target)).slice(0, 3)]);
    setProgress(round / seq.length);
    locked = false;

    const prompt = h('button', { class: 'prompt', 'aria-label': `Ascultă: ${wordOf(target)}`, onClick: () => { sfx.tap(); say(target); } },
      h('span', { class: 'speaker-big' }, '🔊'),
      h('span', { class: 'prompt-text', dataset: { word: wordOf(target) } }, wordOf(target)));

    const grid = h('div', { class: 'choices' }, options.map((o) =>
      h('button', { class: 'choice', 'aria-label': wordOf(o), dataset: { word: wordOf(o) }, onClick: (e) => pick(o, e.currentTarget) },
        h('span', { class: 'choice-emoji' }, o.emoji))));

    root.replaceChildren(h('div', { class: 'game listen' }, prompt, grid));
    later(() => say(target), 250);

    function pick(o, btn) {
      if (locked) return;
      if (o === target) {
        locked = true;
        btn.classList.add('correct');
        sfx.correct();
        round++;
        later(() => {
          if (round >= seq.length) { setProgress(1); onDone(score()); } else draw();
        }, 850);
      } else {
        mistakes++;
        btn.classList.add('wrong');
        btn.disabled = true;
        sfx.wrong();
        later(() => say(target), 400);
      }
    }
  }

  const score = () => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
  draw();
  return () => timers.forEach(clearTimeout);
}
