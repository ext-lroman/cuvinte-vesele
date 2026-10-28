// Cuvinte Vesele — aplicația: rute, ecrane, progres, aventura.
import { TOPICS, GAMES, AVATARS, ADVENTURE, EXTRAS, STICKER_GAMES } from './content.js';
import { T } from './strings.js';
import { load, save } from './storage.js';
import { speak, sfx, setSoundEnabled, hasVoice, unlockAudio, loadClips, preload, stopSpeech } from './audio.js';
import { h, confetti, starsEl } from './ui.js';
import { unicornSVG, dinoSVG } from './art.js';
import * as learn from './games/learn.js';
import * as listen from './games/listen.js';
import * as memory from './games/memory.js';
import * as shadow from './games/shadow.js';
import * as count from './games/count.js';
import * as spell from './games/spell.js';
import * as oddOne from './games/oddOne.js';
import * as pattern from './games/pattern.js';
import * as balloons from './extras/balloons.js';
import * as dressUp from './extras/dressUp.js';
import * as feedDino from './extras/feedDino.js';
import * as puzzle from './extras/puzzle.js';
import * as trace from './extras/trace.js';
import * as colorSort from './extras/colorSort.js';
import * as horn from './adventure/horn.js';
import * as coloring from './adventure/coloring.js';
import * as dinoNames from './adventure/dinoNames.js';
import * as rainbow from './adventure/rainbow.js';
import * as road from './adventure/road.js';
import { LEVELS as ROAD_LEVELS, LEVEL_COUNT as ROAD_LEVEL_COUNT } from './adventure/road.js';
import * as svgPage from './coloring/svgPage.js';
import * as rasterPage from './coloring/rasterPage.js';
import { setColoredThumb } from './coloring/store.js';
import { bookGrid, resolvePage, parentsCard, releaseURLs } from './coloring/book.js';
import { SONGS, mountMusic, musicParentsCard } from './music.js';

const MODULES = { learn, listen, memory, shadow, odd: oddOne, count, pattern, spell };
const EXTRA_MODULES = { balloons, dressUp, feedDino, puzzle, trace, colorSort };
const ADVENTURE_MODULES = { corn: horn, unicorni: coloring, dinozauri: coloring, nume: dinoNames, curcubeu: rainbow, drum: road };
const PARENT_KEY = 'cuvinte-vesele:parinte';
const ADVENTURE_STICKER = 'aventura';

const state = load();
state.stickers = state.stickers || [];
state.adventure = state.adventure || { steps: {}, art: {} };
state.adventure.steps = state.adventure.steps || {};
state.adventure.art = state.adventure.art || {};
state.roadLevels = state.roadLevels || {};             // nivelele 2+ ale Drumului prietenilor (nivelul 1 = pasul aventurii)
state.book = state.book || {};
state.extras = state.extras || {};                     // stelele jocurilor de sine stătătoare (ecranul „Jocuri”)                         // cartea de colorat: atingerile (punct + culoare) pe fiecare desen raster
const songs = () => state.songs || SONGS;              // lista de melodii a părintelui; lipsă = cea de început
setSoundEnabled(state.settings.sound);
const app = document.getElementById('app');
let cleanup = null;

document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });

// ---- limbă / voce -------------------------------------------------------
const langTag = () => (state.settings.lang === 'en' ? 'en-US' : 'ro-RO');
const wordOf = (w) => w[state.settings.lang];
const subOf = (w) => (state.settings.showTranslation ? w[state.settings.lang === 'en' ? 'ro' : 'en'] : null);
const sayWord = (w) => speak(wordOf(w), { lang: langTag() });
const sayRo = (text) => speak(text, { lang: 'ro-RO' });
const praise = () => T.spoken.praise[Math.floor(Math.random() * T.spoken.praise.length)];

// ---- progres --------------------------------------------------------------
const gamesFor = (t) => GAMES.filter((g) => !(g.skipIf && g.skipIf(t)) && !(g.needs && !state.settings[g.needs]));
const gameStars = (topicId, gameId) => (state.progress[topicId] || {})[gameId] || 0;
const topicStars = (t) => gamesFor(t).reduce((s, g) => s + gameStars(t.id, g.id), 0);
const topicMax = (t) => gamesFor(t).length * 3;
const topicDone = (t) => state.stickers.includes(t.id) || gamesFor(t).filter((g) => gameStars(t.id, g.id) > 0).length >= Math.min(STICKER_GAMES, gamesFor(t).length);
const adventureStars = () => ADVENTURE.reduce((s, st) => s + (state.adventure.steps[st.id] || 0), 0);
const roadStars = (n) => (n === 1 ? state.adventure.steps.drum || 0 : state.roadLevels[n] || 0);
const roadUnlocked = (n) => n === 1 || roadStars(n - 1) > 0;
const roadTotal = () => { let s = 0; for (let n = 2; n <= ROAD_LEVEL_COUNT; n++) s += roadStars(n); return s; };
const adventureDone = () => ADVENTURE.every((st) => (state.adventure.steps[st.id] || 0) > 0);
const extrasStars = () => EXTRAS.reduce((s, x) => s + (state.extras[x.id] || 0), 0);
const totalStars = () => TOPICS.reduce((s, t) => s + topicStars(t), 0) + adventureStars() + roadTotal() + extrasStars();

// ---- rute -----------------------------------------------------------------
function go(hash) {
  if (location.hash === hash) render(); else location.hash = hash;
}
const route = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

let renderToken = 0;
function render() {
  renderToken++;
  if (cleanup) { try { cleanup(); } catch { /* ignorat */ } cleanup = null; }
  releaseURLs();
  stopSpeech();
  app.replaceChildren();
  const [screen, a, b] = route();
  if (!state.profile) return renderOnboarding();
  switch (screen) {
    case 'tema': return renderTopic(a);
    case 'joc': return renderPlay(a, b);
    case 'aventura': return a === 'drum' ? (b ? renderRoadLevel(Number(b)) : renderRoadLevels()) : a ? renderAdventureStep(a) : renderAdventure();
    case 'abtibilduri': return renderStickers();
    case 'colorat': return a ? renderBookPage(a) : renderBook();
    case 'jocuri': return a ? renderExtra(a) : renderExtras();
    case 'muzica': return renderMusic();
    case 'parinti': return renderParents();
    default: return renderHome();
  }
}

function topbar({ back, title, right, backLabel = '←' }) {
  return h('header', { class: 'topbar' },
    back
      ? h('button', { class: 'icon-btn', 'aria-label': T.back, onClick: () => { sfx.tap(); go(back); } }, backLabel)
      : h('span', { class: 'icon-spacer' }),
    h('h1', { class: 'title' }, title),
    right || h('span', { class: 'icon-spacer' }));
}

// ---- ecrane ---------------------------------------------------------------
function renderOnboarding() {
  let avatar = AVATARS[0];
  const buttons = AVATARS.map((a) => h('button', {
    class: 'avatar' + (a === avatar ? ' selected' : ''), 'aria-label': a, dataset: { avatar: a },
    onClick: (e) => { sfx.tap(); avatar = a; buttons.forEach((b) => b.classList.toggle('selected', b === e.currentTarget)); },
  }, a));
  app.append(h('section', { class: 'screen onboarding' },
    h('div', { class: 'mascots' }, h('span', { class: 'mascot' }, '🦄'), h('h1', { class: 'logo' }, 'Cuvinte ', h('span', {}, 'Vesele')), h('span', { class: 'mascot late' }, '🦕')),
    h('p', { class: 'tagline' }, T.tagline),
    h('p', { class: 'lead' }, T.pickBuddy),
    h('div', { class: 'avatars' }, buttons),
    h('button', { class: 'btn primary big', onClick: () => {
      sfx.tap();
      state.profile = { name: '', avatar };
      save(state);
      go('#/acasa');
    } }, T.letsPlay)));
}

function renderHome() {
  const p = state.profile;
  const advDone = adventureDone();
  const advNext = ADVENTURE.find((st) => !(state.adventure.steps[st.id] > 0));
  app.append(h('section', { class: 'screen home' },
    h('header', { class: 'topbar' },
      h('button', { class: 'chip' + (p.name ? '' : ' avatar-only'), 'aria-label': T.stickerBook, onClick: () => { sfx.tap(); go('#/abtibilduri'); } },
        h('span', { class: 'chip-emoji' }, p.avatar), p.name && h('span', {}, p.name)),
      !p.name && h('span', { class: 'spacer' }),
      h('div', { class: 'chip stars-chip' }, '⭐ ', String(totalStars())),
      h('button', { class: 'icon-btn', 'aria-label': T.parents, onClick: () => { sfx.tap(); go('#/parinti'); } }, '🔒')),
    h('div', { class: 'scroll' },
      h('button', { class: 'adventure-card', dataset: { adventure: '' }, onClick: () => { sfx.tap(); go('#/aventura'); } },
        h('span', { class: 'adv-art' }, '🦄'),
        h('span', { class: 'adv-text' },
          h('span', { class: 'adv-title' }, T.adventureTitle),
          h('span', { class: 'adv-sub' }, advDone ? `🏅 ${T.magicSticker}` : advNext ? `${advNext.emoji} ${advNext.ro}` : T.adventureHint),
          h('span', { class: 'adv-stars' }, `⭐ ${adventureStars()}/${ADVENTURE.length * 3}`)),
        h('span', { class: 'adv-art' }, '🦕')),
      h('div', { class: 'home-cards' },
        h('button', { class: 'home-card', style: { '--c': '#FF8FAB' }, dataset: { home: 'book' }, onClick: () => { sfx.tap(); go('#/colorat'); } },
          h('span', { class: 'home-card-art' }, '🎨'), h('span', { class: 'home-card-title' }, T.book)),
        h('button', { class: 'home-card', style: { '--c': '#4CC9F0' }, dataset: { home: 'extras' }, onClick: () => { sfx.tap(); go('#/jocuri'); } },
          h('span', { class: 'home-card-art' }, '🎈'), h('span', { class: 'home-card-title' }, T.extras),
          h('span', { class: 'home-card-stars' }, `⭐ ${extrasStars()}/${EXTRAS.length * 3}`)),
        h('button', { class: 'home-card', style: { '--c': '#9B5DE5' }, dataset: { home: 'music' }, onClick: () => { sfx.tap(); go('#/muzica'); } },
          h('span', { class: 'home-card-art' }, '🎵'), h('span', { class: 'home-card-title' }, T.music))),
      h('h2', { class: 'section-title' }, T.pickTopic),
      h('div', { class: 'topics' }, TOPICS.map((t) => {
        const done = topicDone(t);
        return h('button', { class: 'topic-card', style: { '--c': t.color }, dataset: { topic: t.id }, onClick: () => { sfx.tap(); go(`#/tema/${t.id}`); } },
          h('span', { class: 'topic-emoji' }, t.emoji),
          h('span', { class: 'topic-name' }, t[state.settings.lang]),
          subOf(t) && h('span', { class: 'topic-sub' }, subOf(t)),
          h('span', { class: 'topic-progress' }, `⭐ ${topicStars(t)}/${topicMax(t)}`),
          done && h('span', { class: 'badge' }, '🏅'));
      }))),
    h('nav', { class: 'bottombar' },
      h('button', { class: 'btn', onClick: () => { sfx.tap(); go('#/abtibilduri'); } }, '📒 ', T.stickers))));
}

function renderTopic(id) {
  const t = TOPICS.find((x) => x.id === id);
  if (!t) return go('#/acasa');
  preload(t.words.map(wordOf), langTag());
  app.append(h('section', { class: 'screen', style: { '--c': t.color } },
    topbar({ back: '#/acasa', title: t[state.settings.lang], right: h('div', { class: 'chip' }, '⭐ ', String(topicStars(t))) }),
    h('div', { class: 'scroll' },
      h('div', { class: 'hero' },
        h('span', { class: 'hero-emoji' }, t.emoji),
        h('div', {}, h('h2', {}, t[state.settings.lang]), h('p', {}, `${t.words.length} ${T.words}`))),
      h('div', { class: 'games' }, gamesFor(t).map((g) =>
        h('button', { class: 'game-card', dataset: { game: g.id }, onClick: () => { sfx.tap(); go(`#/joc/${t.id}/${g.id}`); } },
          h('span', { class: 'game-icon' }, g.emoji),
          h('span', { class: 'game-text' },
            h('span', { class: 'game-name' }, g.ro),
            h('span', { class: 'game-hint' }, g.hint),
            starsEl(gameStars(t.id, g.id)))))))));
}

function playScreen({ back, title, color, mod, ctxExtra, onFinish }) {
  const fill = h('div', { class: 'fill' });
  const stage = h('main', { class: 'stage' });
  const screen = h('section', { class: 'screen play', style: { '--c': color } },
    topbar({ back, backLabel: '✕', title }),
    h('div', { class: 'progressbar', role: 'progressbar' }, fill),
    stage);
  app.append(screen);
  let finished = false;
  const ctx = {
    settings: state.settings, lang: state.settings.lang, wordOf, subOf, say: sayWord, sayRo, speak, sfx, preload,
    setProgress: (f) => { fill.style.width = `${Math.round(Math.max(0, Math.min(1, f)) * 100)}%`; },
    onDone: (stars) => { if (finished) return; finished = true; onFinish(stars, screen); },
    ...ctxExtra,
  };
  cleanup = mod.mount(stage, ctx) || null;
}

function renderPlay(topicId, gameId) {
  const t = TOPICS.find((x) => x.id === topicId);
  const g = gamesFor(t || {}).find((x) => x.id === gameId);
  const mod = MODULES[gameId];
  if (!t || !g || !mod) return go('#/acasa');
  playScreen({
    back: `#/tema/${t.id}`, title: `${g.emoji} ${g.ro}`, color: t.color, mod,
    ctxExtra: { topic: t, words: t.words, best: gameStars(t.id, g.id) },
    onFinish: (stars, screen) => finishGame(t, g, stars, screen),
  });
}

function resultOverlay(screen, { stars, text, extra, actions }) {
  screen.append(h('div', { class: 'overlay' },
    h('div', { class: 'result-card', role: 'dialog', 'aria-label': text },
      h('div', { class: 'result-stars' }, [0, 1, 2].map((i) => h('span', { class: i < stars ? 'lit' : '' }, '★'))),
      h('h2', {}, text),
      extra,
      h('div', { class: 'result-actions' }, actions))));
}

function finishGame(t, g, stars, screen) {
  const wasDone = topicDone(t);
  state.progress[t.id] = state.progress[t.id] || {};
  state.progress[t.id][g.id] = Math.max(state.progress[t.id][g.id] || 0, stars);
  const newSticker = !wasDone && topicDone(t);
  if (newSticker && !state.stickers.includes(t.id)) state.stickers.push(t.id);
  save(state);
  const text = praise();
  const list = gamesFor(t);
  const next = list[list.indexOf(g) + 1];

  sfx.win();
  confetti();
  setTimeout(() => sayRo(newSticker ? T.spoken.newSticker : text), 500);

  resultOverlay(screen, {
    stars, text,
    extra: newSticker && h('p', { class: 'sticker-new' }, `${t.emoji} ${T.newSticker}`),
    actions: [
      next
        ? h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); go(`#/joc/${t.id}/${next.id}`); } }, `${next.emoji} ${next.ro}`)
        : h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); go('#/abtibilduri'); } }, `📒 ${T.stickers}`),
      h('button', { class: 'btn', onClick: () => { sfx.tap(); render(); } }, `🔁 ${T.playAgain}`),
      h('button', { class: 'btn ghost', onClick: () => { sfx.tap(); go(`#/tema/${t.id}`); } }, T.backToTopic),
    ],
  });
}

// ---- aventura ---------------------------------------------------------------
function renderAdventure() {
  const next = ADVENTURE.find((st) => !(state.adventure.steps[st.id] > 0));
  app.append(h('section', { class: 'screen adventure', style: { '--c': '#C77DFF' } },
    topbar({ back: '#/acasa', title: `🦄 ${T.adventure} 🦕`, right: h('div', { class: 'chip' }, '⭐ ', String(adventureStars())) }),
    h('div', { class: 'scroll' },
      h('p', { class: 'lead center' }, adventureDone() ? `🏅 ${T.magicSticker}` : T.adventureHint),
      h('div', { class: 'steps' }, ADVENTURE.map((st, i) => {
        const stars = state.adventure.steps[st.id] || 0;
        const isNext = st === next;
        return h('button', { class: 'step-card' + (stars ? ' done' : '') + (isNext ? ' next' : ''), dataset: { step: st.id }, onClick: () => { sfx.tap(); go(st.id === 'drum' && stars ? '#/aventura/drum' : `#/aventura/${st.id}`); } },
          h('span', { class: 'step-no' }, String(i + 1)),
          h('span', { class: 'step-icon' }, st.emoji),
          h('span', { class: 'game-text' },
            h('span', { class: 'game-name' }, st.ro),
            h('span', { class: 'game-hint' }, st.id === 'drum' ? `${st.hint} · ${T.levels}: ${[...Array(ROAD_LEVEL_COUNT)].filter((_, i) => roadStars(i + 1) > 0).length}/${ROAD_LEVEL_COUNT}` : st.hint),
            stars ? starsEl(stars) : h('span', { class: 'step-cta' }, isNext ? T.start : '')));
      })),
      next && h('div', { class: 'center-row' },
        h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); go(`#/aventura/${next.id}`); } }, `${next.emoji} ${adventureStars() ? T.continueBtn : T.start}`)))));
}

function renderAdventureStep(id) {
  const st = ADVENTURE.find((x) => x.id === id);
  const mod = ADVENTURE_MODULES[id];
  if (!st || !mod) return go('#/aventura');
  playScreen({
    back: '#/aventura', title: `${st.emoji} ${st.ro}`, color: '#C77DFF', mod,
    ctxExtra: {
      step: st.id,
      art: state.adventure.art,
      saveArt: () => save(state),
      openBook: () => go('#/colorat'),
    },
    onFinish: (stars, screen) => finishAdventureStep(st, stars, screen),
  });
}

function finishAdventureStep(st, stars, screen) {
  const wasDone = adventureDone();
  state.adventure.steps[st.id] = Math.max(state.adventure.steps[st.id] || 0, stars);
  const nowDone = !wasDone && adventureDone();
  if (nowDone && !state.stickers.includes(ADVENTURE_STICKER)) state.stickers.push(ADVENTURE_STICKER);
  save(state);
  const next = ADVENTURE[ADVENTURE.indexOf(st) + 1];
  const text = praise();
  sfx.win();
  confetti();
  setTimeout(() => sayRo(nowDone ? T.spoken.adventureDone : text), 500);
  resultOverlay(screen, {
    stars, text,
    extra: nowDone && h('p', { class: 'sticker-new' }, `🌈🦄 ${T.magicSticker}`),
    actions: [
      next
        ? h('button', { class: 'btn primary big', dataset: { next: next.id }, onClick: () => { sfx.tap(); go(`#/aventura/${next.id}`); } }, `${next.emoji} ${T.nextStep}`)
        : st.id === 'drum'
          ? h('button', { class: 'btn primary big', dataset: { nextLevel: '2' }, onClick: () => { sfx.tap(); go('#/aventura/drum/2'); } }, `🛤️ ${T.nextLevel}`)
          : h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); go('#/abtibilduri'); } }, `📒 ${T.stickers}`),
      h('button', { class: 'btn', onClick: () => { sfx.tap(); render(); } }, `🔁 ${T.playAgain}`),
      h('button', { class: 'btn ghost', onClick: () => { sfx.tap(); go('#/aventura'); } }, T.backToAdventure),
    ],
  });
}

// ---- Drumul prietenilor: nivele --------------------------------------------------------
function renderRoadLevels() {
  const st = ADVENTURE.find((x) => x.id === 'drum');
  app.append(h('section', { class: 'screen', style: { '--c': '#C77DFF' } },
    topbar({ back: '#/aventura', title: `${st.emoji} ${st.ro}`, right: h('div', { class: 'chip' }, '⭐ ', String(roadStars(1) + roadTotal())) }),
    h('div', { class: 'scroll' },
      h('p', { class: 'lead center' }, st.hint),
      h('div', { class: 'levels' }, [...Array(ROAD_LEVEL_COUNT)].map((_, i) => {
        const n = i + 1;
        const L = ROAD_LEVELS[n];
        const unlocked = roadUnlocked(n);
        const feats = [L.stars && T.roadFeatures.stars, L.river && T.roadFeatures.river, L.limited && T.roadFeatures.limited].filter(Boolean).join(' · ');
        return h('button', { class: 'level-card', dataset: { level: String(n) }, disabled: !unlocked, 'aria-label': `${T.level} ${n}`, onClick: () => { sfx.tap(); go(`#/aventura/drum/${n}`); } },
          h('span', { class: 'level-no' }, unlocked ? String(n) : '🔒'),
          h('span', { class: 'game-name' }, `${T.level} ${n}`),
          h('span', { class: 'level-meta' }, `${L.size}×${L.size}${feats ? ' · ' + feats : ''}`),
          unlocked ? starsEl(roadStars(n)) : h('span', { class: 'level-meta' }, T.lockedLevel));
      })))));
}

function renderRoadLevel(n) {
  const st = ADVENTURE.find((x) => x.id === 'drum');
  if (!ROAD_LEVELS[n] || !roadUnlocked(n)) return go('#/aventura/drum');
  if (n === 1) return renderAdventureStep('drum');
  playScreen({
    back: '#/aventura/drum', title: `${st.emoji} ${T.level} ${n}`, color: '#C77DFF', mod: road,
    ctxExtra: { level: n, art: state.adventure.art },
    onFinish: (stars, screen) => {
      state.roadLevels[n] = Math.max(state.roadLevels[n] || 0, stars);
      save(state);
      const text = praise();
      sfx.win();
      confetti();
      setTimeout(() => sayRo(text), 500);
      const hasNext = n < ROAD_LEVEL_COUNT;
      resultOverlay(screen, {
        stars, text,
        actions: [
          hasNext
            ? h('button', { class: 'btn primary big', dataset: { nextLevel: String(n + 1) }, onClick: () => { sfx.tap(); go(`#/aventura/drum/${n + 1}`); } }, `🛤️ ${T.nextLevel}`)
            : h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); go('#/abtibilduri'); } }, `📒 ${T.stickers}`),
          h('button', { class: 'btn', onClick: () => { sfx.tap(); render(); } }, `🔁 ${T.playAgain}`),
          h('button', { class: 'btn ghost', onClick: () => { sfx.tap(); go('#/aventura/drum'); } }, T.backToLevels),
        ],
      });
    },
  });
}

// ---- jocuri de sine stătătoare -------------------------------------------------------
function renderExtras() {
  app.append(h('section', { class: 'screen', style: { '--c': '#4CC9F0' } },
    topbar({ back: '#/acasa', title: `🎈 ${T.extras}`, right: h('div', { class: 'chip' }, '⭐ ', String(extrasStars())) }),
    h('div', { class: 'scroll' },
      h('div', { class: 'games' }, EXTRAS.map((x) =>
        h('button', { class: 'game-card', style: { '--c': x.color }, dataset: { extra: x.id }, onClick: () => { sfx.tap(); go(`#/jocuri/${x.id}`); } },
          h('span', { class: 'game-icon' }, x.emoji),
          h('span', { class: 'game-text' },
            h('span', { class: 'game-name' }, x.ro),
            h('span', { class: 'game-hint' }, x.hint),
            starsEl(state.extras[x.id] || 0))))))));
}

function renderExtra(id) {
  const x = EXTRAS.find((e) => e.id === id);
  const mod = x && EXTRA_MODULES[x.module];
  if (!x || !mod) return go('#/jocuri');
  playScreen({
    back: '#/jocuri', title: `${x.emoji} ${x.ro}`, color: x.color, mod,
    ctxExtra: { art: state.adventure.art, best: state.extras[x.id] || 0 },
    onFinish: (stars, screen) => {
      state.extras[x.id] = Math.max(state.extras[x.id] || 0, stars);
      save(state);
      const text = praise();
      sfx.win();
      confetti();
      setTimeout(() => sayRo(text), 500);
      const next = EXTRAS[EXTRAS.indexOf(x) + 1];
      resultOverlay(screen, {
        stars, text,
        actions: [
          next
            ? h('button', { class: 'btn primary big', dataset: { nextExtra: next.id }, onClick: () => { sfx.tap(); go(`#/jocuri/${next.id}`); } }, `${next.emoji} ${next.ro}`)
            : h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); go('#/jocuri'); } }, `🎈 ${T.extras}`),
          h('button', { class: 'btn', onClick: () => { sfx.tap(); render(); } }, `🔁 ${T.playAgain}`),
          h('button', { class: 'btn ghost', onClick: () => { sfx.tap(); go('#/jocuri'); } }, T.backToExtras),
        ],
      });
    },
  });
}

// ---- cartea de colorat -------------------------------------------------------------
function renderBook() {
  const token = renderToken;
  app.append(h('section', { class: 'screen book', style: { '--c': '#FF8FAB' } },
    topbar({ back: '#/acasa', title: `🎨 ${T.book}` }),
    h('div', { class: 'scroll' },
      h('p', { class: 'lead center' }, T.bookHint),
      bookGrid({
        art: state.adventure.art, ops: state.book, isAlive: () => token === renderToken,
        open: (id) => { sfx.tap(); go(`#/colorat/${id}`); },
        addPages: () => { sfx.tap(); go('#/parinti'); },
      }))));
  setTimeout(() => { if (token === renderToken) sayRo(T.spoken.bookIntro); }, 300);
}

async function renderBookPage(id) {
  const token = renderToken;
  const found = await resolvePage(id);
  if (token !== renderToken) return;
  if (!found) return go('#/colorat');
  const { kind, page } = found;
  const common = {
    back: '#/colorat', title: `🎨 ${page.title}`, color: '#FF8FAB',
    onFinish: (stars, screen) => {
      sfx.win();
      confetti();
      const text = praise();
      setTimeout(() => sayRo(text), 500);
      resultOverlay(screen, {
        stars, text,
        actions: [
          h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); go('#/colorat'); } }, `📚 ${T.bookOther}`),
          h('button', { class: 'btn', onClick: () => { sfx.tap(); render(); } }, `🎨 ${T.bookAgain}`),
        ],
      });
    },
  };
  if (kind === 'svg') {
    state.adventure.art[page.id] = state.adventure.art[page.id] || {};
    playScreen({ ...common, mod: svgPage, ctxExtra: { page, fills: state.adventure.art[page.id], saveArt: () => save(state) } });
  } else {
    playScreen({
      ...common, mod: rasterPage,
      ctxExtra: {
        page, ops: state.book[page.id] || [],
        saveOps: (ops) => { if (ops.length) state.book[page.id] = ops; else delete state.book[page.id]; save(state); },
        saveThumb: async (blob) => { try { await setColoredThumb(page.id, await blob.arrayBuffer()); } catch { /* fără IndexedDB */ } },
      },
    });
  }
}

// ---- muzică ---------------------------------------------------------------------
function renderMusic() {
  const screen = h('section', { class: 'screen music', style: { '--c': '#9B5DE5' } },
    topbar({ back: '#/acasa', title: `🎵 ${T.music}` }));
  app.append(screen);
  cleanup = mountMusic(screen, { songs: songs(), sfx, openParents: () => go('#/parinti') });
}

// ---- album ----------------------------------------------------------------------
function renderStickers() {
  const art = state.adventure.art;
  const drawings = [
    ['unicorn-1', () => unicornSVG({ fills: art['unicorn-1'] })],
    ['unicorn-2', () => unicornSVG({ fills: art['unicorn-2'], flip: true })],
    ['dino-stegozaur', () => dinoSVG('stegozaur', { fills: art['dino-stegozaur'] })],
    ['dino-triceratops', () => dinoSVG('triceratops', { fills: art['dino-triceratops'] })],
    ['dino-trex', () => dinoSVG('trex', { fills: art['dino-trex'] })],
  ].filter(([k]) => art[k] && Object.keys(art[k]).length);

  app.append(h('section', { class: 'screen' },
    topbar({ back: '#/acasa', title: `${state.profile.avatar} ${T.stickerBook}` }),
    h('div', { class: 'scroll' },
      h('p', { class: 'lead center' }, T.stickerHint),
      h('div', { class: 'sticker-grid' },
        h('div', { class: 'sticker magic' + (state.stickers.includes(ADVENTURE_STICKER) ? '' : ' locked'), style: { '--c': '#C77DFF' } },
          h('span', { class: 'sticker-emoji' }, '🌈🦄'),
          h('span', { class: 'sticker-name' }, T.adventureSticker),
          h('span', { class: 'sticker-meta' }, state.stickers.includes(ADVENTURE_STICKER) ? `✅ ${T.unlocked}` : `🔒 ⭐ ${adventureStars()}/${ADVENTURE.length * 3}`)),
        TOPICS.map((t) => {
          const done = topicDone(t);
          return h('div', { class: 'sticker' + (done ? '' : ' locked'), style: { '--c': t.color } },
            h('span', { class: 'sticker-emoji' }, t.emoji),
            h('span', { class: 'sticker-name' }, t.ro),
            h('span', { class: 'sticker-meta' }, done ? `✅ ${T.unlocked}` : `🔒 ⭐ ${topicStars(t)}/${topicMax(t)}`));
        })),
      drawings.length ? h('h2', { class: 'section-title' }, `🎨 ${T.myDrawings}`) : null,
      drawings.length ? h('div', { class: 'gallery' }, drawings.map(([k, make]) => h('div', { class: 'drawing', dataset: { drawing: k } }, make()))) : null)));
}

// ---- zona părinților --------------------------------------------------------
function renderParents() {
  if (sessionStorage.getItem(PARENT_KEY) !== '1') return renderGate();

  const voiceOk = hasVoice(langTag());
  const nameInput = h('input', { class: 'text-input', value: state.profile?.name || '', maxlength: '14', placeholder: T.childName });
  const savedTag = h('span', { class: 'saved-tag' });
  let avatar = state.profile?.avatar || AVATARS[0];
  const avatarBtns = AVATARS.map((a) => h('button', {
    class: 'avatar' + (a === avatar ? ' selected' : ''), 'aria-label': a,
    onClick: (e) => { avatar = a; avatarBtns.forEach((b) => b.classList.toggle('selected', b === e.currentTarget)); },
  }, a));

  const toggle = (checked, onChange, name) => h('label', { class: 'toggle' },
    h('input', { type: 'checkbox', checked, name, onChange: (e) => onChange(e.target.checked) }),
    h('span', { class: 'slider' }));

  const setLang = (l) => {
    state.settings.lang = l;
    state.settings.showTranslation = l === 'en';
    save(state);
    render();
  };

  app.append(h('section', { class: 'screen parents' },
    topbar({ back: '#/acasa', title: `🔒 ${T.parents}` }),
    h('div', { class: 'scroll' },
      h('div', { class: 'card' },
        h('h3', {}, T.profile),
        h('div', { class: 'row' }, h('span', {}, T.nameOptional), nameInput),
        h('div', { class: 'row' }, h('div', { class: 'mini-avatars' }, avatarBtns)),
        h('div', { class: 'row' }, savedTag,
          h('button', { class: 'btn', onClick: () => {
            state.profile = { name: nameInput.value.trim().slice(0, 14), avatar };
            save(state);
            savedTag.textContent = T.saved;
          } }, T.save))),

      h('div', { class: 'card' },
        h('h3', {}, T.settings),
        h('div', { class: 'row' }, h('span', {}, T.wordsLang),
          h('div', { class: 'seg', role: 'group' },
            h('button', { class: state.settings.lang === 'ro' ? 'on' : '', onClick: () => setLang('ro') }, '🇷🇴 ', T.langRo),
            h('button', { class: state.settings.lang === 'en' ? 'on' : '', onClick: () => setLang('en') }, '🇬🇧 ', T.langEn))),
        h('div', { class: 'row' }, h('span', {}, T.showTranslation),
          toggle(state.settings.showTranslation, (v) => { state.settings.showTranslation = v; save(state); }, 'translation')),
        h('div', { class: 'row' }, h('span', {}, T.letters),
          toggle(!!state.settings.letters, (v) => { state.settings.letters = v; save(state); }, 'letters')),
        h('div', { class: 'row' }, h('span', {}, T.sound),
          toggle(state.settings.sound, (v) => { state.settings.sound = v; setSoundEnabled(v); save(state); }, 'sound')),
        !voiceOk && h('p', { class: 'note' }, 'ℹ️ ', T.noVoice)),

      h('div', { class: 'card' },
        h('h3', {}, T.progress),
        h('table', { class: 'table' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), GAMES.map((g) => h('th', { title: g.ro }, g.emoji)), h('th', {}, '⭐'))),
          h('tbody', {},
            h('tr', {}, h('td', {}, `🦄 ${T.adventure}`), h('td', { colspan: String(GAMES.length) }, ADVENTURE.map((st) => `${st.emoji}${state.adventure.steps[st.id] || '·'}`).join('  ')), h('td', {}, `${adventureStars()}/${ADVENTURE.length * 3}`)),
            TOPICS.map((t) => h('tr', {},
              h('td', {}, `${t.emoji} ${t.ro}`),
              GAMES.map((g) => { const s = gameStars(t.id, g.id); const off = !gamesFor(t).includes(g); return h('td', { class: s ? 'has' : '' }, off ? '' : s ? `${s}★` : '·'); }),
              h('td', {}, `${topicStars(t)}/${topicMax(t)}`)))))),

      parentsCard({ sfx }),

      musicParentsCard({ list: songs(), sfx, saveList: (list) => { if (list) state.songs = list; else delete state.songs; save(state); } }),

      h('div', { class: 'card' },
        h('h3', {}, T.install),
        h('p', { class: 'note' }, T.installTip)),

      h('div', { class: 'card' },
        h('button', { class: 'btn danger', onClick: () => {
          if (!confirm(T.resetConfirm)) return;
          state.progress = {};
          state.stickers = [];
          state.adventure = { steps: {}, art: {} };
          state.roadLevels = {};
          state.book = {};
          state.extras = {};
          save(state);
          render();
        } }, `🗑️ ${T.resetProgress}`)))));
}

function renderGate() {
  const a = 2 + Math.floor(Math.random() * 7);
  const b = 1 + Math.floor(Math.random() * 8);
  let entry = '';
  const readout = h('div', { class: 'readout', 'aria-live': 'polite' }, '?');
  const show = () => { readout.textContent = entry || '?'; };
  const check = () => {
    if (Number(entry) === a + b) { sessionStorage.setItem(PARENT_KEY, '1'); sfx.correct(); render(); return; }
    sfx.wrong();
    entry = '';
    readout.classList.remove('shake'); void readout.offsetWidth; readout.classList.add('shake');
    show();
  };
  const key = (label, fn, cls = '') => h('button', { class: 'key ' + cls, onClick: () => { sfx.tap(); fn(); } }, label);
  const digit = (d) => key(String(d), () => { if (entry.length < 2) { entry += d; show(); } });

  app.append(h('section', { class: 'screen gate' },
    topbar({ back: '#/acasa', title: `🔒 ${T.gateTitle}` }),
    h('div', { class: 'gate-body' },
      h('p', { class: 'q' }, T.gateQuestion(a, b)),
      readout,
      h('div', { class: 'keypad' },
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit),
        key('⌫', () => { entry = entry.slice(0, -1); show(); }),
        digit(0),
        key('✓', check, 'ok')))));
}

// ---- pornire ----------------------------------------------------------------
window.addEventListener('hashchange', render);
loadClips().finally(() => {
  preload([...T.spoken.praise, T.spoken.newSticker], 'ro-RO');
});
render();

let pendingReload = false;
const onHome = () => ['', 'acasa'].includes(route()[0] || '');
function applyUpdateIfIdle() {
  if (pendingReload && onHome()) { pendingReload = false; location.reload(); }
}
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) { pendingReload = true; applyUpdateIfIdle(); }
    hadController = true;
  });
  const precacheAudio = () => navigator.serviceWorker.ready.then((r) => r.active && r.active.postMessage('precache-audio')).catch(() => {});
  navigator.serviceWorker.register('sw.js').then((reg) => { reg.update().catch(() => {}); precacheAudio(); }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', precacheAudio);
  window.addEventListener('hashchange', applyUpdateIfIdle);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') applyUpdateIfIdle(); });
}
