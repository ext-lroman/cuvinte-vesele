// Progresul și setările se păstrează local, pe dispozitiv (localStorage).
const KEY = 'cuvinte-vesele:v1';

const defaults = () => ({
  profile: null,                               // { name, avatar }
  settings: { lang: 'ro', showTranslation: false, sound: true },
  progress: {},                                // { [topicId]: { learn: 0-3, listen: 0-3, memory: 0-3, spell: 0-3 } }
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const saved = JSON.parse(raw);
    const d = defaults();
    return { ...d, ...saved, settings: { ...d.settings, ...(saved.settings || {}) }, progress: saved.progress || {} };
  } catch {
    return defaults();
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* spațiu plin sau mod privat */ }
}
