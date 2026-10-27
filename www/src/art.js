// Desenele aplicației (SVG): unicorn, dinozauri, curcubeu, cornul. Fiecare zonă de colorat are data-region.
import { COLORS } from './content.js';
import { UNICORN_TOY } from './art/unicornToy.js';

const OUTLINE = '#4A3B5C';
const hexOf = (id) => (COLORS.find((c) => c.id === id) || {}).hex || id;

function build(viewBox, inner, { cls = 'art', fills = {}, defaults = {}, blank = false, outlineWidth = null } = {}) {
  const el = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${cls}"><g stroke="${OUTLINE}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`,
    'image/svg+xml').documentElement;
  for (const node of el.querySelectorAll('[data-region]')) {
    const r = node.dataset.region;
    const chosen = fills && fills[r];
    const fill = chosen ? hexOf(chosen) : blank ? '#FFFFFF' : (defaults[r] || '#FFFFFF');
    node.setAttribute('fill', fill);
    node.style.fill = fill;                                   // bate și umplerea din style="" (desene din Inkscape)
    if (outlineWidth) { node.style.stroke = blank || chosen ? OUTLINE : ''; node.style.strokeWidth = `${outlineWidth}px`; node.style.strokeLinejoin = 'round'; }
  }
  return el;
}

// ---- unicorn ----------------------------------------------------------------------
// Desenul vine din www/src/art/unicornToy.js (OpenClipart „toy unicorn”, CC0). Privește spre dreapta;
// flip=true îl întoarce spre stânga. data-faces spune încotro privește SVG-ul rezultat.
const W = Number(UNICORN_TOY.viewBox.split(' ')[2]);
export function unicornSVG({ fills, blank = false, horn = true, flip = false } = {}) {
  const inner = flip ? `<g transform="translate(${W} 0) scale(-1 1)">${UNICORN_TOY.inner}</g>` : UNICORN_TOY.inner;
  const el = build(UNICORN_TOY.viewBox, inner, { fills, blank, defaults: UNICORN_TOY.defaults, outlineWidth: 2.5 });
  el.dataset.faces = flip ? 'left' : 'right';
  if (!horn) el.querySelector('[data-horn]').setAttribute('visibility', 'hidden');
  return el;
}

// Puncte de ancorare (fracții din lățimea/înălțimea desenului) pentru accesorii, hrană etc.
export const UNICORN_ANCHORS = { horn: { x: 0.91, y: 0.03 }, head: { x: 0.80, y: 0.20 }, eye: { x: 0.80, y: 0.41 }, neck: { x: 0.68, y: 0.52 }, back: { x: 0.45, y: 0.58 }, tail: { x: 0.15, y: 0.50 } };
export const DINO_ANCHORS = { trex: { mouth: { x: 0.21, y: 0.47 }, head: { x: 0.28, y: 0.25 } }, stegozaur: { mouth: { x: 0.12, y: 0.62 } } };

export function hornPieceSVG() {
  return build('0 0 60 80', `<polygon data-region="horn" points="12,72 30,6 48,72"/><path d="M15 60 L 44 58 M 19 46 L 40 44 M 23 32 L 36 31" fill="none" stroke-width="3"/>`, { cls: 'art horn-piece', defaults: { horn: '#892ca0' } });
}

// ---- dinozauri ----------------------------------------------------------------------
const eye = (x, y, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke-width="4"/><circle cx="${x + 2}" cy="${y + 1}" r="${r * 0.55}" fill="${OUTLINE}" stroke="none"/><circle cx="${x + 4}" cy="${y - 2}" r="2" fill="#fff" stroke="none"/>`;
const legs4 = (xs, y, w = 42, hgt = 72) => xs.map((x) => `<rect data-region="legs" x="${x}" y="${y}" width="${w}" height="${hgt}" rx="18"/>`).join('');

const DINO_ART = {
  stegozaur: {
    viewBox: '0 0 420 300',
    defaults: { body: '#6BCB77', belly: '#C8F0CE', plates: '#FF9F1C', legs: '#5BB56A', tail: '#6BCB77' },
    inner: `
      <path data-region="tail" d="M318 170 C 360 150, 405 160, 410 205 C 412 232, 395 250, 376 252 C 384 228, 372 210, 322 214 Z"/>
      <polygon data-region="plates" points="380,215 398,188 406,222"/>
      <polygon data-region="plates" points="118,150 142,98 170,146"/>
      <polygon data-region="plates" points="165,138 200,78 236,136"/>
      <polygon data-region="plates" points="232,132 268,80 300,138"/>
      <polygon data-region="plates" points="296,142 330,105 352,160"/>
      ${legs4([135, 290], 215)}
      <ellipse data-region="body" cx="215" cy="190" rx="125" ry="68"/>
      ${legs4([185, 245], 222)}
      <ellipse data-region="belly" cx="225" cy="222" rx="80" ry="34" stroke="none"/>
      <circle data-region="body" cx="88" cy="170" r="36"/>
      <ellipse data-region="body" cx="56" cy="182" rx="28" ry="20"/>
      <circle cx="44" cy="180" r="3" fill="${OUTLINE}" stroke="none"/>
      <path d="M40 192 Q 52 200 64 194" fill="none" stroke-width="4"/>
      ${eye(96, 160)}`,
  },
  triceratops: {
    viewBox: '0 0 420 300',
    defaults: { body: '#8ECAE6', belly: '#DDF3FB', frill: '#3A86FF', horns: '#FFF3B0', legs: '#7FB8D6', tail: '#8ECAE6' },
    inner: `
      <path data-region="tail" d="M330 180 C 375 170, 405 185, 408 215 C 409 235, 395 246, 380 246 C 386 226, 372 210, 332 214 Z"/>
      ${legs4([160, 305], 212)}
      <ellipse data-region="body" cx="240" cy="185" rx="115" ry="66"/>
      ${legs4([210, 262], 220)}
      <ellipse data-region="belly" cx="250" cy="218" rx="72" ry="32" stroke="none"/>
      <circle data-region="frill" cx="126" cy="148" r="66"/>
      <circle data-region="frill" cx="156" cy="86" r="16"/><circle data-region="frill" cx="186" cy="118" r="16"/><circle data-region="frill" cx="190" cy="160" r="16"/>
      <polygon data-region="horns" points="100,118 66,58 122,108"/>
      <polygon data-region="horns" points="124,108 112,44 146,104"/>
      <ellipse data-region="body" cx="100" cy="160" rx="52" ry="42"/>
      <ellipse data-region="body" cx="58" cy="178" rx="28" ry="20"/>
      <polygon data-region="horns" points="56,160 34,128 72,152"/>
      <path data-region="horns" d="M30 182 L 16 190 L 34 198 Z"/>
      <path d="M40 192 Q 50 198 60 194" fill="none" stroke-width="4"/>
      ${eye(108, 150)}`,
  },
  trex: {
    viewBox: '0 0 420 320',
    defaults: { body: '#FF9F1C', belly: '#FFE0B2', legs: '#F28C00', tail: '#FF9F1C', spots: '#FF5A5F' },
    inner: `
      <path data-region="tail" d="M290 170 C 345 150, 395 120, 415 70 C 410 120, 370 170, 310 210 Z"/>
      <rect data-region="legs" x="165" y="215" width="50" height="78" rx="22"/>
      <rect data-region="legs" x="240" y="215" width="50" height="78" rx="22"/>
      <ellipse data-region="body" cx="225" cy="180" rx="92" ry="78" transform="rotate(-18 225 180)"/>
      <ellipse data-region="belly" cx="230" cy="205" rx="55" ry="45" stroke="none"/>
      <circle data-region="spots" cx="200" cy="130" r="11" stroke="none"/><circle data-region="spots" cx="244" cy="112" r="9" stroke="none"/><circle data-region="spots" cx="270" cy="150" r="10" stroke="none"/>
      <rect data-region="legs" x="150" y="280" width="70" height="26" rx="12"/>
      <rect data-region="legs" x="228" y="280" width="70" height="26" rx="12"/>
      <path data-region="body" d="M165 180 C 140 185, 132 200, 150 210 C 158 203, 162 196, 170 192 Z"/>
      <ellipse data-region="body" cx="118" cy="110" rx="76" ry="58"/>
      <path data-region="body" d="M45 125 C 40 150, 60 170, 100 168 L 150 160 C 160 150, 150 135, 140 134 Z"/>
      <path d="M48 128 L 148 134" fill="none" stroke-width="4"/>
      <polygon fill="#fff" stroke-width="3" points="62,129 70,146 78,130"/><polygon fill="#fff" stroke-width="3" points="86,131 94,148 102,132"/><polygon fill="#fff" stroke-width="3" points="110,132 118,149 126,133"/>
      <circle cx="52" cy="100" r="4" fill="${OUTLINE}" stroke="none"/>
      ${eye(140, 92, 11)}
      <path d="M124 72 L 150 66" fill="none" stroke-width="4"/>`,
  },
  diplodocus: {
    viewBox: '0 0 420 320',
    defaults: { body: '#9B5DE5', belly: '#E6D6FF', legs: '#8A4FD0', spots: '#FFD60A', tail: '#9B5DE5' },
    inner: `
      <path data-region="tail" d="M345 200 C 395 190, 425 150, 418 110 C 414 150, 385 180, 342 228 Z"/>
      ${legs4([170, 300], 230)}
      <ellipse data-region="body" cx="245" cy="205" rx="118" ry="66"/>
      ${legs4([215, 260], 240)}
      <ellipse data-region="belly" cx="255" cy="238" rx="75" ry="32" stroke="none"/>
      <circle data-region="spots" cx="220" cy="185" r="12" stroke="none"/><circle data-region="spots" cx="262" cy="170" r="10" stroke="none"/><circle data-region="spots" cx="300" cy="200" r="11" stroke="none"/>
      <rect data-region="body" x="98" y="40" width="58" height="170" rx="29" transform="rotate(38 127 125)"/>
      <ellipse data-region="body" cx="86" cy="56" rx="36" ry="27"/>
      <circle cx="58" cy="52" r="3" fill="${OUTLINE}" stroke="none"/>
      <path d="M54 66 Q 66 74 78 68" fill="none" stroke-width="4"/>
      ${eye(92, 48, 8)}`,
  },
  pterodactil: {
    viewBox: '0 0 420 260',
    defaults: { wings: '#FF5A5F', body: '#FF8FAB', beak: '#FFD60A', crest: '#9B5DE5' },
    inner: `
      <path data-region="wings" d="M205 150 C 160 95, 80 70, 18 100 C 60 118, 130 150, 205 190 Z"/>
      <path data-region="wings" d="M215 150 C 260 95, 340 70, 402 100 C 360 118, 290 150, 215 190 Z"/>
      <ellipse data-region="body" cx="210" cy="160" rx="38" ry="55"/>
      <path d="M196 212 L 190 236 M 224 212 L 230 236" fill="none" stroke-width="6"/>
      <circle data-region="body" cx="210" cy="92" r="26"/>
      <polygon data-region="beak" points="228,88 300,100 228,108"/>
      <polygon data-region="crest" points="196,74 150,42 206,84"/>
      ${eye(218, 86, 7)}`,
  },
};

export function dinoSVG(id, { fills, blank = false } = {}) {
  const d = DINO_ART[id];
  return build(d.viewBox, d.inner, { fills, blank, defaults: d.defaults });
}
export const DINO_IDS = Object.keys(DINO_ART);

// ---- curcubeu ----------------------------------------------------------------------
export function rainbowSVG({ fills = {}, happy = false } = {}) {
  const cx = 210, cy = 225;
  const bands = [];
  for (let i = 0; i < 6; i++) {
    const outer = 200 - i * 22, inner = outer - 22;
    bands.push(`<path data-region="band-${i}" data-band="${i}" d="M ${cx - outer} ${cy} A ${outer} ${outer} 0 0 1 ${cx + outer} ${cy} L ${cx + inner} ${cy} A ${inner} ${inner} 0 0 0 ${cx - inner} ${cy} Z" stroke-width="4"/>`);
  }
  const cloud = (x, flip) => `<g transform="translate(${x} 0) scale(${flip ? -1 : 1} 1)">
      <circle cx="0" cy="226" r="20" fill="#fff"/><circle cx="26" cy="212" r="26" fill="#fff"/><circle cx="54" cy="226" r="20" fill="#fff"/>
      <rect x="-10" y="226" width="74" height="18" rx="9" fill="#fff" stroke="none"/><rect x="-10" y="222" width="74" height="12" fill="#fff" stroke="none"/>
      <circle cx="18" cy="222" r="3" fill="${OUTLINE}" stroke="none"/><circle cx="36" cy="222" r="3" fill="${OUTLINE}" stroke="none"/>
      <path d="M20 232 Q 27 238 34 232" fill="none" stroke-width="3"/></g>`;
  const sun = `<g data-sun="1">
      ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="${56 + Math.cos(a * Math.PI / 180) * 34}" y1="${56 + Math.sin(a * Math.PI / 180) * 34}" x2="${56 + Math.cos(a * Math.PI / 180) * 46}" y2="${56 + Math.sin(a * Math.PI / 180) * 46}" stroke="#FFB703" stroke-width="5"/>`).join('')}
      <circle cx="56" cy="56" r="26" fill="#FFD60A"/>
      <circle cx="47" cy="52" r="3" fill="${OUTLINE}" stroke="none"/><circle cx="65" cy="52" r="3" fill="${OUTLINE}" stroke="none"/>
      <path d="${happy ? 'M44 62 Q 56 74 68 62' : 'M48 64 Q 56 68 64 64'}" fill="none" stroke-width="3"/>
      ${happy ? `<circle cx="42" cy="62" r="4" fill="#FFB3C6" stroke="none"/><circle cx="70" cy="62" r="4" fill="#FFB3C6" stroke="none"/>` : ''}
    </g>`;
  return build('0 0 420 250', `${bands.join('')}${cloud(-6, false)}${cloud(426, true)}${sun}`, { fills, blank: true });
}
