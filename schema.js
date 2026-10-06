// Tasting grid definition (based on the deductive tasting grid).
// Everything in the app (form, CSV, detail view, summary) is driven from here.

export const TYPES = ['Red', 'White', 'Rosé'];
export const MODES = ['Blind', 'Study'];
const LEVELS = ['Low', 'Med-', 'Medium', 'Med+', 'High'];

// ---------- Descriptor groups ----------
const WHITE_FRUIT = {
  Citrus: ['Lemon', 'Lime', 'Grapefruit', 'Orange', 'Blood Orange', 'Tangerine', 'Peel/Rind', 'Pith', 'Lemon Zest'],
  Orchard: ['Green Apple', 'Yellow Apple', 'Red Apple', 'Baked Apple', 'Pear', 'Unripe Pear', 'Overripe Pear', 'Quince', 'Fig'],
  Stone: ['Peach', 'White Peach', 'Nectarine', 'Apricot', 'Yellow Plum (Mirabelle)'],
  Tropical: ['Banana', 'Passion Fruit', 'Mango', 'Guava', 'Lychee', 'Pineapple', 'Kiwi'],
  'Berry/Other': ['Gooseberry', 'Grape', 'Melon', 'Honeydew', 'Watermelon'],
};
const RED_FRUIT = {
  Red: ['Strawberry', 'Cherry', 'Sour Cherry', 'Raspberry', 'Cranberry', 'Redcurrant', 'Pomegranate', 'Red Plum', 'Cola'],
  Black: ['Blackberry', 'Blackcurrant', 'Black Cherry', 'Black Plum'],
  Blue: ['Blueberry'],
  Dried: ['Dates', 'Figs', 'Raisin', 'Fruitcake', 'Prune', 'Dried Cherry', 'Dried Raspberry'],
};
const ROSE_FRUIT = {
  'Rosé': ['Wild Strawberry', 'Plum', 'Raspberry'],
  Red: RED_FRUIT.Red,
  Citrus: WHITE_FRUIT.Citrus,
  Stone: WHITE_FRUIT.Stone,
  Orchard: WHITE_FRUIT.Orchard,
  Tropical: WHITE_FRUIT.Tropical,
};

const NON_FRUIT = {
  Flower: ['Apple Blossom', 'Citrus Blossom', 'Acacia', 'Lily', 'Gardenia', 'Lilac', 'Iris', 'Jasmine', 'Honeysuckle', 'Chamomile', 'Rose', 'Violet', 'Dried Flowers'],
  Herb: ['Rosemary', 'Thyme', 'Basil', 'Tarragon', 'Lemongrass', 'Eucalyptus', 'Mint', 'Lavender', 'Dill', 'Chive', 'Parsley', 'Fennel', 'Oregano', 'Dried Herbs'],
  Vegetal: ['Tomato Leaf', 'Asparagus', 'Green Pepper', 'Celery', 'Radish', 'Olive', 'Pea Shoot', 'Beetroot', 'Cucumber', 'Cut Grass'],
  Spice: ['Celery Salt', 'Coriander', 'Juniper', 'Black Pepper', 'White Pepper', 'Liquorice'],
};
const ORGANIC_MINERAL = {
  Organic: ['Compost', 'Earth', 'Forest Floor', 'Dust', 'Fresh Soil', 'White Mushroom', 'Truffle', 'Farmyard', 'Watercress', 'Tomato Leaf', 'Blackcurrant Leaf', 'Cabbage', 'Liquorice', 'Olive'],
  Mineral: ['Slate', 'Chalk', 'Limestone', 'Flint', 'Volcanic', 'River Pebble', 'Seashell', 'Oyster Shell', 'Wet Rock', 'Petrol'],
};
const SECONDARY = {
  'Oak Type': ['New Oak', 'Old Oak', 'French Oak', 'American Oak'],
  Oak: ['Vanilla', 'Toast', 'Smoke', 'Caramel', 'Chocolate', 'Coffee', 'Cedar', 'Coconut', 'Dill'],
  'Baking Spices': ['Allspice', 'Cinnamon', 'Aniseed', 'Clove', 'Ginger', 'Nutmeg'],
  Malolactic: ['Butter', 'Cream', 'Custard', 'Nuts', 'Diacetyl', 'Brioche', 'Yogurt'],
  'Lees Ageing': ['Yeasty', 'Bread Dough', 'Stale Beer', 'Cheesy', 'Phenolic'],
  'Carbonic Maceration': ['Banana', 'Bubblegum', 'Strawberry', 'Esters'],
  Botrytis: ['Ginger', 'Saffron', "Pain d'Epices", 'Beeswax', 'Honey'],
};
const TERT_WHITE = ['Nutty', 'Hazelnut', 'Honey', 'Chamomile', 'Petrol/Diesel', 'Straw/Hay', 'Mushroom', 'Truffle', 'Olive Oil'];
const TERT_RED = ['Damp Earth', 'Forest Floor', 'Dried Leaves', 'Truffle', 'Mushroom', 'Leather', 'Game', 'Meaty', 'Prune', 'Dried Fruits', 'Raisin', 'Beetroot', 'Tobacco', 'Sun Dried Tomato', 'Balsamic', 'Chinese Tea', 'Farmyard'];

const fruitGroups = (t) => (t === 'White' ? WHITE_FRUIT : t === 'Rosé' ? ROSE_FRUIT : t === 'Red' ? RED_FRUIT : { ...WHITE_FRUIT, ...RED_FRUIT });
const tertiaryGroups = (t) => (t === 'White' ? { Tertiary: TERT_WHITE } : t === 'Red' ? { Tertiary: TERT_RED } : { 'Tertiary (Whites)': TERT_WHITE, 'Tertiary (Reds)': TERT_RED });
const colourOptions = (t) =>
  t === 'White' ? ['Straw', 'Yellow', 'Gold', 'Amber'] :
  t === 'Red' ? ['Purple', 'Ruby', 'Garnet'] :
  t === 'Rosé' ? ['Pale Pink', 'Salmon', 'Copper', 'Onion Skin'] : [];

export const GRAPES = [
  'Albariño', 'Aglianico', 'Barbera', 'Cabernet Franc', 'Cabernet Sauvignon', 'Carménère', 'Chardonnay', 'Chenin Blanc',
  'Cinsault', 'Corvina', 'Gamay', 'Garganega', 'Gewürztraminer', 'Grenache', 'Grüner Veltliner', 'Malbec', 'Marsanne',
  'Melon de Bourgogne', 'Merlot', 'Mourvèdre', 'Muscat', 'Nebbiolo', 'Nero d\'Avola', 'Petit Verdot', 'Pinot Blanc', 'Pinot Gris',
  'Pinot Noir', 'Pinotage', 'Riesling', 'Roussanne', 'Sangiovese', 'Sauvignon Blanc', 'Sémillon', 'Syrah', 'Tannat',
  'Tempranillo', 'Torrontés', 'Touriga Nacional', 'Verdejo', 'Vermentino', 'Viognier', 'Zinfandel',
  'Bordeaux Blend', 'GSM Blend',
];
export const COUNTRIES = [
  'Argentina', 'Australia', 'Austria', 'Brazil', 'Canada', 'Chile', 'France', 'Germany', 'Greece', 'Hungary', 'Israel',
  'Italy', 'Lebanon', 'New Zealand', 'Portugal', 'South Africa', 'Spain', 'Switzerland', 'United Kingdom', 'Uruguay', 'USA',
];
export const QUALITY = ['AOC', 'AOP', 'DOC', 'DOCG', 'DO', 'DOCa', 'IGT', 'IGP', 'Grand Cru', 'Premier Cru', 'Village', 'Crianza', 'Reserva', 'Gran Reserva', 'Prädikatswein', 'Kabinett', 'Spätlese', 'Auslese', 'AVA', 'GI'];

// ---------- Fields ----------
// kind: single | multi | grouped (multi chips in groups) | text | textarea | number | date | photo | header
// col: CSV column header
const F = (key, col, label, kind, extra = {}) => ({ key, col, label, kind, ...extra });

export const SECTIONS = [
  {
    id: 'setup', title: 'Setup',
    fields: [
      F('date', 'Date', 'Date', 'date'),
      F('mode', 'Mode', 'Mode', 'single', { options: MODES, required: true }),
      F('type', 'Type', 'Wine type', 'single', { options: TYPES, required: true }),
    ],
  },
  {
    id: 'sight', title: 'Sight',
    fields: [
      F('clarity', 'Sight - Clarity', 'Clarity', 'single', { options: ['Clear', 'Slightly Cloudy', 'Cloudy'] }),
      F('brightness', 'Sight - Brightness', 'Brightness', 'single', { options: ['Dull', 'Bright', 'Brilliant'] }),
      F('concentration', 'Sight - Concentration', 'Concentration', 'single', { options: ['Pale/Translucent', 'Medium', 'Deep', 'Opaque'] }),
      F('gas', 'Sight - Gas Evidence', 'Gas evidence', 'single', { options: ['Yes', 'No'] }),
      F('sediment', 'Sight - Sediment', 'Sediment / particles', 'single', { options: ['Yes', 'No'] }),
      F('colour', 'Sight - Colour', 'Colour', 'single', { options: colourOptions }),
      F('hue', 'Sight - Hue', 'Hue', 'multi', { options: ['Silver', 'Green', 'Orange', 'Purple', 'Ruby', 'Garnet', 'Brown'] }),
      F('rim', 'Sight - Rim Variation', 'Rim variation (centre → edge)', 'single', { options: ['Yes', 'No'] }),
      F('stain', 'Sight - Extract/Stain', 'Extract / stain', 'single', { options: ['None', 'Light', 'Medium', 'Heavy'] }),
      F('viscosity', 'Sight - Viscosity', 'Viscosity / tears', 'single', { options: LEVELS }),
      F('sight_notes', 'Sight - Notes', 'Notes', 'textarea'),
    ],
  },
  {
    id: 'nose', title: 'Nose',
    fields: [
      F('condition', 'Nose - Clean/Faulty', 'Clean / faulty', 'single', { options: ['Clean', 'Faulty'] }),
      F('faults', 'Nose - Faults', 'Faults', 'multi', { options: ['TCA', 'H2S', 'VA', 'Brett', 'Oxidation', 'Other'], showIf: (r) => r.condition === 'Faulty' }),
      F('intensity', 'Nose - Intensity', 'Intensity', 'single', { options: ['Delicate', 'Moderate', 'Powerful'] }),
      F('fruit_condition', 'Nose - Fruit Condition', 'Fruit condition', 'multi', { options: ['Tart/Unripe', 'Ripe', 'Tropical', 'Overripe', 'Jammy', 'Baked'] }),
      F('age_assessment', 'Nose - Age Assessment', 'Age assessment', 'single', { options: ['Youthful', 'Vinous'] }),
      F('n_fruit', 'Nose - Primary Fruit', 'Primary fruit', 'grouped', { groups: fruitGroups }),
      F('n_nonfruit', 'Nose - Primary Non-Fruit', 'Primary non-fruit', 'grouped', { groups: () => NON_FRUIT }),
      F('n_secondary', 'Nose - Secondary', 'Secondary (winemaking)', 'grouped', { groups: () => SECONDARY }),
      F('n_orgmin', 'Nose - Organic/Mineral', 'Organic / mineral', 'grouped', { groups: () => ORGANIC_MINERAL }),
      F('n_tertiary', 'Nose - Tertiary', 'Tertiary (aged)', 'grouped', { groups: tertiaryGroups }),
      F('nose_other', 'Nose - Other Descriptors', 'Other descriptors', 'text', { placeholder: 'Anything not in the lists' }),
      F('nose_notes', 'Nose - Notes', 'Notes', 'textarea'),
    ],
  },
  {
    id: 'palate', title: 'Palate',
    fields: [
      F('_h_struct', '', 'Structure', 'header'),
      F('sweetness', 'Palate - Sweetness', 'Sweetness', 'single', { options: ['Bone Dry', 'Dry', 'Off Dry', 'Sweet', 'Dessert'] }),
      F('tannin', 'Palate - Tannin', 'Tannin', 'single', { options: LEVELS }),
      F('acid', 'Palate - Acid', 'Acid', 'single', { options: LEVELS }),
      F('alcohol', 'Palate - Alcohol', 'Alcohol', 'single', { options: LEVELS }),
      F('body', 'Palate - Body/Texture', 'Body / texture', 'multi', { options: ['Tart', 'Light', 'Medium', 'Full', 'Creamy', 'Round'] }),
      F('_h_flav', '', 'Flavour', 'header', { copyFromNose: true }),
      F('p_fruit', 'Palate - Primary Fruit', 'Primary fruit', 'grouped', { groups: fruitGroups, noseKey: 'n_fruit' }),
      F('p_nonfruit', 'Palate - Primary Non-Fruit', 'Primary non-fruit', 'grouped', { groups: () => ({ ...NON_FRUIT, ...ORGANIC_MINERAL }), noseKey: ['n_nonfruit', 'n_orgmin'] }),
      F('p_secondary', 'Palate - Secondary', 'Secondary', 'grouped', { groups: () => SECONDARY, noseKey: 'n_secondary' }),
      F('p_tertiary', 'Palate - Tertiary', 'Tertiary', 'grouped', { groups: tertiaryGroups, noseKey: 'n_tertiary' }),
      F('balance', 'Palate - Balance', 'Balance', 'single', { options: ['Balanced', 'Element dominates'] }),
      F('dominant', 'Palate - Dominant Element', 'Dominant element', 'multi', { options: ['Fruit', 'Acid', 'Alcohol', 'Tannin', 'Oak', 'Sweetness'], showIf: (r) => r.balance === 'Element dominates' }),
      F('length', 'Palate - Length/Finish', 'Length / finish', 'single', { options: ['Short', 'Med-', 'Medium', 'Med+', 'Long'] }),
      F('complexity', 'Palate - Complexity', 'Complexity', 'single', { options: ['Low', 'Moderate', 'Complex'] }),
      F('palate_other', 'Palate - Other Descriptors', 'Other descriptors', 'text', { placeholder: 'Anything not in the lists' }),
      F('palate_notes', 'Palate - Notes', 'Notes', 'textarea'),
    ],
  },
  {
    id: 'conclusion', title: 'Conclusion', blindOnly: true,
    fields: [
      F('_h_ic', '', 'Initial conclusion', 'header'),
      F('climate', 'Initial - Climate', 'Climate', 'single', { options: ['Cool', 'Cool/Mod', 'Moderate', 'Mod/Warm', 'Warm'] }),
      F('ic_grapes', 'Initial - Grape Variety/Blend', 'Grape variety / blend (options)', 'text', { list: 'dl-grapes', placeholder: 'e.g. Pinot Noir, Gamay' }),
      F('ic_countries', 'Initial - Possible Countries', 'Possible countries', 'text', { list: 'dl-countries', placeholder: 'e.g. France, New Zealand' }),
      F('age_range', 'Initial - Age Range', 'Age range', 'single', { options: ['1-3 yrs', '3-5 yrs', '5-10 yrs', '10 yrs+'] }),
      F('_h_fc', '', 'Final conclusion', 'header'),
      F('fc_vintage', 'Final - Vintage', 'Vintage', 'number', { placeholder: 'e.g. 2019' }),
      F('fc_grape', 'Final - Grape Variety/Blend', 'Grape variety / blend', 'text', { list: 'dl-grapes' }),
      F('fc_country', 'Final - Country', 'Country of origin', 'text', { list: 'dl-countries' }),
      F('fc_region', 'Final - Region/Appellation', 'Region / appellation', 'text'),
      F('fc_quality', 'Final - Quality Hierarchy', 'Quality hierarchy', 'text', { list: 'dl-quality', placeholder: 'e.g. AOC, DOCG, Grand Cru, Reserva' }),
    ],
  },
  {
    id: 'wine', title: 'The Wine',
    fields: [
      F('w_producer', 'Wine - Producer', 'Producer', 'text'),
      F('w_name', 'Wine - Name', 'Wine name', 'text'),
      F('w_vintage', 'Wine - Vintage', 'Vintage', 'text', { placeholder: 'e.g. 2019 or NV', inputmode: 'numeric' }),
      F('w_grapes', 'Wine - Grapes', 'Grape(s)', 'text', { list: 'dl-grapes', placeholder: 'Separate with commas' }),
      F('w_country', 'Wine - Country', 'Country', 'text', { list: 'dl-countries' }),
      F('w_region', 'Wine - Region', 'Region', 'text'),
      F('w_appellation', 'Wine - Appellation/Classification', 'Appellation / classification', 'text', { list: 'dl-quality' }),
      F('w_price', 'Wine - Price', 'Price', 'text', { inputmode: 'decimal', placeholder: 'e.g. 189.90' }),
      F('w_where', 'Wine - Where Tasted', 'Where tasted', 'text'),
      F('photo', 'Label Photo', 'Label photo', 'photo'),
      F('_h_score', '', 'Blind score', 'header', { blindOnly: true }),
      F('s_grape', 'Score - Grape', 'Grape', 'single', { options: ['Correct', 'Wrong'], blindOnly: true }),
      F('s_country', 'Score - Country', 'Country', 'single', { options: ['Correct', 'Wrong'], blindOnly: true }),
      F('s_region', 'Score - Region', 'Region', 'single', { options: ['Correct', 'Wrong'], blindOnly: true }),
      F('s_vintage', 'Score - Vintage Diff (yrs)', 'Vintage difference (years)', 'number', { blindOnly: true }),
    ],
  },
  {
    id: 'notes', title: 'Notes',
    fields: [F('general_notes', 'General Notes', 'General notes', 'textarea', { rows: 6 })],
  },
];

export const META_COLS = [
  { key: 'id', col: 'Wine ID' },
  { key: 'created_at', col: 'Created At' },
  { key: 'updated_at', col: 'Updated At' },
];

export const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields.map((f) => ({ ...f, section: s.id, sectionBlind: !!s.blindOnly })));
export const DATA_FIELDS = ALL_FIELDS.filter((f) => f.kind !== 'header');
export const COLUMNS = [...META_COLS, ...DATA_FIELDS.map((f) => ({ key: f.key, col: f.col, kind: f.kind }))];
export const FIELD = Object.fromEntries(DATA_FIELDS.map((f) => [f.key, f]));
export const MULTI_KINDS = new Set(['multi', 'grouped']);

export function optionsFor(field, rec) {
  if (field.kind === 'grouped') {
    const g = field.groups(rec.type);
    return Object.values(g).flat();
  }
  return typeof field.options === 'function' ? field.options(rec.type) : field.options || [];
}

export function isVisible(field, rec, sectionBlind = false) {
  if ((sectionBlind || field.blindOnly) && rec.mode !== 'Blind') return false;
  if (field.showIf && !field.showIf(rec)) return false;
  return true;
}

// Steps of the wizard, depending on mode
export function stepsFor(mode) {
  const by = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
  const order = mode === 'Study'
    ? ['setup', 'wine', 'sight', 'nose', 'palate', 'notes']
    : ['setup', 'sight', 'nose', 'palate', 'conclusion', 'wine', 'notes'];
  return order.map((id) => by[id]);
}

// ---------- Blind scoring ----------
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/\s+/g, ' ').trim();
const GRAPE_SYN = {
  shiraz: 'syrah', 'pinot grigio': 'pinot gris', grauburgunder: 'pinot gris', garnacha: 'grenache', garnatxa: 'grenache', cannonau: 'grenache',
  monastrell: 'mourvedre', mataro: 'mourvedre', primitivo: 'zinfandel', 'tinta roriz': 'tempranillo', 'tinto fino': 'tempranillo',
  aragonez: 'tempranillo', 'tinta de toro': 'tempranillo', spatburgunder: 'pinot noir', 'pinot nero': 'pinot noir', cot: 'malbec',
  lemberger: 'blaufrankisch', alvarinho: 'albarino', carinena: 'carignan', mazuelo: 'carignan', zibibbo: 'muscat', moscato: 'muscat',
  'moscatel': 'muscat', 'ugni blanc': 'trebbiano', 'fume blanc': 'sauvignon blanc', steen: 'chenin blanc', weissburgunder: 'pinot blanc',
  'pinot bianco': 'pinot blanc', spanna: 'nebbiolo', chiavennasca: 'nebbiolo', 'sangiovese grosso': 'sangiovese', brunello: 'sangiovese',
  'prugnolo gentile': 'sangiovese', semillon: 'semillon', gewurztraminer: 'gewurztraminer', 'gruner': 'gruner veltliner', 'melon': 'melon de bourgogne',
  'muscadet': 'melon de bourgogne', 'carmenere': 'carmenere', 'gsm': 'gsm blend',
};
const COUNTRY_SYN = { us: 'usa', 'united states': 'usa', 'united states of america': 'usa', 'estados unidos': 'usa', uk: 'united kingdom', england: 'united kingdom', 'nz': 'new zealand', 'sa': 'south africa', 'franca': 'france', 'italia': 'italy', 'espanha': 'spain', 'alemanha': 'germany', 'brasil': 'brazil' };

export const splitList = (s) => String(s || '').split(/[,/&+;|]| and | e /i).map((x) => x.trim()).filter(Boolean);
const grapeKey = (g) => { const n = norm(g); return GRAPE_SYN[n] || n; };
const countryKey = (c) => { const n = norm(c); return COUNTRY_SYN[n] || n; };

export function autoScore(r) {
  const out = {};
  const guessG = splitList(r.fc_grape).map(grapeKey);
  const actG = splitList(r.w_grapes).map(grapeKey);
  if (guessG.length && actG.length) out.s_grape = guessG.some((g) => actG.includes(g)) ? 'Correct' : 'Wrong';
  if (r.fc_country && r.w_country) out.s_country = countryKey(r.fc_country) === countryKey(r.w_country) ? 'Correct' : 'Wrong';
  const gr = norm(r.fc_region), ar = [norm(r.w_region), norm(r.w_appellation)].filter(Boolean);
  if (gr && ar.length) out.s_region = ar.some((a) => a.includes(gr) || gr.includes(a)) ? 'Correct' : 'Wrong';
  const gv = parseInt(r.fc_vintage, 10), av = parseInt(r.w_vintage, 10);
  if (!isNaN(gv) && !isNaN(av)) out.s_vintage = String(Math.abs(gv - av));
  return out;
}
export { grapeKey, countryKey, norm };
