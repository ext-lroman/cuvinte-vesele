// Ce urmează? — continuă șirul de imagini: ABAB, apoi AABB, apoi ABC ABC; alegi din 3 imaginea care lipsește.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { TOPICS } from '../content.js';

const ROUNDS = 6;
// Șabloanele rundelor, de la ușor la greu. Ultima literă este răspunsul (locul cu „?”), restul se văd.
const TEMPLATES = ['ABABA', 'ABABAB', 'AABBA', 'AABBAA', 'ABCAB', 'ABCABC'];

export function mount(root, ctx) {
  const { wordOf, say, sayRo, sfx, preload, setProgress, onDone } = ctx;
  // Fără temă (de ex. ca pas în aventură) folosim cuvintele cu unicorni și dinozauri.
  // Șirurile ABC au nevoie de cel puțin 3 cuvinte; cu mai puține, rundele 5–6 ar rămâne fără al treilea cuvânt.
  const words = ctx.words && ctx.words.length >= 3 ? ctx.words : TOPICS.find((t) => t.id === 'magie').words;
  let round = 0, mistakes = 0, locked = false;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  function draw() {
    const tpl = TEMPLATES[round];
    const letters = [...new Set(tpl)];                                   // A, B (, C)
    const picks = shuffle(words).slice(0, letters.length);               // un cuvânt pentru fiecare literă
    const seq = [...tpl].map((ch) => picks[letters.indexOf(ch)]);
    const answer = seq[seq.length - 1];
    const shown = seq.slice(0, -1);
    // 3 variante: răspunsul, celelalte cuvinte din șir și, dacă mai e loc, un intrus din temă.
    const others = picks.filter((w) => w !== answer);
    const outsiders = shuffle(words.filter((w) => !picks.includes(w))).slice(0, 2 - others.length);
    const options = shuffle([answer, ...others, ...outsiders]);
    setProgress(round / ROUNDS);
    locked = false;

    // Căsuța cu „?” are doar clasa .pattern-slot (din CSS-ul declarat; `.filled` = animația „pop”). Fără `.slot` din „Scrie cuvântul”:
    // înălțimea ei fixă (60px, 52px pe telefon) o turtea la 96×60 lângă plăcuțele de 96×96, iar imaginea ieșea din chenar.
    const slot = h('button', { class: 'pattern-slot', 'aria-label': T.spoken.pattern, dataset: { answer: wordOf(answer) },
      onClick: () => { sfx.tap(); sayRo(T.spoken.pattern); } }, '?');
    const row = h('div', { class: 'pattern-row', 'aria-label': T.patternRow, dataset: { round: String(round + 1), kind: tpl } },
      shown.map((w) => h('button', { class: 'pattern-item', 'aria-label': wordOf(w), dataset: { word: wordOf(w) },
        onClick: () => { sfx.pop(); say(w); } }, w.emoji)),                 // atingi o imagine și o auzi
      slot);

    root.replaceChildren(h('div', { class: 'game pattern' },
      h('button', { class: 'prompt', onClick: () => { sfx.tap(); sayRo(T.spoken.pattern); } },
        h('span', { class: 'speaker-big' }, '🔊'), h('span', { class: 'prompt-text small' }, T.spoken.pattern)),
      row,
      h('div', { class: 'choices three' }, options.map((o) =>
        h('button', { class: 'choice', 'aria-label': wordOf(o), dataset: o === answer ? { word: wordOf(o), correct: '1' } : { word: wordOf(o) },
          onClick: (e) => pick(o, e.currentTarget) },
          h('span', { class: 'choice-emoji' }, o.emoji))))));
    later(() => sayRo(T.spoken.pattern), 250);

    function pick(o, btn) {
      if (locked) return;
      if (o === answer) {
        locked = true;
        btn.classList.add('correct');
        slot.textContent = answer.emoji;                                 // „?” se umple cu imaginea potrivită
        slot.classList.add('filled');
        sfx.correct();
        later(() => say(answer), 300);
        round++;
        later(() => { if (round >= ROUNDS) { setProgress(1); onDone(score()); } else draw(); }, 900);
      } else {
        mistakes++;
        btn.classList.add('wrong');
        btn.disabled = true;
        sfx.wrong();
        later(() => sayRo(T.spoken.patternWrong), 350);
      }
    }
  }

  const score = () => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
  preload([T.spoken.pattern, T.spoken.patternWrong], 'ro-RO');
  draw();
  return () => timers.forEach(clearTimeout);
}
