// Piese comune pentru paginile de colorat: paleta de culori și bara de unelte.
import { h } from '../ui.js';
import { T } from '../strings.js';
import { COLORS } from '../content.js';

export function paletteEl({ selected, lang, speak, sfx, onPick }) {
  const el = h('div', { class: 'palette' }, COLORS.map((c) =>
    h('button', {
      class: 'swatch' + (c.id === selected ? ' on' : ''), style: { '--sw': c.hex }, dataset: { color: c.id }, 'aria-label': c.ro,
      onClick: (e) => {
        el.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', s === e.currentTarget));
        sfx.pop();
        speak(c[lang] || c.ro, { lang: lang === 'en' ? 'en-US' : 'ro-RO' });
        onPick(c.id);
      },
    })));
  return el;
}

// Anulează · Mărește · Șterge tot (cere o a doua atingere) · Gata
export function toolbarEl({ sfx, onUndo, onZoom, onClear, onDone }) {
  let zoom = false, armed = null;
  const clearBtn = h('button', { class: 'btn', dataset: { tool: 'clear' }, onClick: () => {
    sfx.tap();
    if (armed) { clearTimeout(armed); armed = null; clearBtn.classList.remove('armed'); clearBtn.textContent = `🧽 ${T.clear}`; onClear(); return; }
    clearBtn.classList.add('armed');
    clearBtn.textContent = `🧽 ${T.sure}`;
    armed = setTimeout(() => { armed = null; clearBtn.classList.remove('armed'); clearBtn.textContent = `🧽 ${T.clear}`; }, 2500);
  } }, `🧽 ${T.clear}`);
  const zoomBtn = h('button', { class: 'btn icon', dataset: { tool: 'zoom' }, 'aria-label': T.zoom, onClick: () => {
    sfx.tap(); zoom = !zoom; zoomBtn.classList.toggle('on', zoom); onZoom(zoom);
  } }, '🔍');
  return h('div', { class: 'nav-row paint-tools' },
    h('button', { class: 'btn icon', dataset: { tool: 'undo' }, 'aria-label': T.undo, onClick: () => { sfx.tap(); onUndo(); } }, '↩️'),
    zoomBtn,
    clearBtn,
    h('button', { class: 'btn primary big', dataset: { tool: 'done' }, onClick: onDone }, `${T.done} ✓`));
}
