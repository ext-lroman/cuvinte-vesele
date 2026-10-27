// Care e diferit? — trei imagini din tema curentă și un „intrus” dintr-o altă temă; atinge-l pe cel care nu se potrivește.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { TOPICS } from '../content.js';

const ROUNDS = 6;

export function mount(root, ctx) {
  const { topic, words, lang, wordOf, say, sayRo, sfx, preload, setProgress, onDone } = ctx;
  const tag = lang === 'en' ? 'en-US' : 'ro-RO';
  // Șase teme diferite de cea curentă, câte una pe rundă — intrusul vine de fiecare dată din altă parte.
  const others = shuffle(TOPICS.filter((t) => t.id !== topic.id)).slice(0, ROUNDS);
  const rounds = others.map((t) => ({
    oddTopic: t,
    odd: t.words[Math.floor(Math.random() * t.words.length)],
    same: shuffle(words).slice(0, 3),
  }));
  let round = 0, mistakes = 0, locked = false;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  // Cuvintele intruse nu sunt din tema deschisă, deci nu au fost încărcate pe ecranul temei.
  preload(rounds.map((r) => wordOf(r.odd)), tag);

  function draw() {
    const { odd, oddTopic, same } = rounds[round];
    const options = shuffle([odd, ...same]);
    setProgress(round / ROUNDS);
    locked = false;

    const grid = h('div', { class: 'choices' }, options.map((o) => {
      const isOdd = o === odd;
      return h('button', {
        class: 'choice', 'aria-label': wordOf(o),
        dataset: { word: wordOf(o), topic: isOdd ? oddTopic.id : topic.id, ...(isOdd ? { odd: '1' } : {}) },
        onClick: (e) => pick(isOdd, e.currentTarget),
      }, h('span', { class: 'choice-emoji' }, o.emoji));
    }));

    root.replaceChildren(h('div', { class: 'game odd-one', dataset: { round: String(round + 1) } },
      h('button', { class: 'prompt', onClick: () => { sfx.tap(); sayRo(T.spoken.oddOne); } },
        h('span', { class: 'speaker-big' }, '🔊'), h('span', { class: 'prompt-text small' }, T.spoken.oddOne)),
      grid));
    later(() => sayRo(T.spoken.oddOne), 250);

    function pick(isOdd, btn) {
      if (locked) return;
      if (isOdd) {
        locked = true;
        btn.classList.add('correct');
        // Celelalte trei se estompează, ca să se vadă clar cine era intrusul.
        // (opacitatea e setată inline: app.css nu are regulă pentru .odd-one-dim, iar .choice are deja tranziție pe opacity)
        grid.querySelectorAll('.choice:not([data-odd])').forEach((c) => { c.classList.add('odd-one-dim'); c.style.opacity = '.35'; });
        sfx.correct();
        later(() => say(odd), 350);
        round++;
        later(() => { if (round >= ROUNDS) { setProgress(1); onDone(score()); } else draw(); }, 1300);
      } else {
        mistakes++;
        btn.classList.add('wrong');
        btn.disabled = true;
        sfx.wrong();
        later(() => sayRo(T.spoken.oddOne), 400);
      }
    }
  }

  const score = () => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
  draw();
  return () => timers.forEach(clearTimeout);
}
