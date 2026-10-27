#!/usr/bin/env node
// Generează clipurile audio ale aplicației (www/assets/audio/<limbă>/<slug>.<ext>) cu o voce neurală
// și scrie manifestul pe care îl citește aplicația. Clipurile existente se păstrează (adaugă --force ca să le refaci).
//
//   node scripts/generate-audio.js piper            voce locală, gratuită (Piper; vezi scripts/piper-setup.sh)
//   node scripts/generate-audio.js azure            Azure Speech (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION) — ro-RO-AlinaNeural
//   node scripts/generate-audio.js openai           OpenAI TTS (OPENAI_API_KEY) — gpt-4o-mini-tts
//   opțiuni: --force  --lang ro,en  --only "text1|text2"
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOPICS, COLORS, DINOS, NUMBER_WORDS } from '../www/src/content.js';
import { T } from '../www/src/strings.js';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'www', 'assets', 'audio');
const args = process.argv.slice(2);
const provider = args.find((a) => !a.startsWith('--'));
const force = args.includes('--force');
const langs = (args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'ro,en').split(',').map((s) => s.trim()).filter(Boolean);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split('|') : null;

const slug = (text) => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function collect() {
  const ro = new Set(), en = new Set();
  for (const t of TOPICS) { ro.add(t.ro); en.add(t.en); for (const w of t.words) { ro.add(w.ro); en.add(w.en); } }
  for (const c of COLORS) { ro.add(c.ro); en.add(c.en); }
  for (const d of DINOS) { ro.add(d.ro); en.add(d.en); }
  NUMBER_WORDS.ro.filter(Boolean).forEach((x) => ro.add(x));
  NUMBER_WORDS.en.filter(Boolean).forEach((x) => en.add(x));
  const walk = (v) => { if (typeof v === 'string') ro.add(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(T.spoken);
  return { ro: [...ro], en: [...en] };
}

const providers = {
  piper: {
    ext: spawnSync('which', ['afconvert']).status === 0 ? 'm4a' : 'wav',
    async gen(text, lang, out) {
      const voice = lang === 'ro' ? (process.env.PIPER_VOICE_RO || 'ro_RO-mihai-medium') : (process.env.PIPER_VOICE_EN || 'en_US-amy-medium');
      const bin = process.env.PIPER_BIN || path.join(ROOT, '.venv', 'bin', 'piper');
      const dataDir = process.env.PIPER_VOICES || path.join(ROOT, 'voices');
      const wav = out.replace(/\.\w+$/, '.wav');
      const r = spawnSync(bin, ['--model', voice, '--data-dir', dataDir, '--output_file', wav, '--length-scale', '1.08', '--sentence-silence', '0.15'], { input: text, encoding: 'utf8', env: process.env });
      if (r.status !== 0 || !fs.existsSync(wav) || !fs.statSync(wav).size) throw new Error(`piper: ${r.stderr || r.stdout}`);
      if (out !== wav) {
        const c = spawnSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', wav, out], { encoding: 'utf8' });
        if (c.status !== 0) throw new Error(`afconvert: ${c.stderr}`);
        fs.unlinkSync(wav);
      }
    },
  },
  azure: {
    ext: 'mp3',
    async gen(text, lang, out) {
      const key = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION;
      if (!key || !region) throw new Error('setează AZURE_SPEECH_KEY și AZURE_SPEECH_REGION (ex. westeurope)');
      const voice = lang === 'ro' ? (process.env.AZURE_VOICE_RO || 'ro-RO-AlinaNeural') : (process.env.AZURE_VOICE_EN || 'en-US-JennyNeural');
      const xmlLang = lang === 'ro' ? 'ro-RO' : 'en-US';
      const ssml = `<speak version="1.0" xml:lang="${xmlLang}"><voice name="${voice}"><prosody rate="-8%">${esc(text)}</prosody></voice></speak>`;
      const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST', body: ssml,
        headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'cuvinte-vesele' },
      });
      if (!res.ok) throw new Error(`azure ${res.status}: ${await res.text()}`);
      fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    },
  },
  openai: {
    ext: 'mp3',
    async gen(text, lang, out) {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error('setează OPENAI_API_KEY');
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
          voice: process.env.OPENAI_TTS_VOICE || 'nova',
          input: text,
          instructions: lang === 'ro'
            ? 'Vorbește în limba română, cu accent românesc natural, clar, cald și rar, ca pentru un copil de 4 ani.'
            : 'Speak clearly, warmly and slowly, as if to a 4-year-old child.',
          response_format: 'mp3',
        }),
      });
      if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
      fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    },
  },
};

async function main() {
  const p = providers[provider];
  if (!p) { console.error('Folosire: node scripts/generate-audio.js piper|azure|openai [--force] [--lang ro,en] [--only "a|b"]'); process.exit(2); }
  const texts = collect();
  const manifest = fs.existsSync(path.join(OUT, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8')) : {};
  let made = 0, skipped = 0, failed = 0;
  for (const lang of langs) {
    const dir = path.join(OUT, lang);
    fs.mkdirSync(dir, { recursive: true });
    manifest[lang] = manifest[lang] || {};
    for (const text of texts[lang] || []) {
      if (only && !only.includes(text)) continue;
      const s = slug(text);
      if (!s) continue;
      const existing = fs.readdirSync(dir).find((f) => f.replace(/\.\w+$/, '') === s);
      if (existing && !force) { manifest[lang][s] = existing; skipped++; continue; }
      const file = `${s}.${p.ext}`;
      try {
        await p.gen(text, lang, path.join(dir, file));
        if (existing && existing !== file) fs.unlinkSync(path.join(dir, existing));
        manifest[lang][s] = file;
        made++;
        process.stdout.write(`✓ ${lang}/${file}\n`);
      } catch (e) {
        failed++;
        process.stdout.write(`✗ ${lang} „${text}”: ${String(e.message).split('\n')[0]}\n`);
      }
    }
    // scoate din manifest intrările fără fișier
    for (const [s, f] of Object.entries(manifest[lang])) if (!fs.existsSync(path.join(dir, f))) delete manifest[lang][s];
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.log(`gata: ${made} generate, ${skipped} existente, ${failed} eșuate → ${path.relative(ROOT, OUT)}/manifest.json`);
  if (failed) process.exit(1);
}
main();
