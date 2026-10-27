# Cum publici „Cuvinte Vesele” în App Store — pas cu pas

Ghid pentru tine, cu ce ai deja pe acest Mac și ce mai rămâne de făcut doar de tine (cont Apple, semnare, upload).

## Ce e deja pregătit

| Ce | Unde |
|---|---|
| Aplicația web (tot ce vede copilul) | `www/` |
| Proiectul iOS generat de Capacitor (Swift Package Manager, fără CocoaPods) | `ios/App/App.xcodeproj` |
| Bundle ID propus | `com.lucianroman.cuvintevesele` (îl poți schimba în Xcode, trebuie doar să fie unic) |
| Iconița aplicației (1024×1024, fără transparență) | `store/AppIcon-1024.png` (deja copiată în proiectul iOS) |
| Ecran de pornire (splash) | `store/splash-2732.png` (deja în proiect) |
| Capturi pentru App Store (iPhone 6,9" și iPad 13") | `store/screenshots/` — regenerează-le cu `node scripts/store-screenshots.js` după modificări |
| Textele paginii (nume, subtitlu, descriere, cuvinte-cheie, note pentru review) | `store/listing.md` |
| Politica de confidențialitate (RO + EN) | `store/politica-de-confidentialitate.md` |
| Verificat pe acest Mac | Xcode 26.6 instalat, platforma iOS 26.5 descărcată, `xcodebuild` pentru simulator: **BUILD SUCCEEDED** |

Ce **nu** există încă pe Mac: un certificat de semnare Apple (`security find-identity` → 0 identități). Îl creează Xcode automat după ce te conectezi cu contul (pasul 2).

## Pasul 0 — Verifică tipul contului

Intră pe <https://developer.apple.com/account>. Trebuie să ai **Apple Developer Program** activ (99 USD/an), nu doar un Apple ID gratuit. Dacă e cont de firmă, ai nevoie de rolul *Admin* sau *App Manager* în App Store Connect. Dacă e contul tău personal, ești *Account Holder* și ai tot ce trebuie.

## Pasul 1 — Pregătește build-ul web

De fiecare dată când schimbi ceva în `www/`:

```bash
cd ~/Documents/CuvinteVesele
npm test                 # testele trec?
npx cap sync ios         # copiază www/ în ios/App/App/public
```

## Pasul 2 — Conectează Xcode la contul Apple

1. Deschide Xcode → meniul **Xcode → Settings… → Accounts**.
2. Apasă **+** → **Apple ID** → loghează-te cu contul de developer.
3. Selectează echipa (Team) din listă → **Manage Certificates…** → **+** → **Apple Development**. (Certificatul **Apple Distribution** îl face Xcode singur la primul Archive.)

## Pasul 3 — Deschide proiectul și setează semnarea

```bash
npm run ios:open         # deschide ios/App/App.xcodeproj
```

1. În bara din stânga, click pe proiectul **App** (albastru) → target **App** → tab **Signing & Capabilities**.
2. Bifează **Automatically manage signing** și alege **Team**-ul tău.
3. **Bundle Identifier**: lasă `com.lucianroman.cuvintevesele` sau pune altul (format `com.<numele-tau>.<app>`). Xcode înregistrează automat App ID-ul în contul tău.
4. Tab **General**: **Display Name** = Cuvinte Vesele, **Version** = 1.0.0, **Build** = 1, **Minimum Deployments** = iOS 15.0 (deja setate).

## Pasul 4 — Rulează pe simulator și pe iPhone-ul/iPad-ul real

- Simulator: alege un iPad sau iPhone din lista de sus → **⌘R**. Vocea în română lipsește pe simulator; pe un dispozitiv real există.
- Dispozitiv real: conectează-l cu cablul → pe dispozitiv **Settings → Privacy & Security → Developer Mode → ON** (repornire) → în Xcode alege dispozitivul → **⌘R**. Prima dată, pe dispozitiv: **Settings → General → VPN & Device Management → Trust** pentru contul tău. Așa o poate testa fiica ta înainte de publicare.

## Pasul 5 — Creează aplicația în App Store Connect

1. <https://appstoreconnect.apple.com> → **My Apps** → **+** → **New App**.
2. **Platforms**: iOS. **Name**: Cuvinte Vesele (numele trebuie să fie unic în tot App Store-ul; dacă e luat, încearcă „Cuvinte Vesele – jocuri pentru copii”). **Primary Language**: Romanian. **Bundle ID**: alege-l din listă (apare după pasul 3; dacă nu, îl creezi la <https://developer.apple.com/account/resources/identifiers>). **SKU**: `cuvintevesele-001`. **User Access**: Full Access.

## Pasul 6 — Archive și upload

1. În Xcode, destinația (lângă butonul Run): **Any iOS Device (arm64)**.
2. **Product → Archive**. Durează 1–3 minute. Se deschide fereastra **Organizer**.
3. **Distribute App → App Store Connect → Upload → Next → Next → Upload**. Lasă bifate „Upload your app's symbols” și „Manage Version and Build Number”.
4. Așteaptă e-mailul „*The build … has completed processing*” (5–30 min).

## Pasul 7 — TestFlight (recomandat înainte de review)

În App Store Connect → aplicația → tab **TestFlight** → build-ul apare → **Internal Testing → +** → adaugă-te pe tine. Instalezi aplicația **TestFlight** din App Store pe iPhone/iPad, accepți invitația și instalezi „Cuvinte Vesele”. Testează mai ales: vocea (clipurile audio), atingerile din jocurile de tras (cornul) și de colorat.

## Pasul 8 — Completează pagina aplicației (versiunea 1.0)

Tab **App Store** → **1.0 Prepare for Submission**:

- **Screenshots**: încarcă din `store/screenshots/iphone-6.9/` (iPhone 6,9") și `store/screenshots/ipad-13/` (iPad 13"). Sunt suficiente aceste două dimensiuni.
- **Promotional Text / Description / Keywords**: copiază din `store/listing.md`.
- **Support URL** (obligatoriu) și **Privacy Policy URL** (obligatoriu): ai nevoie de o pagină web publică. Cel mai simplu: un repo GitHub public cu `politica-de-confidentialitate.md` → activează GitHub Pages → ai un URL `https://<user>.github.io/...`. Același URL merge și ca Support URL (adaugă adresa ta de e-mail în pagină).
- **Build**: alege build-ul încărcat.
- **General App Information**: **Category** Education (secundar opțional Games › Educational); **Content Rights**: nu conține conținut terț cu drepturi; **Age Rating** → chestionarul, totul „None” → **4+**.
- **App Privacy** (secțiune separată, din stânga): **Data Not Collected** — aplicația nu colectează nimic.
- **Pricing and Availability**: Free; țările dorite (măcar România).
- **App Review Information**: numele tău, telefon, e-mail; la **Notes** lipește textul din `store/listing.md` (explică poarta părinților cu adunarea).
- **Version Release**: „Manually release this version” ca să decizi tu momentul.

### Opțional: Kids Category

La **Age Rating** poți bifa **Made for Kids** (categoria Kids, 5 and Under). Regulile sunt mai stricte (fără reclame, fără analytics terțe, fără linkuri externe fără poartă parentală) — aplicația le respectă deja. Dezavantaj: review ceva mai lung și nu poți ieși ușor din categorie mai târziu. Pentru prima versiune, recomand **fără** Kids Category, doar 4+ și categoria Education.

## Pasul 9 — Submit for Review

Click **Add for Review** → **Submit to App Review**. Răspunsul vine de obicei în 24–48 h. Dacă e respinsă, motivul apare în **Resolution Center**; răspunzi acolo și retrimiți (fără upload nou dacă e doar o lămurire). Cel mai probabil motiv de respingere la aplicațiile web împachetate este **4.2 Minimum Functionality**; aplicația noastră e un joc complet, offline, cu grafică proprie și animații, deci riscul e mic — menționează în Notes că funcționează complet fără internet.

## Pasul 10 — Actualizări

```bash
# după ce modifici www/
npm test && npx cap sync ios
npm run ios:open
```
În Xcode → **General**: crește **Version** (1.0.1) și **Build** (2) → **Product → Archive** → **Upload**. În App Store Connect: **+ Version** → completezi „What's New” → alegi build-ul → Submit.

## Vocea

Aplicația folosește clipuri audio pre-generate (`www/assets/audio/`) și revine la vocea de sistem doar pentru texte fără clip. Clipurile actuale sunt făcute cu **Piper** (voce neurală locală, gratuită; vocea română „mihai”, licență CC0). Dacă vrei o voce de calitate mai înaltă (feminină, foarte naturală), rulează generatorul cu **Azure Speech** (nivel gratuit F0: 500 000 de caractere/lună, mult peste necesar):

```bash
AZURE_SPEECH_KEY=cheia AZURE_SPEECH_REGION=westeurope node scripts/generate-audio.js azure --force
npx cap sync ios
```
Vocea implicită e `ro-RO-AlinaNeural` (femeie); alternativă `ro-RO-EmilNeural`. Cheia o iei din <https://portal.azure.com> → Create resource → **Speech** → tier **Free F0** → *Keys and Endpoint*. Alternativ, cu o cheie OpenAI: `OPENAI_API_KEY=... node scripts/generate-audio.js openai --force`.

## Probleme frecvente

- **„No signing certificate”** → pasul 2 (Accounts → Manage Certificates).
- **„Bundle identifier is not available”** → schimbă Bundle ID (e luat de altcineva).
- **Butonul Archive e gri** → destinația trebuie să fie „Any iOS Device”, nu un simulator.
- **„Missing Compliance”** la build în ASC → la întrebarea despre criptare răspunde **No** (aplicația nu folosește criptare proprie). Ca să nu mai întrebe, în Xcode → Info → adaugă `ITSAppUsesNonExemptEncryption` = `NO`.
- **Vocea nu se aude pe dispozitiv** → clipurile pornesc după prima atingere (regulă iOS); verifică și comutatorul de sunet (Ring/Silent) al iPhone-ului.
