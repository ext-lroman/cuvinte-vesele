// Conținutul educațional: teme, cuvinte (română + engleză), jocuri, culori, dinozauri, aventura.
// Fiecare cuvânt are ambele limbi; limba „de învățat” se alege din Zona părinților.

export const TOPICS = [
  {
    id: 'magie', ro: 'Unicorni și dinozauri', en: 'Unicorns & dinosaurs', emoji: '🦄', color: '#C77DFF',
    words: [
      { ro: 'unicorn', en: 'unicorn', emoji: '🦄' },
      { ro: 'dinozaur', en: 'dinosaur', emoji: '🦕' },
      { ro: 'T-rex', en: 'T-rex', emoji: '🦖' },
      { ro: 'dragon', en: 'dragon', emoji: '🐉' },
      { ro: 'castel', en: 'castle', emoji: '🏰' },
      { ro: 'zână', en: 'fairy', emoji: '🧚' },
      { ro: 'coroană', en: 'crown', emoji: '👑' },
      { ro: 'baghetă', en: 'wand', emoji: '🪄' },
    ],
  },
  {
    id: 'animale', ro: 'Animale', en: 'Animals', emoji: '🐶', color: '#FFB703',
    words: [
      { ro: 'câine', en: 'dog', emoji: '🐶' },
      { ro: 'pisică', en: 'cat', emoji: '🐱' },
      { ro: 'vacă', en: 'cow', emoji: '🐮' },
      { ro: 'cal', en: 'horse', emoji: '🐴' },
      { ro: 'porc', en: 'pig', emoji: '🐷' },
      { ro: 'rață', en: 'duck', emoji: '🦆' },
      { ro: 'broască', en: 'frog', emoji: '🐸' },
      { ro: 'leu', en: 'lion', emoji: '🦁' },
    ],
  },
  {
    id: 'culori', ro: 'Culori', en: 'Colors', emoji: '🎨', color: '#FF8FAB', noShadow: true,
    words: [
      { ro: 'roșu', en: 'red', emoji: '🔴' },
      { ro: 'albastru', en: 'blue', emoji: '🔵' },
      { ro: 'galben', en: 'yellow', emoji: '🟡' },
      { ro: 'verde', en: 'green', emoji: '🟢' },
      { ro: 'portocaliu', en: 'orange', emoji: '🟠' },
      { ro: 'mov', en: 'purple', emoji: '🟣' },
      { ro: 'maro', en: 'brown', emoji: '🟤' },
      { ro: 'negru', en: 'black', emoji: '⚫' },
    ],
  },
  {
    id: 'numere', ro: 'Numere', en: 'Numbers', emoji: '🔢', color: '#219EBC', noShadow: true,
    words: [
      { ro: 'unu', en: 'one', emoji: '1️⃣' },
      { ro: 'doi', en: 'two', emoji: '2️⃣' },
      { ro: 'trei', en: 'three', emoji: '3️⃣' },
      { ro: 'patru', en: 'four', emoji: '4️⃣' },
      { ro: 'cinci', en: 'five', emoji: '5️⃣' },
      { ro: 'șase', en: 'six', emoji: '6️⃣' },
      { ro: 'șapte', en: 'seven', emoji: '7️⃣' },
      { ro: 'opt', en: 'eight', emoji: '8️⃣' },
    ],
  },
  {
    id: 'mancare', ro: 'Mâncare', en: 'Food', emoji: '🍎', color: '#FF6B6B',
    words: [
      { ro: 'măr', en: 'apple', emoji: '🍎' },
      { ro: 'banană', en: 'banana', emoji: '🍌' },
      { ro: 'pâine', en: 'bread', emoji: '🍞' },
      { ro: 'brânză', en: 'cheese', emoji: '🧀' },
      { ro: 'morcov', en: 'carrot', emoji: '🥕' },
      { ro: 'ou', en: 'egg', emoji: '🥚' },
      { ro: 'lapte', en: 'milk', emoji: '🥛' },
      { ro: 'biscuit', en: 'cookie', emoji: '🍪' },
    ],
  },
  {
    id: 'corp', ro: 'Corpul meu', en: 'My body', emoji: '🙋', color: '#9B5DE5',
    words: [
      { ro: 'ochi', en: 'eye', emoji: '👁️' },
      { ro: 'nas', en: 'nose', emoji: '👃' },
      { ro: 'gură', en: 'mouth', emoji: '👄' },
      { ro: 'ureche', en: 'ear', emoji: '👂' },
      { ro: 'mână', en: 'hand', emoji: '✋' },
      { ro: 'picior', en: 'foot', emoji: '🦶' },
      { ro: 'dinte', en: 'tooth', emoji: '🦷' },
      { ro: 'limbă', en: 'tongue', emoji: '👅' },
    ],
  },
  {
    id: 'haine', ro: 'Haine', en: 'Clothes', emoji: '👕', color: '#6BCB77',
    words: [
      { ro: 'tricou', en: 'shirt', emoji: '👕' },
      { ro: 'pantaloni', en: 'pants', emoji: '👖' },
      { ro: 'pantofi', en: 'shoes', emoji: '👟' },
      { ro: 'pălărie', en: 'hat', emoji: '🎩' },
      { ro: 'șosete', en: 'socks', emoji: '🧦' },
      { ro: 'rochie', en: 'dress', emoji: '👗' },
      { ro: 'haină', en: 'coat', emoji: '🧥' },
      { ro: 'șapcă', en: 'cap', emoji: '🧢' },
    ],
  },
  {
    id: 'vreme', ro: 'Vremea', en: 'Weather', emoji: '🌤️', color: '#4CC9F0',
    words: [
      { ro: 'soare', en: 'sun', emoji: '☀️' },
      { ro: 'ploaie', en: 'rain', emoji: '🌧️' },
      { ro: 'zăpadă', en: 'snow', emoji: '❄️' },
      { ro: 'nor', en: 'cloud', emoji: '☁️' },
      { ro: 'curcubeu', en: 'rainbow', emoji: '🌈' },
      { ro: 'vânt', en: 'wind', emoji: '💨' },
      { ro: 'furtună', en: 'storm', emoji: '⛈️' },
      { ro: 'lună', en: 'moon', emoji: '🌙' },
    ],
  },
  {
    id: 'vehicule', ro: 'Vehicule', en: 'Vehicles', emoji: '🚗', color: '#FB8500',
    words: [
      { ro: 'mașină', en: 'car', emoji: '🚗' },
      { ro: 'autobuz', en: 'bus', emoji: '🚌' },
      { ro: 'bicicletă', en: 'bike', emoji: '🚲' },
      { ro: 'avion', en: 'plane', emoji: '✈️' },
      { ro: 'tren', en: 'train', emoji: '🚂' },
      { ro: 'barcă', en: 'boat', emoji: '⛵' },
      { ro: 'elicopter', en: 'helicopter', emoji: '🚁' },
      { ro: 'camion', en: 'truck', emoji: '🚚' },
    ],
  },
  {
    id: 'familie', ro: 'Familia', en: 'Family', emoji: '👨‍👩‍👧', color: '#F15BB5',
    words: [
      { ro: 'mama', en: 'mom', emoji: '👩' },
      { ro: 'tata', en: 'dad', emoji: '👨' },
      { ro: 'soră', en: 'sister', emoji: '👧' },
      { ro: 'frate', en: 'brother', emoji: '👦' },
      { ro: 'bebeluș', en: 'baby', emoji: '👶' },
      { ro: 'bunica', en: 'grandma', emoji: '👵' },
      { ro: 'bunicul', en: 'grandpa', emoji: '👴' },
      { ro: 'familie', en: 'family', emoji: '👨‍👩‍👧' },
    ],
  },
  {
    id: 'acasa', ro: 'Acasă', en: 'At home', emoji: '🏠', color: '#00BBF9',
    words: [
      { ro: 'pat', en: 'bed', emoji: '🛏️' },
      { ro: 'scaun', en: 'chair', emoji: '🪑' },
      { ro: 'ușă', en: 'door', emoji: '🚪' },
      { ro: 'fereastră', en: 'window', emoji: '🪟' },
      { ro: 'cadă', en: 'bathtub', emoji: '🛁' },
      { ro: 'ursuleț', en: 'teddy bear', emoji: '🧸' },
      { ro: 'televizor', en: 'TV', emoji: '📺' },
      { ro: 'cheie', en: 'key', emoji: '🔑' },
    ],
  },
];

// Jocurile dintr-o temă, în ordinea recomandată (de la cel mai ușor la cel mai greu).
// `skipIf` scoate jocul din temele unde nu are sens; `needs` îl leagă de o setare din Zona părinților.
export const GAMES = [
  { id: 'learn', ro: 'Învață', emoji: '📖', hint: 'Vezi și ascultă cuvinte noi' },
  { id: 'listen', ro: 'Ascultă și atinge', emoji: '👂', hint: 'Auzi un cuvânt, atinge imaginea' },
  { id: 'memory', ro: 'Memorie', emoji: '🃏', hint: 'Găsește perechile de imagini' },
  { id: 'shadow', ro: 'A cui e umbra?', emoji: '🌑', hint: 'Ghicește imaginea după umbră', skipIf: (t) => !!t.noShadow },
  { id: 'odd', ro: 'Care e diferit?', emoji: '🔍', hint: 'Găsește imaginea care nu se potrivește' },
  { id: 'count', ro: 'Câte sunt?', emoji: '🔢', hint: 'Numără și alege cifra' },
  { id: 'pattern', ro: 'Ce urmează?', emoji: '🧩', hint: 'Continuă șirul de imagini' },
  { id: 'spell', ro: 'Scrie cuvântul', emoji: '🔤', hint: 'Alcătuiește cuvântul din litere (5+ ani)', needs: 'letters' },
];

// Câte jocuri dintr-o temă trebuie terminate pentru abțibildul ei.
export const STICKER_GAMES = 5;

// Jocuri de sine stătătoare (ecranul „Jocuri”), în ordinea din meniu.
export const EXTRAS = [
  { id: 'baloane', module: 'balloons', ro: 'Sparge baloanele', emoji: '🎈', color: '#4CC9F0', hint: 'Atinge balonul cu ce auzi' },
  { id: 'imbraca', module: 'dressUp', ro: 'Îmbracă unicornul', emoji: '🎀', color: '#FF8FAB', hint: 'Pune-i accesorii frumoase' },
  { id: 'hraneste', module: 'feedDino', ro: 'Hrănește dinozaurul', emoji: '🍎', color: '#6BCB77', hint: 'Dă-i mâncarea pe care o cere' },
  { id: 'puzzle', module: 'puzzle', ro: 'Puzzle', emoji: '🧩', color: '#9B5DE5', hint: 'Pune bucățile la locul lor' },
  { id: 'traseaza', module: 'trace', ro: 'Trasează cifrele', emoji: '✏️', color: '#219EBC', hint: 'Urmărește cifra cu degetul' },
  { id: 'sorteaza', module: 'colorSort', ro: 'Sortează culorile', emoji: '🧺', color: '#FB8500', hint: 'Fiecare formă în coșul ei' },
];

export const AVATARS = ['🦄', '🦕', '🦖', '🦊', '🐼', '🐰', '🐯', '🐸'];

export const NUMBER_WORDS = {
  ro: ['', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase'],
  en: ['', 'one', 'two', 'three', 'four', 'five', 'six'],
};
export const COUNT_FAVORITES = ['🦄', '🦕', '🦖', '🌈', '⭐', '🎈', '🍎', '🐣'];

// Paleta de colorat (și culorile curcubeului, în ordine).
export const COLORS = [
  { id: 'rosu', ro: 'roșu', en: 'red', hex: '#FF5A5F' },
  { id: 'portocaliu', ro: 'portocaliu', en: 'orange', hex: '#FF9F1C' },
  { id: 'galben', ro: 'galben', en: 'yellow', hex: '#FFD60A' },
  { id: 'verde', ro: 'verde', en: 'green', hex: '#6BCB77' },
  { id: 'albastru', ro: 'albastru', en: 'blue', hex: '#3A86FF' },
  { id: 'mov', ro: 'mov', en: 'purple', hex: '#9B5DE5' },
  { id: 'roz', ro: 'roz', en: 'pink', hex: '#FF8FAB' },
  { id: 'bleu', ro: 'bleu', en: 'light blue', hex: '#8ECAE6' },
  { id: 'maro', ro: 'maro', en: 'brown', hex: '#B5651D' },
  { id: 'turcoaz', ro: 'turcoaz', en: 'turquoise', hex: '#2EC4B6' },
  { id: 'lila', ro: 'lila', en: 'lilac', hex: '#C8B6FF' },
  { id: 'auriu', ro: 'auriu', en: 'gold', hex: '#E9C46A' },
  { id: 'gri', ro: 'gri', en: 'gray', hex: '#ADB5BD' },
  { id: 'negru', ro: 'negru', en: 'black', hex: '#343A40' },
  { id: 'alb', ro: 'alb', en: 'white', hex: '#FFFFFF' },
];
export const RAINBOW = ['rosu', 'portocaliu', 'galben', 'verde', 'albastru', 'mov'];

// Dinozaurii din aventură (desenele sunt în art.js). `def` = forma articulată, pentru întrebări.
export const DINOS = [
  { id: 'trex', ro: 'Tiranozaur', def: 'Tiranozaurul', en: 'T-rex' },
  { id: 'triceratops', ro: 'Triceratops', def: 'Triceratopsul', en: 'Triceratops' },
  { id: 'stegozaur', ro: 'Stegozaur', def: 'Stegozaurul', en: 'Stegosaurus' },
  { id: 'diplodocus', ro: 'Diplodocus', def: 'Diplodocusul', en: 'Diplodocus' },
  { id: 'pterodactil', ro: 'Pterodactil', def: 'Pterodactilul', en: 'Pterodactyl' },
];

// Aventura: cinci pași, unul după altul.
export const ADVENTURE = [
  { id: 'corn', ro: 'Pune cornul la unicorn', emoji: '🦄', hint: 'Trage cornul pe capul fiecărui unicorn' },
  { id: 'unicorni', ro: 'Colorează unicornii', emoji: '🎨', hint: 'Alege culori și atinge desenul' },
  { id: 'dinozauri', ro: 'Colorează dinozaurii', emoji: '🖍️', hint: 'Trei dinozauri de colorat' },
  { id: 'nume', ro: 'Numele dinozaurilor', emoji: '🦖', hint: 'Învață cum îi cheamă și găsește-i' },
  { id: 'curcubeu', ro: 'Colorează curcubeul', emoji: '🌈', hint: 'Fiecare dungă cu culoarea cerută' },
  { id: 'drum', ro: 'Drumul prietenilor', emoji: '🛤️', hint: 'Construiește drumul ca DinoZ și UniCORN să se întâlnească' },
];
