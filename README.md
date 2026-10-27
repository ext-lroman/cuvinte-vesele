# Cuvinte Vesele

Jocuri cu cuvinte și o aventură cu unicorni și dinozauri, pentru copii de 4–6 ani, în limba română.
Aplicație web (PWA) fără dependențe la rulare, împachetată pentru iOS cu Capacitor.

## Ce conține

- **Aventura cu unicorni și dinozauri** (6 pași, unul după altul, la final un abțibild magic):
  1. *Pune cornul la unicorn* — tragi cornul (nu morcovul, pălăria sau înghețata) pe capul celor doi unicorni.
  2. *Colorează unicornii* — paletă de 10 culori, două pagini (mama și puiul); culorile se spun cu voce.
  3. *Colorează dinozaurii* — Stegozaur, Triceratops, Tiranozaur.
  4. *Numele dinozaurilor* — cinci dinozauri desenați, învățare apoi „Unde este Tiranozaurul?”.
  5. *Colorează curcubeul* — fiecare dungă cu culoarea cerută (învață numele și ordinea culorilor).
  6. *Drumul prietenilor* — DinoZ și UniCORN pe o hartă 5×5 cu obstacole; pui piese drepte și curbe,
     apoi atingi un erou și călătorește pe drum; la întâlnire, animație pe tot ecranul cu îmbrățișare.
  Desenele colorate ajung în album, iar eroii din jocul cu drumul poartă culorile alese de copil.
- **11 teme × 8 cuvinte** (prima: *Unicorni și dinozauri*), fiecare cu **5 jocuri** potrivite pentru 4 ani și jumătate:
  Învață (cartonașe cu voce), Ascultă și atinge, Memorie (imagine–imagine, 4 perechi, apoi 6), A cui e umbra?, Câte sunt?
  Al șaselea joc, *Scrie cuvântul* (litere), se pornește din Zona părinților când copilul e pregătit.
- **Stele și abțibilduri**, confetti, laude rostite.
- **Zona părinților** (poartă cu o adunare): nume/avatar, limba cuvintelor (română sau engleză cu traducere),
  jocuri cu litere, sunet, progres, resetare.
- **Voce**: clipuri audio pre-generate cu o voce neurală (`www/assets/audio/`), Web Speech API doar ca rezervă.
- Totul rulează local: fără cont, fără internet, fără reclame, fără urmărire. Progresul stă în `localStorage`.

## Rulare

```bash
npm install          # o singură dată (Playwright pentru teste, Capacitor pentru iOS)
npm start            # http://localhost:5173 (afișează și adresa din Wi-Fi pentru tabletă)
npm test             # testele Playwright (pornesc singure serverul)
```

## Structură

```
www/                       aplicația web (ce se livrează)
  index.html
  src/app.js               rute (#/acasa, #/tema/<id>, #/joc/<temă>/<joc>, #/aventura[/<pas>], #/abtibilduri, #/parinti)
  src/content.js           temele, cuvintele (ro + en + emoji), jocurile, culorile, dinozaurii, pașii aventurii
  src/strings.js           textele interfeței + frazele rostite (T.spoken)
  src/art.js               desenele SVG (unicorn, 5 dinozauri, curcubeu, cornul) cu zone de colorat (data-region)
  src/games/               learn, listen, memory, shadow, count, spell — fiecare exportă mount(root, ctx)
  src/adventure/           horn, coloring, dinoNames, rainbow, road
  src/audio.js             clipuri audio + voce de rezervă + efecte sonore sintetizate
  styles/app.css
  assets/audio/            clipurile (ro/, en/) și manifest.json — generate de scripts/generate-audio.js
  assets/fonts/            Fredoka (local)
  sw.js                    service worker (offline, doar pe https)
ios/                       proiectul Xcode generat de Capacitor (SPM, fără CocoaPods)
scripts/                   generate-audio.js, piper-setup.sh, store-screenshots.js
store/                     iconiță, splash, capturi App Store, textele paginii, politica de confidențialitate
tests/                     teste Playwright (fiecare joc și fiecare pas al aventurii, cap-coadă)
PUBLICARE-APP-STORE.md     ghid pas cu pas pentru publicare
```

## Vocea (clipuri audio)

Toate cuvintele și frazele rostite au clipuri în `www/assets/audio/`. Le regenerezi cu:

```bash
# local, gratuit (Piper, voce neurală open-source) — prima dată:
sh scripts/piper-setup.sh
node scripts/generate-audio.js piper

# calitate mai înaltă, voce feminină naturală (Azure Speech, nivel gratuit F0):
AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=westeurope node scripts/generate-audio.js azure --force

# sau cu OpenAI:
OPENAI_API_KEY=... node scripts/generate-audio.js openai --force
```

Clipurile existente se păstrează (fără `--force`), deci după ce adaugi cuvinte noi rulezi comanda și se generează doar ce lipsește.

## Adaugă conținut

- **Cuvânt sau temă**: `www/src/content.js` → `TOPICS` (id, ro, en, emoji, color, words `{ ro, en, emoji }`). Jocurile se adaptează singure.
- **Frază rostită**: `www/src/strings.js` → `T.spoken`. Apoi regenerezi clipurile (vezi mai sus).
- **Desen nou de colorat**: `www/src/art.js` → o funcție care întoarce SVG; zonele colorabile au `data-region="..."`.

## iOS / App Store

Vezi [PUBLICARE-APP-STORE.md](PUBLICARE-APP-STORE.md). Pe scurt:

```bash
npx cap sync ios     # copiază www/ în proiectul iOS (după orice modificare)
npm run ios:open     # deschide ios/App/App.xcodeproj în Xcode
```
