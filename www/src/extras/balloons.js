// Sparge baloanele: baloanele urcă pe cer, iar ea atinge doar balonul cu imaginea pe care o aude.
// Joc de sine stătător (nu ține de o temă): la fiecare pornire alege o temă la întâmplare și cele 8 cuvinte ale ei.
import { h, shuffle } from '../ui.js';
import { T } from '../strings.js';
import { TOPICS } from '../content.js';

const GOAL = 6;          // câte baloane corecte trebuie sparte
const PER_TARGET = 2;    // după câte baloane sparte se schimbă cuvântul căutat
const SPAWN_MS = 1300;   // la cât timp apare un balon nou
const RISE_MS = 7000;    // cât durează urcarea unui balon până sus
const GRACE_MS = 2500;   // imediat după schimbarea cuvântului (până se aude cuvântul nou), balonul cu vechiul cuvânt nu e greșeală
const PALETTE = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'];

export function mount(root, ctx) {
  const { lang, wordOf, say, sayRo, sfx, preload, setProgress, onDone } = ctx;
  // fără tema Culori: baloanele au culori la întâmplare, iar „roșu” ar trimite copilul la balonul roșu, nu la cel cu cercul roșu
  const pool = TOPICS.filter((t) => t.id !== 'culori');
  const topic = pool[Math.floor(Math.random() * pool.length)];
  const { words } = topic;
  let target = null, prevTarget = null, switchedAt = 0;
  let pops = 0, mistakes = 0, spawned = 0, finished = false, spawner = null, sayTimer = null;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const other = (w) => shuffle(words.filter((x) => x !== w))[0];
  preload(words.map(wordOf), lang === 'en' ? 'en-US' : 'ro-RO');
  preload([T.spoken.balloonsIntro, T.spoken.balloonsFind], 'ro-RO');

  // --- interfața: pastila cu cuvântul căutat, scorul și cerul pe care urcă baloanele ---
  const promptEmoji = h('span', { class: 'balloons-target' });
  const promptText = h('span', { class: 'prompt-text small' });
  const prompt = h('button', { class: 'prompt balloons-prompt', onClick: () => { sfx.tap(); say(target); } },
    h('span', { class: 'speaker-big' }, '🔊'), promptEmoji, promptText);
  const score = h('div', { class: 'balloons-score', dataset: { score: '0' } }, `0/${GOAL}`);
  const heroes = h('div', { class: 'balloons-heroes', 'aria-hidden': 'true' },        // DinoZ și UniCORN privesc de jos
    h('span', { class: 'balloons-hero' }, '🦕'), h('span', { class: 'balloons-hero' }, '🦄'));
  const sky = h('div', { class: 'balloons-sky', dataset: { topic: topic.id } }, heroes);
  root.replaceChildren(h('div', { class: 'game balloons' }, h('div', { class: 'balloons-top' }, prompt, score), sky));

  // --- cuvântul căutat: se spune, se arată în pastilă și se remarchează baloanele deja pe cer ---
  function newTarget(first) {
    prevTarget = target;
    target = other(target);
    switchedAt = performance.now();
    promptEmoji.textContent = target.emoji;
    promptText.textContent = wordOf(target);
    promptText.dataset.word = wordOf(target);
    prompt.setAttribute('aria-label', `${T.balloonsPop} ${wordOf(target)}`);
    sky.querySelectorAll('.balloons-balloon').forEach((b) => {
      b.dataset.correct = b.dataset.word === wordOf(target) ? '1' : '0';
      // un balon atins greșit mai devreme (dezactivat) care are acum imaginea căutată trebuie să se poată sparge
      if (b.dataset.correct === '1' && !b.classList.contains('popped')) { b.disabled = false; b.classList.remove('wrong'); }
    });
    later(() => sayRo(first ? T.spoken.balloonsIntro : T.spoken.balloonsFind), first ? 300 : 150);
    // speak() oprește rostirea anterioară, deci lăsăm fraza să se termine (clipurile durează ~2,8 s și ~1,6 s);
    // la două schimbări la rând rămâne programată o singură rostire, ca să nu taie fraza nouă și să nu spună cuvântul de două ori
    clearTimeout(sayTimer); timers.delete(sayTimer);
    sayTimer = later(() => { if (!finished) say(target); }, first ? 3300 : 2000);
  }

  // --- baloanele: apar jos, la o poziție la întâmplare, și urcă (animație CSS); dispar când ajung sus ---
  function spawn() {
    const w = spawned % 2 === 0 || Math.random() < 0.25 ? target : other(target);   // cel puțin jumătate sunt cele căutate
    const btn = h('button', {
      class: 'balloons-balloon', 'aria-label': wordOf(w), dataset: { word: wordOf(w), correct: w === target ? '1' : '0' },
      style: {
        '--x': Math.random().toFixed(3), '--y': Math.random().toFixed(3), '--b': PALETTE[spawned % PALETTE.length],
        '--rise': `${sky.clientHeight + 190}px`, '--dur': `${Math.round(RISE_MS + (Math.random() - 0.5) * 1200)}ms`,
      },
      onClick: () => tap(w, btn),
    },
    h('span', { class: 'balloons-body' }, h('span', { class: 'balloons-emoji' }, w.emoji)),
    h('span', { class: 'balloons-string' }));
    spawned++;
    btn.addEventListener('animationend', (e) => { if (e.target === btn) btn.remove(); });
    later(() => btn.remove(), RISE_MS + 900);   // rezervă: și cu animațiile oprite balonul dispare
    sky.append(btn);
  }

  // --- atingerea unui balon ---
  function tap(w, btn) {
    if (finished || btn.disabled) return;
    btn.disabled = true;
    const justChanged = w === prevTarget && performance.now() - switchedAt < GRACE_MS;
    if (w === target || justChanged) {
      sfx.pop();
      btn.classList.add('popped');
      later(() => btn.remove(), 260);
      if (justChanged) return;                   // tocmai s-a schimbat cuvântul: nici punct, nici greșeală
      pops++;
      score.textContent = `${pops}/${GOAL}`;
      score.dataset.score = String(pops);
      score.classList.remove('correct'); void score.offsetWidth; score.classList.add('correct');
      heroes.classList.remove('hop'); void heroes.offsetWidth; heroes.classList.add('hop');
      setProgress(pops / GOAL);
      if (pops >= GOAL) finish();
      else if (pops % PER_TARGET === 0) newTarget(false);
    } else {
      mistakes++;
      sfx.wrong();
      btn.classList.add('wrong');
      later(() => { if (!finished) say(target); }, 500);   // după final nu mai repetăm cuvântul peste sunetul de victorie
    }
  }

  function finish() {
    finished = true;
    clearInterval(spawner);
    setProgress(1);
    sfx.correct();
    later(() => onDone(mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1), 700);
  }

  newTarget(true);
  later(() => { spawn(); spawner = setInterval(spawn, SPAWN_MS); }, 1200);
  return () => { clearInterval(spawner); timers.forEach(clearTimeout); };
}
