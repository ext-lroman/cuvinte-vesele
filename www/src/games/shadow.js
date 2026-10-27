// A cui e umbra? — vezi o siluetă neagră și alegi imaginea potrivită din 3.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';

const ROUNDS = 6;

export function mount(root, ctx) {
  const { words, wordOf, say, sayRo, sfx, setProgress, onDone } = ctx;
  const seq = shuffle(words).slice(0, Math.min(ROUNDS, words.length));
  let round = 0, mistakes = 0, locked = false;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  function draw() {
    const target = seq[round];
    const options = shuffle([target, ...shuffle(words.filter((w) => w !== target)).slice(0, 2)]);
    setProgress(round / seq.length);
    locked = false;

    root.replaceChildren(h('div', { class: 'game shadow' },
      h('button', { class: 'prompt', onClick: () => { sfx.tap(); sayRo(T.spoken.shadow); } },
        h('span', { class: 'speaker-big' }, '🔊'), h('span', { class: 'prompt-text small' }, T.spoken.shadow)),
      h('div', { class: 'shadow-box' }, h('span', { class: 'shadow-emoji', dataset: { word: wordOf(target) } }, target.emoji)),
      h('div', { class: 'choices three' }, options.map((o) =>
        h('button', { class: 'choice', 'aria-label': wordOf(o), dataset: { word: wordOf(o) }, onClick: (e) => pick(o, e.currentTarget) },
          h('span', { class: 'choice-emoji' }, o.emoji))))));
    later(() => sayRo(T.spoken.shadow), 250);

    function pick(o, btn) {
      if (locked) return;
      if (o === target) {
        locked = true;
        btn.classList.add('correct');
        root.querySelector('.shadow-emoji').classList.add('revealed');
        sfx.correct();
        later(() => say(target), 350);
        round++;
        later(() => { if (round >= seq.length) { setProgress(1); onDone(score()); } else draw(); }, 1300);
      } else {
        mistakes++;
        btn.classList.add('wrong');
        btn.disabled = true;
        sfx.wrong();
      }
    }
  }

  const score = () => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
  draw();
  return () => timers.forEach(clearTimeout);
}
