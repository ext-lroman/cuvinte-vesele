// Scrie cuvântul: alcătuiești cuvântul din litere amestecate (cele mai scurte 6 cuvinte ale temei).
import { h, shuffle } from '../ui.js';

const COUNT = 6;

export function mount(root, ctx) {
  const { words, wordOf, subOf, say, sfx, setProgress, onDone } = ctx;
  const letterWords = words.filter((w) => /^\p{L}+$/u.test(wordOf(w)));
  const chosen = shuffle(letterWords.sort((a, b) => wordOf(a).length - wordOf(b).length).slice(0, Math.min(COUNT, letterWords.length)));
  let i = 0, mistakes = 0;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  function scrambled(letters) {
    if (letters.length < 2) return letters.map((ch, k) => ({ ch, k }));
    let order;
    for (let tries = 0; tries < 10; tries++) {
      order = shuffle(letters.map((ch, k) => ({ ch, k })));
      if (order.some((t, idx) => t.ch !== letters[idx])) break;   // nu lăsăm cuvântul gata „din greșeală”
    }
    return order;
  }

  function draw() {
    const w = chosen[i];
    const word = wordOf(w);
    const letters = word.split('');
    let pos = 0, wrongHere = 0, done = false;
    setProgress(i / chosen.length);

    const slots = letters.map(() => h('span', { class: 'slot' }));
    const tileEls = scrambled(letters).map((t) =>
      h('button', { class: 'tile', dataset: { letter: t.ch }, 'aria-label': `litera ${t.ch}`, onClick: (e) => tap(t.ch, e.currentTarget) }, t.ch));

    root.replaceChildren(
      h('div', { class: 'game spell' },
        h('button', { class: 'spell-pic', dataset: { word }, 'aria-label': `Ascultă: ${word}`, onClick: () => { sfx.tap(); say(w); } },
          h('span', { class: 'spell-emoji' }, w.emoji),
          h('span', { class: 'speaker' }, '🔊')),
        subOf(w) && h('div', { class: 'spell-sub' }, subOf(w)),
        h('div', { class: 'slots' }, slots),
        h('div', { class: 'tiles' }, tileEls)));
    later(() => say(w), 250);

    function tap(ch, el) {
      if (done) return;
      if (ch.toLowerCase() === letters[pos].toLowerCase()) {
        slots[pos].textContent = letters[pos];
        slots[pos].classList.add('filled');
        el.classList.add('used');
        el.disabled = true;
        tileEls.forEach((x) => x.classList.remove('hint'));
        pos++;
        wrongHere = 0;
        sfx.tap();
        if (pos >= letters.length) {
          done = true;
          sfx.correct();
          say(w);
          i++;
          later(() => { if (i >= chosen.length) { setProgress(1); onDone(score()); } else draw(); }, 1100);
        }
      } else {
        mistakes++;
        wrongHere++;
        sfx.wrong();
        el.classList.remove('shake');
        void el.offsetWidth;            // repornește animația
        el.classList.add('shake');
        if (wrongHere >= 2) {           // după două greșeli, arătăm litera corectă
          const need = letters[pos].toLowerCase();
          const hint = tileEls.find((x) => !x.disabled && x.dataset.letter.toLowerCase() === need);
          if (hint) hint.classList.add('hint');
        }
      }
    }
  }

  const score = () => (mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1);
  draw();
  return () => timers.forEach(clearTimeout);
}
