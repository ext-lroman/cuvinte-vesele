#!/usr/bin/env node
// Capturi pentru App Store: iPhone 6,9" (1320×2868) și iPad 13" (2064×2752). Pornește serverul (npm start) înainte.
// Folosește Playwright din devDependencies: npx playwright install chromium (o singură dată).
import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'store', 'screenshots');
const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const KEY = 'cuvinte-vesele:v1';
const SEED = {
  profile: { name: 'Maria', avatar: '🦄' }, settings: { lang: 'ro', showTranslation: false, sound: false, letters: false },
  progress: { magie: { learn: 3, listen: 3, memory: 3 }, animale: { learn: 3, listen: 3, memory: 2, shadow: 3, count: 3 } },
  stickers: ['animale'],
  adventure: { steps: { corn: 3, unicorni: 3 }, art: { 'unicorn-1': { body: 'roz', mane1: 'mov', mane2: 'bleu', mane3: 'galben', tail: 'mov', horn: 'galben', hooves: 'mov' }, 'dino-trex': { body: 'verde', belly: 'galben', spots: 'rosu', legs: 'verde' } } },
};
const SCREENS = [
  { name: '01-acasa', hash: '#/acasa' },
  { name: '02-aventura', hash: '#/aventura' },
  { name: '03-cornul', hash: '#/aventura/corn' },
  { name: '04-colorat', hash: '#/aventura/unicorni', act: async (p) => p.locator('.swatch[data-color="roz"]').click() },
  { name: '05-drumul', hash: '#/aventura/drum', act: async (p) => { for (let i = 0; i < 12 && !(await p.locator('.board.ready').count()); i++) { await p.locator('[data-hint]').click(); const g = p.locator('.cell.ghost'); if (await g.count()) await g.click(); } } },
  { name: '06-invata', hash: '#/joc/magie/learn' },
  { name: '07-asculta', hash: '#/joc/animale/listen' },
  { name: '08-numara', hash: '#/joc/magie/count', act: async (p) => p.locator('.count-item').first().click() },
];
const DEVICES = [
  { dir: 'iphone-6.9', viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { dir: 'ipad-13', viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];
const browser = await chromium.launch();
for (const d of DEVICES) {
  const dir = path.join(OUT, d.dir);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const s of SCREENS) {
    const ctx = await browser.newContext(d);
    const p = await ctx.newPage();
    await p.addInitScript(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, SEED]);
    await p.goto(BASE + s.hash);
    await p.evaluate(() => document.fonts.ready);
    if (s.act) await s.act(p);
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(dir, `${s.name}.png`) });
    await ctx.close();
    console.log('✓', d.dir, s.name);
  }
}
await browser.close();
