// Desenele importate de părinte stau doar pe dispozitiv (IndexedDB) — nu se trimit nicăieri.
// Depozite: 'pages' (date mici: nume, miniatură, număr de zone), 'images' (imaginea mare) și
// 'thumbs' (miniatura colorată de copil, pentru orice desen raster — și pentru cele incluse în aplicație).
const DB_NAME = 'cuvinte-vesele-colorat';
let dbp = null;

function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('pages')) d.createObjectStore('pages', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('images')) d.createObjectStore('images', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('thumbs')) d.createObjectStore('thumbs', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbp.catch(() => { dbp = null; });
  }
  return dbp;
}

const done = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const finished = (t) => new Promise((resolve, reject) => { t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error); });

export async function listPages() {
  const d = await db();
  const all = await done(d.transaction('pages').objectStore('pages').getAll());
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addPage({ name, image, imageType, thumb, groups, W, H }) {
  const d = await db();
  const id = `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const t = d.transaction(['pages', 'images'], 'readwrite');
  t.objectStore('images').put({ id, data: image, type: imageType });
  t.objectStore('pages').put({ id, name, thumb, groups, W, H, createdAt: Date.now() });
  await finished(t);
  return id;
}

export async function getPage(id) {
  const d = await db();
  return done(d.transaction('pages').objectStore('pages').get(id));
}

export async function getImage(id) {
  const d = await db();
  const rec = await done(d.transaction('images').objectStore('images').get(id));
  return rec ? new Blob([rec.data], { type: rec.type || 'image/png' }) : null;
}

// Miniatura colorată (ce a făcut copilul), afișată în galerie.
export async function setColoredThumb(id, data) {
  const d = await db();
  const t = d.transaction('thumbs', 'readwrite');
  t.objectStore('thumbs').put({ id, data });
  await finished(t);
}

export async function coloredThumbs() {
  const d = await db();
  const all = await done(d.transaction('thumbs').objectStore('thumbs').getAll());
  return new Map(all.map((r) => [r.id, r.data]));
}

export async function deletePage(id) {
  const d = await db();
  const t = d.transaction(['pages', 'images', 'thumbs'], 'readwrite');
  t.objectStore('pages').delete(id);
  t.objectStore('images').delete(id);
  t.objectStore('thumbs').delete(id);
  await finished(t);
}

// Cere browserului să nu șteargă datele când e nevoie de spațiu (unde e suportat).
export async function persist() {
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch { /* ignorat */ }
}
