// Teste de fum: fiecare joc și fiecare pas al aventurii pot fi duse până la capăt, progresul se salvează.
import { test, expect } from '@playwright/test';

const KEY = 'cuvinte-vesele:v1';
const PROFILE = { profile: { name: 'Maria', avatar: '🦄' }, settings: { lang: 'ro', showTranslation: false, sound: true, letters: false }, progress: {} };
const RAINBOW = ['rosu', 'portocaliu', 'galben', 'verde', 'albastru', 'mov'];

async function openWith(page, hash, state = PROFILE) {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, state]);
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
  await expect(page.locator('.game-card')).toHaveCount(5);          // fără „Scrie cuvântul” (litere oprite)

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
  await expect(page.locator('.game-card')).toHaveCount(6);
  await page.locator('.game-card[data-game="spell"]').click();
  for (let k = 0; k < 6; k++) {
    const word = await page.locator('.spell-pic').getAttribute('data-word');
    for (const ch of word) await page.locator(`.tile:not(.used)[data-letter="${ch}"]`).first().click();
    await waitChange(page, '.spell-pic', 'data-word', word);
  }
  await expectResult(page, 3);
});

test('abțibildul temei se deblochează după toate jocurile; zona părinților are poartă', async ({ page }) => {
  const done = { ...PROFILE, progress: { numere: { learn: 3, listen: 2, memory: 3 } } };
  await openWith(page, '#/joc/numere/count', done);
  for (let round = 0; round < 6; round++) {
    const n = await page.locator('.count-items').getAttribute('data-n');
    await page.locator(`.num[data-n="${n}"]`).click();
    await page.waitForFunction(() => !document.querySelector('.num.correct') || !!document.querySelector('.result-card'));
  }
  await expect(page.locator('.sticker-new')).toContainText('Abțibild nou!');
  await page.getByRole('button', { name: '📒 Abțibilduri' }).click();
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
  await expect(page.locator('.canvas [data-region="body"]').first()).toHaveAttribute('fill', '#FF8FAB');
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
  }
  await expectResult(page, 3);
});

test('Aventura 6: drumul cu ajutor, călătoria și întâlnirea; abțibildul magic', async ({ page }) => {
  const almost = { ...PROFILE, adventure: { steps: { corn: 3, unicorni: 3, dinozauri: 3, nume: 2, curcubeu: 3 }, art: {} } };
  await openWith(page, '#/aventura/drum', almost);
  await expect(page.locator('.cell')).toHaveCount(25);
  for (let i = 0; i < 12 && !(await page.locator('.board.ready').count()); i++) {
    await page.locator('[data-hint]').click();
    const ghost = page.locator('.cell.ghost');
    if (await ghost.count()) await ghost.click();
  }
  await expect(page.locator('.board.ready')).toHaveCount(1);
  await page.locator('.rhero.dino').click();
  await expect(page.locator('.meet')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.meet.hug')).toHaveCount(1, { timeout: 5000 });
  await expectResult(page, null);
  await expect(page.locator('.sticker-new')).toContainText('magic');
  const s = await saved(page);
  expect(s.stickers).toContain('aventura');
});
