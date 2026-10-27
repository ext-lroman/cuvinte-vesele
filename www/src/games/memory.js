// Memorie: perechi de imagini (imagine ↔ imagine), cuvântul se aude la fiecare întoarcere.
// 4 perechi la început; 6 perechi după ce jocul a fost câștigat cu 3 stele.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';

export function mount(root, ctx) {
  const { words, wordOf, say, sfx, setProgress, onDone, best = 0 } = ctx;
  const pairs = Math.min(best >= 3 ? 6 : 4, words.length);
  const chosen = shuffle(words).slice(0, pairs);
  const cards = shuffle(chosen.flatMap((w) => [{ w, kind: 'a' }, { w, kind: 'b' }]));
  let first = null, lock = false, matched = 0, moves = 0;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  const info = h('div', { class: 'info' }, `${T.moves}: 0`);
  const grid = h('div', { class: 'memory-grid' + (cards.length <= 8 ? ' easy' : '') });

  cards.forEach((c) => {
    const el = h('button', { class: 'mcard', dataset: { word: wordOf(c.w), kind: c.kind }, 'aria-label': wordOf(c.w) },
      h('span', { class: 'inner' },
        h('span', { class: 'face back' }, '❓'),
        h('span', { class: 'face front' }, h('span', { class: 'm-emoji' }, c.w.emoji))));
    el.addEventListener('click', () => flip(el, c));
    grid.append(el);
  });

  function flip(el, c) {
    if (lock || el.classList.contains('flipped') || el.classList.contains('matched')) return;
    sfx.flip();
    el.classList.add('flipped');
    say(c.w);
    if (!first) { first = { el, c }; return; }

    moves++;
    info.textContent = `${T.moves}: ${moves}`;
    const f = first;
    first = null;

    if (f.c.w === c.w) {
      el.classList.add('matched');
      f.el.classList.add('matched');
      matched++;
      later(() => sfx.correct(), 250);
      setProgress(matched / chosen.length);
      if (matched === chosen.length) later(() => onDone(score()), 900);
    } else {
      lock = true;
      later(() => { el.classList.remove('flipped'); f.el.classList.remove('flipped'); lock = false; }, 900);
    }
  }

  const score = () => (moves <= chosen.length + 2 ? 3 : moves <= chosen.length + 6 ? 2 : 1);
  root.replaceChildren(h('div', { class: 'game memory' }, info, grid));
  setProgress(0);
  return () => timers.forEach(clearTimeout);
}
