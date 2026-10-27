// Câte sunt? — numără imaginile (le poți atinge pe rând) și alege cifra potrivită din 3.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { NUMBER_WORDS, COUNT_FAVORITES } from '../content.js';

const ROUNDS = 6;

export function mount(root, ctx) {
  const { topic, words, lang, speak, sayRo, sfx, setProgress, onDone, best = 0 } = ctx;
  const max = best >= 3 ? 6 : 5;
  const tag = lang === 'en' ? 'en-US' : 'ro-RO';
  const numWord = (n) => NUMBER_WORDS[lang][n];
  let round = 0, mistakes = 0, locked = false;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  function draw() {
    const n = 1 + Math.floor(Math.random() * max);
    const pool = topic.id === 'numere' ? COUNT_FAVORITES : words.map((w) => w.emoji);
    const emoji = pool[Math.floor(Math.random() * pool.length)];
    const others = shuffle([1, 2, 3, 4, 5, 6].filter((k) => k !== n && k <= max)).slice(0, 2);
    const options = shuffle([n, ...others]);
    let counted = 0;
    setProgress(round / ROUNDS);
    locked = false;

    const items = h('div', { class: 'count-items', dataset: { n: String(n) } }, Array.from({ length: n }, () =>
      h('button', { class: 'count-item', 'aria-label': emoji, onClick: (e) => {
        const el = e.currentTarget;
        if (el.classList.contains('counted')) return;
        el.classList.add('counted');
        counted++;
        sfx.pop();
        speak(numWord(counted), { lang: tag });
      } }, emoji)));

    root.replaceChildren(h('div', { class: 'game count' },
      h('button', { class: 'prompt', onClick: () => { sfx.tap(); sayRo(T.spoken.count); } },
        h('span', { class: 'speaker-big' }, '🔊'), h('span', { class: 'prompt-text small' }, T.spoken.count)),
      items,
      h('div', { class: 'numbers' }, options.map((k) =>
        h('button', { class: 'num', dataset: { n: String(k) }, onClick: (e) => pick(k, e.currentTarget) }, String(k))))));
    later(() => sayRo(T.spoken.count), 250);

    function pick(k, btn) {
      if (locked) return;
      if (k === n) {
        locked = true;
        btn.classList.add('correct');
        sfx.correct();
        later(() => speak(numWord(n), { lang: tag }), 350);
        round++;
        later(() => { if (round >= ROUNDS) { setProgress(1); onDone(score()); } else draw(); }, 1200);
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
