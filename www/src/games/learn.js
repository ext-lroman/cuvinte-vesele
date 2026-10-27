// Învață: cartonașe cu imagine + cuvânt, citite cu voce tare.
import { h } from '../ui.js';
import { T } from '../strings.js';

export function mount(root, ctx) {
  const { words, wordOf, subOf, say, sfx, setProgress, onDone } = ctx;
  let i = 0;
  let timer = null;

  function draw() {
    const w = words[i];
    setProgress((i + 1) / words.length);
    root.replaceChildren(
      h('div', { class: 'game learn' },
        h('button', { class: 'flashcard', dataset: { word: wordOf(w) }, 'aria-label': wordOf(w), onClick: () => { sfx.flip(); say(w); } },
          h('span', { class: 'flash-emoji' }, w.emoji),
          h('span', { class: 'flash-word' }, wordOf(w)),
          subOf(w) && h('span', { class: 'flash-sub' }, subOf(w)),
          h('span', { class: 'speaker' }, '🔊')),
        h('div', { class: 'dots' }, words.map((_, k) => h('span', { class: 'dot' + (k === i ? ' on' : k < i ? ' done' : '') }))),
        h('div', { class: 'nav-row' },
          h('button', { class: 'btn big', disabled: i === 0, onClick: () => { sfx.tap(); i--; draw(); } }, '← ', T.back),
          i < words.length - 1
            ? h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); i++; draw(); } }, T.next, ' →')
            : h('button', { class: 'btn primary big', onClick: () => { sfx.tap(); onDone(3); } }, T.done, ' ✓'))));
    clearTimeout(timer);
    timer = setTimeout(() => say(w), 250);
  }

  draw();
  return () => clearTimeout(timer);
}
