// Mici ajutoare pentru interfață: creare de elemente, amestecare, stele, confetti.

export function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith('--')) e.style.setProperty(p, val); else e.style[p] = val;
      }
    } else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function starsEl(n, max = 3) {
  return h('span', { class: 'stars', 'aria-label': `${n} din ${max} stele` },
    Array.from({ length: max }, (_, i) => h('span', { class: i < n ? 'lit' : '' }, '★')));
}

export function confetti({ count = 140, duration = 1900 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.getElementById('confetti');
  if (!c) return;
  const g = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth, H = window.innerHeight;
  c.width = W * dpr; c.height = H * dpr; c.style.display = 'block';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#FFB703', '#FB8500', '#219EBC', '#6BCB77', '#FF6B6B', '#9B5DE5', '#FF8FAB', '#4CC9F0'];
  const ps = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.4,
    vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 5,
    r: 5 + Math.random() * 7, c: colors[Math.floor(Math.random() * colors.length)],
    a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
  }));
  const t0 = performance.now();
  function frame(t) {
    const k = (t - t0) / duration;
    g.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.vy += 0.38; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.a += p.va;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a);
      g.globalAlpha = Math.max(0, 1 - k * k);
      g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      g.restore();
    }
    if (k < 1) requestAnimationFrame(frame);
    else { g.clearRect(0, 0, W, H); c.style.display = 'none'; }
  }
  requestAnimationFrame(frame);
}
