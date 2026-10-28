// Motorul pentru desene de colorat raster (linii închise la culoare pe fond alb, de ex. pagini
// printabile importate de părinte): găsește zonele închise dintre linii, unește zonele foarte mici
// cu vecina cu care au cea mai lungă graniță (asta dă nivelul de detaliu „mediu”) și colorează o
// zonă întreagă la o atingere. Culoarea se înmulțește cu desenul (multiply), deci liniile și umbrele
// desenului rămân vizibile, fără margini albe.

export const PARAMS = {
  maxSide: 1400,      // latura lungă de lucru (px)
  threshold: 165,     // luminozitate sub care un pixel e „linie”
  close: 3,           // îngroșăm liniile cu atâția px doar la căutarea zonelor (închide găurile din liniile schițate)
  minFrac: 0.0006,    // zonele mai mici de atât (fracție din pagină) se unesc cu o vecină
  maxRegions: 60,     // cel mult atâtea zone mari; restul se unesc — pagini foarte detaliate devin „medii”
  reach: 4,           // cât de adânc intră culoarea sub linii (px), ca să nu rămână margini albe
  adaptive: true,     // pe pagină: închide goluri mai mari dacă asta separă o bucată mare de fundal
  leakFrac: 0.08,     // cât trebuie să scadă cea mai mare zonă (fracție din pagină) ca să socotim că era o „scurgere”
  floodFrac: 0.15,    // dacă o zonă ar înghiți mai mult de atât din pagină în celule mici → grupăm celulele între ele
  clusterFrac: 0.004, // mărimea bucăților în care se grupează celulele mici (pagini tip mandala)
};

// Cea mai mare zonă albă (doar aria), pentru a compara două niveluri de închidere a golurilor.
function largestArea(line, W, H, label, stack) {
  const N = W * H;
  label.fill(0);
  let n = 0, best = 0;
  for (let i = 0; i < N; i++) {
    if (line[i] || label[i]) continue;
    n++;
    let sp = 0, a = 0;
    stack[sp++] = i;
    label[i] = n;
    while (sp) {
      const p = stack[--sp];
      a++;
      const x = p % W;
      if (x > 0 && !line[p - 1] && !label[p - 1]) { label[p - 1] = n; stack[sp++] = p - 1; }
      if (x < W - 1 && !line[p + 1] && !label[p + 1]) { label[p + 1] = n; stack[sp++] = p + 1; }
      if (p >= W && !line[p - W] && !label[p - W]) { label[p - W] = n; stack[sp++] = p - W; }
      if (p < N - W && !line[p + W] && !label[p + W]) { label[p + W] = n; stack[sp++] = p + W; }
    }
    if (a > best) best = a;
  }
  return best;
}

export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let url = null;
    img.onload = () => { if (url) URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { if (url) URL.revokeObjectURL(url); reject(new Error('imaginea nu se poate citi')); };
    if (source instanceof Blob) { url = URL.createObjectURL(source); img.src = url; } else img.src = source;
  });
}

// Desenează imaginea pe fond alb, cu latura lungă de cel mult maxSide px.
export function rasterize(img, maxSide = PARAMS.maxSide) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.min(1, maxSide / Math.max(iw, ih));
  const W = Math.max(1, Math.round(iw * s)), H = Math.max(1, Math.round(ih * s));
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, W, H);
  return { canvas, W, H, data: g.getImageData(0, 0, W, H).data };
}

function dilate(m, W, H) {
  const out = m.slice();
  const N = W * H;
  for (let i = 0; i < N; i++) {
    if (m[i]) continue;
    const x = i % W;
    if ((x > 0 && m[i - 1]) || (x < W - 1 && m[i + 1]) || (i >= W && m[i - W]) || (i < N - W && m[i + W])) out[i] = 1;
  }
  return out;
}

// Analizează pixelii (RGBA) și întoarce zonele grupate.
export function analyze(data, W, H, params = {}) {
  const P = { ...PARAMS, ...params };
  const N = W * H;
  let line = new Uint8Array(N);
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    const lum = (data[j] * 77 + data[j + 1] * 150 + data[j + 2] * 29) >> 8;
    line[i] = lum < P.threshold ? 1 : 0;
  }
  for (let k = 0; k < P.close; k++) line = dilate(line, W, H);
  const label = new Int32Array(N);
  const stack = new Int32Array(N);

  // 0. goluri în contur: dacă o închidere cu 2 px mai mare separă o bucată mare din cea mai mare zonă,
  //    conturul avea o „scurgere” (de ex. un cap desenat schițat care se unea cu fundalul).
  let close = P.close;
  if (P.adaptive) {
    let best = largestArea(line, W, H, label, stack);
    for (let step = 0; step < 2; step++) {
      const more = dilate(dilate(line, W, H), W, H);
      const a = largestArea(more, W, H, label, stack);
      if (best - a < P.leakFrac * N) break;
      line = more; close += 2; best = a;
    }
    label.fill(0);
  }

  // 1. zonele albe (4-vecini)
  const area = [0];
  let n = 0;
  for (let i = 0; i < N; i++) {
    if (line[i] || label[i]) continue;
    n++;
    let sp = 0, a = 0;
    stack[sp++] = i;
    label[i] = n;
    while (sp) {
      const p = stack[--sp];
      a++;
      const x = p % W;
      if (x > 0 && !line[p - 1] && !label[p - 1]) { label[p - 1] = n; stack[sp++] = p - 1; }
      if (x < W - 1 && !line[p + 1] && !label[p + 1]) { label[p + 1] = n; stack[sp++] = p + 1; }
      if (p >= W && !line[p - W] && !label[p - W]) { label[p - W] = n; stack[sp++] = p - W; }
      if (p < N - W && !line[p + W] && !label[p + W]) { label[p + W] = n; stack[sp++] = p + W; }
    }
    area.push(a);
  }

  // 2. fiecare pixel de linie primește zona cea mai apropiată (până la reach+close px)
  const owner = new Int32Array(N);
  owner.set(label);
  const dist = new Uint8Array(N);
  const queue = stack;                       // refolosim memoria
  let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) {
    if (!label[i]) continue;
    const x = i % W;
    if ((x > 0 && !label[i - 1]) || (x < W - 1 && !label[i + 1]) || (i >= W && !label[i - W]) || (i < N - W && !label[i + W])) queue[qt++] = i;
  }
  const maxD = P.reach + close;
  while (qh < qt) {
    const p = queue[qh++];
    const d = dist[p];
    if (d >= maxD) continue;
    const o = owner[p], x = p % W;
    if (x > 0 && !owner[p - 1]) { owner[p - 1] = o; dist[p - 1] = d + 1; queue[qt++] = p - 1; }
    if (x < W - 1 && !owner[p + 1]) { owner[p + 1] = o; dist[p + 1] = d + 1; queue[qt++] = p + 1; }
    if (p >= W && !owner[p - W]) { owner[p - W] = o; dist[p - W] = d + 1; queue[qt++] = p - W; }
    if (p < N - W && !owner[p + W]) { owner[p + W] = o; dist[p + W] = d + 1; queue[qt++] = p + W; }
  }

  // 3. vecinătăți: unde se întâlnesc două zone în mijlocul unei linii
  const K = n + 1;
  const adj = new Map();
  for (let p = 0; p < N; p++) {
    const o = owner[p];
    if (!o) continue;
    const x = p % W;
    if (x < W - 1) { const q = owner[p + 1]; if (q && q !== o) { const k = o < q ? o * K + q : q * K + o; adj.set(k, (adj.get(k) || 0) + 1); } }
    if (p < N - W) { const q = owner[p + W]; if (q && q !== o) { const k = o < q ? o * K + q : q * K + o; adj.set(k, (adj.get(k) || 0) + 1); } }
  }
  const neigh = new Array(n + 1);
  for (const [k, w] of adj) {
    const a = Math.floor(k / K), b = k % K;
    (neigh[a] || (neigh[a] = [])).push(b, w);
    (neigh[b] || (neigh[b] = [])).push(a, w);
  }

  // 4. „ancorele”: cele mai mari maxRegions zone care au cel puțin minFrac din pagină. Restul se unesc.
  const aMin = Math.max(1, Math.round(P.minFrac * N));
  const anchor = new Uint8Array(n + 1);
  const byArea = [];
  for (let r = 1; r <= n; r++) if (area[r] >= aMin) byArea.push(r);
  byArea.sort((x, y) => area[y] - area[x]);
  for (let i = 0; i < byArea.length && i < P.maxRegions; i++) anchor[byArea[i]] = 1;

  // 5. grupurile mici se unesc cu grupul vecin cu care au granița cea mai lungă. Se repetă la nivel de
  //    grup (nu de zonă), altfel două zone mici care se aleg reciproc rămân un grup mic „orfan”.
  const parent = new Int32Array(n + 1);
  const setArea = new Float64Array(n + 1);
  const hasAnchor = new Uint8Array(n + 1);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const clusterMin = Math.round(P.clusterFrac * N);

  // mode 'anchors': fiecare celulă mică ajunge într-o zonă mare (texturile se topesc în zona lor);
  // mode 'clusters': celulele mici se grupează între ele până la clusterMin (modele tip mandala).
  const mergeSets = (mode) => {
    for (let i = 0; i <= n; i++) { parent[i] = i; setArea[i] = area[i]; hasAnchor[i] = anchor[i]; }
    const done = (root) => hasAnchor[root] || (mode === 'clusters' && setArea[root] >= clusterMin);
    for (let pass = 0; pass < 12; pass++) {
      const links = new Map();               // rădăcină de unit → Map(rădăcină vecină → lungimea graniței)
      for (let r = 1; r <= n; r++) { const root = find(r); if (!done(root) && !links.has(root)) links.set(root, new Map()); }
      if (!links.size) break;
      for (const [k, w] of adj) {
        const ra = find(Math.floor(k / K)), rb = find(k % K);
        if (ra === rb) continue;
        const la = links.get(ra), lb = links.get(rb);
        if (la) la.set(rb, (la.get(rb) || 0) + w);
        if (lb) lb.set(ra, (lb.get(ra) || 0) + w);
      }
      let merged = 0;
      const order = [...links.keys()].sort((x, y) => setArea[x] - setArea[y]);
      for (const root of order) {
        const from = find(root);
        if (done(from)) continue;
        let best = 0, bw = -1;
        for (const [nb, w] of links.get(root)) {
          const to = find(nb);
          if (to === from) continue;
          if (w > bw || (w === bw && setArea[to] > setArea[best])) { best = to; bw = w; }
        }
        if (!best) continue;
        parent[from] = best;
        setArea[best] += setArea[from];
        if (hasAnchor[from]) hasAnchor[best] = 1;
        merged++;
      }
      if (!merged) break;
    }
  };

  // 5. întâi „ancore”; dacă o zonă ar înghiți prea multe celule mici, pagina e un model → „clusters”
  let mode = 'anchors';
  mergeSets(mode);
  let flooded = 0;
  for (let r = 1; r <= n; r++) if (anchor[r] && find(r) === r) flooded = Math.max(flooded, setArea[r] - area[r]);
  if (flooded > P.floodFrac * N) { mode = 'clusters'; mergeSets(mode); }

  // 6. grupuri compacte + pixelii fiecărui grup (pentru colorare rapidă)
  const groupOf = new Int32Array(n + 1);
  let G = 0;
  for (let r = 1; r <= n; r++) { const root = find(r); if (!groupOf[root]) groupOf[root] = ++G; groupOf[r] = groupOf[root]; }
  const start = new Uint32Array(G + 2);
  for (let p = 0; p < N; p++) { const o = owner[p]; if (o) start[groupOf[o] + 1]++; }
  for (let g = 1; g <= G + 1; g++) start[g] += start[g - 1];
  const idx = new Uint32Array(start[G + 1]);
  const cur = start.slice();
  const box = new Int32Array((G + 1) * 4).fill(-1);
  for (let p = 0; p < N; p++) {
    const o = owner[p];
    if (!o) continue;
    const g = groupOf[o];
    idx[cur[g]++] = p;
    const x = p % W, y = (p - x) / W, b = g * 4;
    if (box[b] < 0) { box[b] = x; box[b + 1] = y; box[b + 2] = x; box[b + 3] = y; }
    else { if (x < box[b]) box[b] = x; if (x > box[b + 2]) box[b + 2] = x; if (y > box[b + 3]) box[b + 3] = y; }
  }
  return { W, H, N, owner, groupOf, groups: G, regions: n, aMin, close, mode, start, idx, box };
}

// Pânza pe care se colorează: păstrează pixelii originali și pune culori prin înmulțire.
export class Painter {
  constructor(canvas, src, res) {
    this.res = res;
    this.src = src;
    canvas.width = res.W;
    canvas.height = res.H;
    this.ctx = canvas.getContext('2d');
    this.img = this.ctx.createImageData(res.W, res.H);
    this.out = this.img.data;
    this.reset();
  }

  reset() {
    this.out.set(this.src);
    this.ctx.putImageData(this.img, 0, 0);
  }

  // Grupul de sub punctul (x, y); dacă degetul a nimerit o linie groasă, caută cea mai apropiată zonă.
  groupAt(x, y) {
    const { W, H, owner, groupOf } = this.res;
    x = Math.round(x); y = Math.round(y);
    for (let r = 0; r <= 16; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const px = x + dx, py = y + dy;
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const o = owner[py * W + px];
          if (o) return groupOf[o];
        }
      }
    }
    return 0;
  }

  paint(g, hex, flush = true) {
    if (!g) return;
    const r = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const { start, idx, box, W } = this.res;
    const out = this.out, src = this.src;
    for (let k = start[g], e = start[g + 1]; k < e; k++) {
      const j = idx[k] * 4;
      out[j] = (src[j] * r) / 255;
      out[j + 1] = (src[j + 1] * gg) / 255;
      out[j + 2] = (src[j + 2] * b) / 255;
    }
    if (flush) {
      const bx = box[g * 4], by = box[g * 4 + 1];
      this.ctx.putImageData(this.img, 0, 0, bx, by, box[g * 4 + 2] - bx + 1, box[g * 4 + 3] - by + 1);
    }
    void W;
  }

  flush() { this.ctx.putImageData(this.img, 0, 0); }
}

// Miniatură JPEG (pentru galerie) dintr-o pânză.
export function thumbnail(canvas, width = 320) {
  const s = width / canvas.width;
  const t = document.createElement('canvas');
  t.width = width;
  t.height = Math.max(1, Math.round(canvas.height * s));
  const g = t.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, t.width, t.height);
  g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, 0, 0, t.width, t.height);
  return new Promise((resolve) => t.toBlob((b) => resolve(b), 'image/jpeg', 0.85));
}

export function toPNG(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
