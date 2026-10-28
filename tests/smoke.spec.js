// Teste de fum: fiecare joc și fiecare pas al aventurii pot fi duse până la capăt, progresul se salvează.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const KEY = 'cuvinte-vesele:v1';
const PROFILE = { profile: { name: 'Maria', avatar: '🦄' }, settings: { lang: 'ro', showTranslation: false, sound: true, letters: false }, progress: {} };
const RAINBOW = ['rosu', 'portocaliu', 'galben', 'verde', 'albastru', 'mov'];

async function openWith(page, hash, state = PROFILE) {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, state]);
  await page.goto('about:blank');                 // încărcare de la zero, chiar dacă adresa e aceeași ca înainte
  await page.goto('/' + hash);
}
const saved = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const waitChange = (page, selector, attr, previous) =>
  page.waitForFunction(([s, a, prev]) => {
    const el = document.querySelector(s);
    return !el || el.getAttribute(a) !== prev || !!document.querySelector('.result-card');
  }, [selector, attr, previous]);
const expectResult = async (page, lit) => {
  await expect(page.locator('.result-card')).toBeVisible({ timeout: 15000 });
  if (lit != null) await expect(page.locator('.result-stars .lit')).toHaveCount(lit);
};

test('primul ecran → acasă → temă → Învață până la capăt', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.name-input')).toHaveCount(0);           // ea nu scrie: doar alege personajul
  await page.locator('.avatar[data-avatar="🦕"]').click();
  await page.getByRole('button', { name: 'Hai să ne jucăm!' }).click();

  await expect(page.locator('.adventure-card')).toBeVisible();
  await expect(page.locator('.topic-card')).toHaveCount(11);
  await expect(page.locator('.chip').first()).toContainText('🦕');
  expect((await saved(page)).profile).toEqual({ name: '', avatar: '🦕' });
  await page.locator('.topic-card[data-topic="animale"]').click();
  await expect(page.locator('.game-card')).toHaveCount(7);          // fără „Scrie cuvântul” (litere oprite)

  await page.locator('.game-card[data-game="learn"]').click();
  await expect(page.locator('.flashcard')).toHaveAttribute('data-word', 'câine');
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Următorul →' }).click();
  await expect(page.locator('.flashcard')).toHaveAttribute('data-word', 'leu');
  await page.getByRole('button', { name: 'Gata ✓' }).click();
  await expectResult(page, 3);
  expect((await saved(page)).progress.animale.learn).toBe(3);
});

test('Ascultă și atinge: fără greșeli = 3 stele, cu greșeli mai puține', async ({ page }) => {
  await openWith(page, '#/joc/culori/listen');
  for (let round = 0; round < 6; round++) {
    const word = await page.locator('.prompt-text').getAttribute('data-word');
    await page.locator(`.choice[data-word="${word}"]`).click();
    await waitChange(page, '.prompt-text', 'data-word', word);
  }
  await expectResult(page, 3);

  await openWith(page, '#/joc/mancare/listen');
  for (let round = 0; round < 6; round++) {
    const word = await page.locator('.prompt-text').getAttribute('data-word');
    if (round < 3) await page.locator(`.choice:not([data-word="${word}"])`).first().click();
    await page.locator(`.choice[data-word="${word}"]`).click();
    await waitChange(page, '.prompt-text', 'data-word', word);
  }
  await expectResult(page, 1);
});

test('Memorie: 4 perechi de imagini la început', async ({ page }) => {
  await openWith(page, '#/joc/vehicule/memory');
  await expect(page.locator('.mcard')).toHaveCount(8);
  const words = await page.locator('.mcard').evaluateAll((els) => [...new Set(els.map((e) => e.dataset.word))]);
  expect(words).toHaveLength(4);
  for (const w of words) {
    await page.locator(`.mcard[data-word="${w}"][data-kind="a"]`).click();
    await page.locator(`.mcard[data-word="${w}"][data-kind="b"]`).click();
    await expect(page.locator(`.mcard[data-word="${w}"].matched`)).toHaveCount(2);
  }
  await expectResult(page, 3);
});

test('A cui e umbra? și Câte sunt?', async ({ page }) => {
  await openWith(page, '#/joc/animale/shadow');
  for (let round = 0; round < 6; round++) {
    const word = await page.locator('.shadow-emoji').getAttribute('data-word');
    await page.locator(`.choice[data-word="${word}"]`).click();
    await waitChange(page, '.shadow-emoji', 'data-word', word);
  }
  await expectResult(page, 3);

  await openWith(page, '#/joc/numere/count');
  for (let round = 0; round < 6; round++) {
    const n = await page.locator('.count-items').getAttribute('data-n');
    await expect(page.locator('.count-item')).toHaveCount(Number(n));
    await page.locator('.count-item').first().click();
    await expect(page.locator('.count-item.counted')).toHaveCount(1);
    await page.locator(`.num[data-n="${n}"]`).click();
    await page.waitForFunction(() => !document.querySelector('.num.correct') || !!document.querySelector('.result-card'));
  }
  await expectResult(page, 3);
});

test('Scrie cuvântul apare doar cu literele pornite și merge cu diacritice', async ({ page }) => {
  await openWith(page, '#/tema/animale', { ...PROFILE, settings: { ...PROFILE.settings, letters: true } });
  await expect(page.locator('.game-card')).toHaveCount(8);
  await page.locator('.game-card[data-game="spell"]').click();
  for (let k = 0; k < 6; k++) {
    const word = await page.locator('.spell-pic').getAttribute('data-word');
    for (const ch of word) await page.locator(`.tile:not(.used)[data-letter="${ch}"]`).first().click();
    await waitChange(page, '.spell-pic', 'data-word', word);
  }
  await expectResult(page, 3);
});

test('abțibildul temei se deblochează după toate jocurile; zona părinților are poartă', async ({ page }) => {
  const done = { ...PROFILE, progress: { numere: { learn: 3, listen: 2, memory: 3, odd: 3 } } };   // abțibild = 5 jocuri
  await openWith(page, '#/joc/numere/count', done);
  for (let round = 0; round < 6; round++) {
    const n = await page.locator('.count-items').getAttribute('data-n');
    await page.locator(`.num[data-n="${n}"]`).click();
    await page.waitForFunction(() => !document.querySelector('.num.correct') || !!document.querySelector('.result-card'));
  }
  await expect(page.locator('.sticker-new')).toContainText('Abțibild nou!');
  await page.goto('/#/abtibilduri');
  await expect(page.locator('.sticker:not(.locked):not(.magic)')).toHaveCount(1);

  await page.goto('/#/parinti');
  const q = await page.locator('.gate .q').textContent();
  const [, a, b] = q.match(/(\d+) \+ (\d+)/);
  for (const d of String(Number(a) + Number(b))) await page.locator('.key', { hasText: new RegExp(`^${d}$`) }).click();
  await page.locator('.key.ok').click();
  await expect(page.locator('.table')).toBeVisible();
  await page.locator('.toggle:has(input[name="letters"]) .slider').click();
  await expect(page.locator('.toggle input[name="letters"]')).toBeChecked();
  await page.goto('/#/tema/numere');
  await expect(page.locator('.game-card[data-game="spell"]')).toBeVisible();
});

test('Aventura 1: pune cornul la unicorn (tragere)', async ({ page }) => {
  await openWith(page, '#/aventura');
  await expect(page.locator('.step-card')).toHaveCount(6);
  await page.locator('.step-card[data-step="corn"]').click();
  await expect(page.locator('.piece[data-kind="horn"]')).toHaveCount(2);
  for (const which of ['.uni.big', '.uni.small']) {
    const piece = page.locator('.piece[data-kind="horn"]:not(.used)').first();
    const pb = await piece.boundingBox();
    const tb = await page.locator(`${which} [data-horn]`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x, tb.y, { steps: 12 });
    await page.mouse.up();
    await expect(page.locator(`${which}.sparkle`)).toHaveCount(1);
  }
  await expectResult(page, 3);
  expect((await saved(page)).adventure.steps.corn).toBe(3);
});

test('Aventura 2-3: colorat unicorni și dinozauri, desenele ajung în album', async ({ page }) => {
  await openWith(page, '#/aventura/unicorni');
  await page.locator('.swatch[data-color="roz"]').click();
  for (const r of ['body', 'mane', 'tail']) await page.locator(`.canvas [data-region="${r}"]`).first().dispatchEvent('click');
  await expect.poll(() => page.locator('.canvas [data-region="body"]').first().evaluate((n) => getComputedStyle(n).fill)).toBe('rgb(255, 143, 171)');
  await page.locator('[data-next-page]').click();
  await page.locator('.swatch[data-color="mov"]').click();
  await page.locator('.canvas [data-region="horn"]').first().dispatchEvent('click');
  await page.getByRole('button', { name: 'Gata ✓' }).click();
  await expectResult(page, 3);
  await page.locator('[data-next="dinozauri"]').click();
  await page.locator('.swatch[data-color="verde"]').click();
  for (const r of ['body', 'plates', 'belly']) await page.locator(`.canvas [data-region="${r}"]`).first().dispatchEvent('click');
  await page.getByRole('button', { name: 'Gata ✓' }).click();
  await expectResult(page, 3);
  await page.goto('/#/abtibilduri');
  await expect(page.locator('.drawing')).toHaveCount(3);
});

test('Aventura 4: numele dinozaurilor', async ({ page }) => {
  await openWith(page, '#/aventura/nume');
  await expect(page.locator('.dino-card')).toHaveAttribute('data-dino', 'trex');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Următorul →' }).click();
  await page.locator('[data-quiz]').click();
  for (let round = 0; round < 6; round++) {
    const id = await page.locator('.prompt-text').getAttribute('data-dino');
    await page.locator(`.choice.dino[data-dino="${id}"]`).click();
    await page.waitForFunction(() => !document.querySelector('.choice.correct') || !!document.querySelector('.result-card'));
  }
  await expectResult(page, 3);
});

test('Aventura 5: curcubeul, culoare cu culoare', async ({ page }) => {
  await openWith(page, '#/aventura/curcubeu');
  for (let k = 0; k < 6; k++) {
    await expect(page.locator(`.art [data-band="${k}"].target`)).toHaveCount(1, { timeout: 8000 });
    await page.locator(`.swatch[data-color="${RAINBOW[k]}"]`).click();
    if (k === 0) await expect.poll(() => page.locator('.art [data-band="0"]').evaluate((n) => getComputedStyle(n).fill)).toBe('rgb(255, 90, 95)');
  }
  await expectResult(page, 3);
});

test('Aventura 6: drumul cu ajutor, călătoria și întâlnirea; abțibildul magic', async ({ page }) => {
  const almost = { ...PROFILE, adventure: { steps: { corn: 3, unicorni: 3, dinozauri: 3, nume: 2, curcubeu: 3 }, art: {} } };
  await openWith(page, '#/aventura/drum', almost);
  await expect(page.locator('.level-card')).toHaveCount(6);
  await expect(page.locator('.level-card[data-level="2"]')).toBeDisabled();
  await page.locator('.level-card[data-level="1"]').click();
  await expect(page.locator('.cell')).toHaveCount(25);
  for (let i = 0; i < 12 && !(await page.locator('.board.ready').count()); i++) {
    await page.locator('[data-hint]').click();
    const ghost = page.locator('.cell.ghost');
    if (await ghost.count()) await ghost.click();
  }
  await expect(page.locator('.board.ready')).toHaveCount(1);
  await page.locator('.rhero.dino').click({ force: true });   // eroul sare (animație), deci nu e niciodată „stabil”
  await expect(page.locator('.meet')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.meet.hug')).toHaveCount(1, { timeout: 5000 });
  await expectResult(page, null);
  await expect(page.locator('.sticker-new')).toContainText('magic');
  const s = await saved(page);
  expect(s.stickers).toContain('aventura');
});

// ---------------------------------------------------------------------------------------------
// Lista pentru offline (service worker): fiecare fișier există și fiecare modul din www/src e listat.
test('lista offline a service worker-ului e completă', async () => {
  const sw = fs.readFileSync('www/sw.js', 'utf8');
  const assets = [...sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const a of assets) expect(fs.existsSync(path.join('www', a === './' ? 'index.html' : a)), a).toBe(true);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const m of walk('www/src').filter((x) => x.endsWith('.js'))) expect(assets, m).toContain('./' + path.relative('www', m));
});

// ---------------------------------------------------------------------------------------------
// Cartea de colorat
const canvasPixel = (page, fx, fy) => page.locator('.paint-canvas').evaluate((c, [x, y]) => [...c.getContext('2d').getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data].slice(0, 3), [fx, fy]);
const tapCanvas = async (page, fx, fy) => { const b = await page.locator('.paint-canvas').boundingBox(); await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy); };

test('Carte de colorat: desen inclus — colorare, anulare, păstrare după reîncărcare', async ({ page }) => {
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v)); }, [KEY, PROFILE]);
  await page.goto('/#/colorat');
  await expect(page.locator('[data-book-page]')).toHaveCount(10);             // 7 desene SVG + 3 desene incluse
  await page.locator('[data-book-page="cc0-vesel"]').click();
  await expect(page.locator('.paint-wrap[data-ready="1"]')).toHaveCount(1, { timeout: 20000 });
  expect(await canvasPixel(page, 0.5, 0.42)).toEqual([255, 255, 255]);
  await page.locator('.swatch[data-color="roz"]').click();
  await tapCanvas(page, 0.5, 0.42);
  await expect.poll(() => canvasPixel(page, 0.5, 0.42)).toEqual([255, 143, 171]);
  await page.locator('[data-tool="undo"]').click();
  await expect.poll(() => canvasPixel(page, 0.5, 0.42)).toEqual([255, 255, 255]);
  await tapCanvas(page, 0.5, 0.42);
  await page.reload();
  await expect(page.locator('.paint-wrap[data-ready="1"]')).toHaveCount(1, { timeout: 20000 });
  await expect.poll(() => canvasPixel(page, 0.5, 0.42)).toEqual([255, 143, 171]);
  expect((await saved(page)).book['cc0-vesel']).toHaveLength(1);
  await page.locator('[data-tool="done"]').click();
  await expectResult(page, 3);
});

test('Carte de colorat: desen importat din Zona părinților se colorează și se poate șterge', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => sessionStorage.setItem('cuvinte-vesele:parinte', '1'));
  await openWith(page, '#/parinti');
  await page.locator('[data-book-input]').setInputFiles('www/assets/coloring/unicorn-vesel.png');
  await expect(page.locator('[data-import-item]')).toHaveCount(1, { timeout: 30000 });
  await page.goto('/#/colorat');
  await page.locator('[data-book-page^="imp-"]').click();
  await expect(page.locator('.paint-wrap[data-ready="1"]')).toHaveCount(1, { timeout: 20000 });
  await page.locator('.swatch[data-color="turcoaz"]').click();
  await tapCanvas(page, 0.5, 0.42);
  await expect.poll(() => canvasPixel(page, 0.5, 0.42)).toEqual([46, 196, 182]);
  await page.goto('/#/parinti');
  await page.locator('[data-import-item] .btn.danger').click();
  await expect(page.locator('[data-import-item]')).toHaveCount(0);
});

// ---------------------------------------------------------------------------------------------
// Jocurile noi

test('Care e diferit?: intrusul vine din altă temă; fără greșeli = 3 stele, cu greșeli = 1', async ({ page }) => {
  // Runda se schimbă → data-round crește; la final apare .result-card
  const nextRound = (prev) => page.waitForFunction((p) => {
    const el = document.querySelector('.odd-one');
    return !el || el.getAttribute('data-round') !== p || !!document.querySelector('.result-card');
  }, prev);

  await openWith(page, '#/joc/animale/odd');
  await expect(page.locator('.odd-one .prompt-text')).toHaveText('Care e diferit?');
  for (let round = 0; round < 6; round++) {
    const r = await page.locator('.odd-one').getAttribute('data-round');
    expect(r).toBe(String(round + 1));
    await expect(page.locator('.choice')).toHaveCount(4);
    await expect(page.locator('.choice[data-odd="1"]')).toHaveCount(1);
    await expect(page.locator('.choice:not([data-odd])[data-topic="animale"]')).toHaveCount(3);
    expect(await page.locator('.choice[data-odd="1"]').getAttribute('data-topic')).not.toBe('animale');
    await page.locator('.choice[data-odd="1"]').click();
    await nextRound(r);
  }
  await expectResult(page, 3);
  expect((await saved(page)).progress.animale.odd).toBe(3);

  await openWith(page, '#/joc/vehicule/odd');
  for (let round = 0; round < 6; round++) {
    const r = await page.locator('.odd-one').getAttribute('data-round');
    if (round < 3) {
      await page.locator('.choice:not([data-odd])').first().click();   // 3 greșeli → 1 stea
      await expect(page.locator('.choice.wrong')).toHaveCount(1);
    }
    await page.locator('.choice[data-odd="1"]').click();
    await nextRound(r);
  }
  await expectResult(page, 1);
});

test('Ce urmează?: șirurile ABAB → AABB → ABC se completează; greșelile scad stelele', async ({ page }) => {
  await openWith(page, '#/joc/animale/pattern');
  for (let round = 1; round <= 6; round++) {
    await expect(page.locator('.pattern-row')).toHaveAttribute('data-round', String(round));
    const answer = await page.locator('.pattern-slot').getAttribute('data-answer');
    const distinct = await page.locator('.pattern-item').evaluateAll((els) => new Set(els.map((e) => e.dataset.word)).size);
    expect(distinct).toBe(round >= 5 ? 3 : 2);                       // ABAB / AABB = 2 imagini, ABC ABC = 3
    await expect(page.locator('.choice')).toHaveCount(3);
    await expect(page.locator('.choice[data-correct="1"]')).toHaveAttribute('data-word', answer);
    await page.locator(`.choice[data-word="${answer}"]`).click();
    await expect(page.locator('.pattern-slot.filled')).toHaveCount(1);
    await waitChange(page, '.pattern-row', 'data-round', String(round));
  }
  await expectResult(page, 3);
  expect((await saved(page)).progress.animale.pattern).toBe(3);

  await openWith(page, '#/joc/animale/pattern');
  for (let round = 1; round <= 6; round++) {
    if (round <= 3) await page.locator('.choice:not([data-correct="1"])').first().click();
    await page.locator('.choice[data-correct="1"]').click();
    await waitChange(page, '.pattern-row', 'data-round', String(round));
  }
  await expectResult(page, 1);
});

test('Sparge baloanele: 6 baloane corecte, fără greșeli = 3 stele', async ({ page }) => {
  await openWith(page, '#/jocuri/baloane');
  await expect(page.locator('.balloons-sky')).toBeVisible();
  await expect(page.locator('.balloons-prompt .prompt-text')).toHaveAttribute('data-word', /.+/);
  for (let k = 1; k <= 6; k++) {
    // baloanele urcă încontinuu: click-ul obișnuit ar aștepta să stea pe loc, așa că trimitem evenimentul direct
    const balloon = page.locator('.balloons-balloon[data-correct="1"]:not(.popped):not(:disabled)').first();
    await balloon.waitFor({ timeout: 10000 });
    await balloon.dispatchEvent('click');
    await expect(page.locator('.balloons-score')).toHaveAttribute('data-score', String(k));
  }
  await expectResult(page, 3);
});

test('Îmbracă unicornul: două accesorii trase pe unicorn, al doilea pe aceeași zonă îl înlocuiește', async ({ page }) => {
  await openWith(page, '#/jocuri/imbraca');
  await expect(page.locator('.piece[data-accessory]')).toHaveCount(7);
  await expect(page.locator('.dressup-zone')).toHaveCount(5);
  const done = page.getByRole('button', { name: 'Gata ✓' });
  await expect(done).toBeDisabled();
  const drag = async (accessory, zone) => {
    const pb = await page.locator(`.piece[data-accessory="${accessory}"]`).boundingBox();
    const tb = await page.locator(`.dressup-zone[data-zone="${zone}"]`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x, tb.y, { steps: 12 });
    await page.mouse.up();
  };
  await drag('coroana', 'head');
  await expect(page.locator('.dressup-worn[data-accessory="coroana"][data-zone="head"]')).toHaveCount(1);
  await expect(page.locator('.piece[data-accessory="coroana"]')).toHaveClass(/used/);
  await expect(done).toBeDisabled();                                       // un singur accesoriu nu ajunge
  await drag('fular', 'neck');
  await expect(page.locator('.dressup-worn')).toHaveCount(2);
  await expect(done).toBeEnabled();
  await drag('palarie', 'head');                                           // a doua pe cap o înlocuiește pe coroană
  await expect(page.locator('.dressup-worn[data-zone="head"]')).toHaveAttribute('data-accessory', 'palarie');
  await expect(page.locator('.piece[data-accessory="coroana"]')).not.toHaveClass(/used/);
  await expect(page.locator('.dressup-worn')).toHaveCount(2);
  await page.locator('.dressup-worn[data-zone="neck"]').click();           // atingi accesoriul purtat → se dă jos
  await expect(page.locator('.dressup-worn')).toHaveCount(1);
  await expect(done).toBeDisabled();
  await drag('balon', 'tail');
  await expect(done).toBeEnabled();
  await done.click();
  await expect(page.locator('.dressup-stage.happy')).toHaveCount(1);
  await expectResult(page, 3);
});

test('Hrănește dinozaurul: trage mâncarea cerută la gura lui DinoZ; o greșeală = 2 stele', async ({ page }) => {
  const dragToMouth = async (pieceSel) => {
    const pb = await page.locator(pieceSel).first().boundingBox();
    const mb = await page.locator('.feed-mouth[data-target="mouth"]').boundingBox();
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.mouse.down();
    await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2, { steps: 12 });
    await page.mouse.up();
  };
  const nextRound = (food) => page.waitForFunction((prev) => {
    const el = document.querySelector('.feed-prompt .prompt-text');
    return !el || el.dataset.food !== prev || !!document.querySelector('.result-card');
  }, food);

  await openWith(page, '#/jocuri/hraneste');
  await expect(page.locator('.feed-stage .art')).toHaveCount(1);
  await expect(page.locator('.feed-piece')).toHaveCount(4);
  for (let round = 0; round < 6; round++) {
    const food = await page.locator('.feed-prompt .prompt-text').getAttribute('data-food');
    await expect(page.locator('.feed-piece[data-correct="1"]')).toHaveAttribute('data-food', food);
    await dragToMouth('.feed-piece[data-correct="1"]');
    await nextRound(food);
  }
  await expectResult(page, 3);

  await openWith(page, '#/jocuri/hraneste');
  for (let round = 0; round < 6; round++) {
    const food = await page.locator('.feed-prompt .prompt-text').getAttribute('data-food');
    if (round === 0) {
      await dragToMouth('.feed-piece:not([data-correct])');
      await expect(page.locator('.feed-piece.wrong')).toHaveCount(1);          // piesa greșită revine în tavă și se stinge
      await expect(page.locator('.feed-prompt .prompt-text')).toHaveAttribute('data-food', food);
    }
    await dragToMouth('.feed-piece[data-correct="1"]');
    await nextRound(food);
  }
  await expectResult(page, 2);
});

test('Puzzle: 4 bucăți amestecate, schimburi două câte două până la poza întreagă', async ({ page }) => {
  await openWith(page, '#/jocuri/puzzle');
  await expect(page.locator('.puzzle-preview .art')).toHaveCount(1);
  await expect(page.locator('.puzzle-board')).toHaveAttribute('data-picture', /^(unicorn|stegozaur|trex|curcubeu)$/);
  await expect(page.locator('.prompt-text')).toHaveText('Pune bucățile la locul lor!');
  const n = await page.locator('.puzzle-tile').count();
  expect(n).toBe(4);                                                   // best < 3 → grilă 2×2
  await expect(page.locator('.puzzle-tile.puzzle-locked')).toHaveCount(0);   // amestecat: nicio bucată la locul ei
  for (let k = 0; k < n; k++) {
    const left = page.locator('.puzzle-tile:not(.puzzle-locked)');
    if (!(await left.count())) break;
    const index = await left.first().getAttribute('data-index');
    const tile = page.locator(`.puzzle-tile[data-index="${index}"]`);
    await tile.click();
    await expect(tile).toHaveClass(/puzzle-selected/);
    await page.locator(`.puzzle-tile[data-slot="${index}"]`).click();     // cine îi ocupă locul → schimb
    await expect(tile).toHaveClass(/puzzle-locked/);
    await expect(tile).toHaveAttribute('data-slot', index);
  }
  await expect(page.locator('.puzzle-tile.puzzle-locked')).toHaveCount(n);
  await expect(page.locator('.puzzle-board.puzzle-done')).toHaveCount(1);
  await expectResult(page, 3);                                         // ≤ n-1 schimburi ≤ n bucăți → 3 stele
});

test('Jocuri: Trasează cifrele — 1–5 urmărite cu degetul, 3 stele', async ({ page }) => {
  await openWith(page, '#/jocuri/traseaza');
  for (let n = 1; n <= 5; n++) {
    const svg = page.locator(`.trace-svg[data-digit="${n}"]`);
    await expect(svg).toBeVisible();
    await expect(page.locator('.trace-digit')).toHaveText(String(n));
    // Punctele eșantionate de joc, în coordonate de ecran; „degetul” trece din 3 în 3 puncte (12 unități < raza de 22).
    const pts = await svg.evaluate((el) => JSON.parse(el.dataset.points).map(([x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(el.getScreenCTM());
      return [p.x, p.y];
    }));
    const path = pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1);
    await page.mouse.move(path[0][0], path[0][1]);
    await page.mouse.down();
    for (const [x, y] of path) await page.mouse.move(x, y);
    await page.mouse.up();
    await expect(svg).toHaveAttribute('data-done', '1');
  }
  await expectResult(page, 3);
});

test('Jocuri: Sortează culorile — tragere în coșuri, o greșeală = 2 stele', async ({ page }) => {
  await openWith(page, '#/jocuri/sorteaza');
  await expect(page.locator('.colorsort-bin')).toHaveCount(3);
  await expect(page.locator('.piece[data-color]')).toHaveCount(9);
  await expect(page.locator('.prompt-text')).toHaveText('Pune fiecare formă în coșul de culoarea ei!');
  const drag = async (piece, target) => {
    const pb = await piece.boundingBox();
    const tb = await target.boundingBox();
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 12 });
    await page.mouse.up();
  };
  // o greșeală: prima piesă într-un coș de altă culoare → se întoarce în tavă
  const first = page.locator('.piece:not(.used)').first();
  const wrongColor = await first.getAttribute('data-color');
  await drag(first, page.locator(`.colorsort-bin:not([data-color="${wrongColor}"])`).first());
  await expect(first).not.toHaveClass(/returning/);
  await expect(page.locator('.piece.used')).toHaveCount(0);
  // apoi toate cele 9 piese în coșul potrivit
  for (let i = 0; i < 9; i++) {
    const piece = page.locator('.piece:not(.used)').first();
    const color = await piece.getAttribute('data-color');
    await drag(piece, page.locator(`.colorsort-bin[data-color="${color}"]`));
    await expect(page.locator('.piece.used')).toHaveCount(i + 1);
  }
  await expect(page.locator('.colorsort-bin[data-count="3"]')).toHaveCount(3);
  await expectResult(page, 2);
});
