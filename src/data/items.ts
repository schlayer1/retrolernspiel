export type ItemId =
  | 'beere'
  | 'stock'
  | 'stein'
  | 'fleisch'
  | 'gebraten'
  | 'fell'
  | 'faustkeil'
  | 'samen'
  | 'getreide'
  | 'hacke'
  | 'sichel'
  | 'lehm'
  | 'tontopf'
  | 'wasser'
  | 'wolle'
  | 'milch'
  | 'brot'
  | 'stoff'
  | 'salz'
  | 'bernstein'
  | 'spitzhacke'
  | 'kupfererz'
  | 'kupfer'
  | 'kupferbeil'
  | 'zinn'
  | 'bronze'
  | 'bronzeschwert'
  | 'eisenerz'
  | 'eisen'
  | 'eisenwerkzeug';

export type ItemCategory = 'tool' | 'food' | 'material';

export interface ItemDef {
  id: ItemId;
  name: string;
  category: ItemCategory;
  desc: string;
  foodValue?: number;
  tint?: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  beere: {
    id: 'beere',
    name: 'Waldbeeren',
    category: 'food',
    desc: 'Süße, reife Waldbeeren. Schnelle Stärkung für unterwegs (+12 Essen).',
    foodValue: 12,
  },
  stock: {
    id: 'stock',
    name: 'Holzstöcke',
    category: 'material',
    desc: 'Trockenes Astholz zum Bauen von Lagerfeuern, Fallen und Werkzeuggriffen.',
  },
  stein: {
    id: 'stein',
    name: 'Feuersteine',
    category: 'material',
    desc: 'Harte Kiesel und Feuersteine. Werden zu scharfen Klingen geschlagen.',
  },
  fleisch: {
    id: 'fleisch',
    name: 'Rohes Fleisch',
    category: 'food',
    desc: 'Frisches Fleisch aus der Falle. Roh essbar (+15 Essen), gebraten viel besser!',
    foodValue: 15,
  },
  gebraten: {
    id: 'gebraten',
    name: 'Gebratenes Fleisch',
    category: 'food',
    desc: 'Über dem Lagerfeuer knusprig gegrillt. Gibt viel Kraft (+40 Essen).',
    foodValue: 40,
    tint: 0xd9a066,
  },
  fell: {
    id: 'fell',
    name: 'Warmes Fell',
    category: 'material',
    desc: 'Dichtes Tierfell. Hielt die Jäger der Eiszeit in kalten Nächten warm.',
  },
  faustkeil: {
    id: 'faustkeil',
    name: 'Faustkeil',
    category: 'tool',
    desc: 'Das Schweizer Taschenmesser der Altsteinzeit: zum Schneiden, Hacken und Schaben.',
  },
  samen: {
    id: 'samen',
    name: 'Wildkorn-Samen',
    category: 'material',
    desc: 'Körner von Wildgetreide. Können auf gehacktem Boden ausgesät werden.',
  },
  getreide: {
    id: 'getreide',
    name: 'Getreide (Emmer)',
    category: 'food',
    desc: 'Urtümliches Getreide. Grundnahrungsmittel für Mehl und gebackenes Brot.',
  },
  hacke: {
    id: 'hacke',
    name: 'Steinhacke',
    category: 'tool',
    desc: 'Bodenhacke mit Steinblatt. Lockert den harten Waldboden für den Ackerbau.',
  },
  sichel: {
    id: 'sichel',
    name: 'Erntesichel',
    category: 'tool',
    desc: 'Krumme Sichel mit scharfen Steinklingen zum Schneiden von reifem Getreide.',
  },
  lehm: {
    id: 'lehm',
    name: 'Ufer-Lehm',
    category: 'material',
    desc: 'Feuchter, formbarer Ton vom Seeufer. Rohstoff für Töpfe und Ofenwände.',
  },
  tontopf: {
    id: 'tontopf',
    name: 'Tontopf (leer)',
    category: 'tool',
    desc: 'Im Ofen gebranntes Tongefäß zum Schöpfen von Wasser und Lagern von Körnern.',
  },
  wasser: {
    id: 'wasser',
    name: 'Wasser im Tontopf',
    category: 'tool',
    desc: 'Frisches Seewasser zum Gießen der frisch gesäten Ackerpflanzen.',
    tint: 0x6ec6ff,
  },
  wolle: {
    id: 'wolle',
    name: 'Schaf- & Ziegenwolle',
    category: 'material',
    desc: 'Weiche Tierwolle von gezähmten Ziegen. Kann am Webstuhl verarbeitet werden.',
  },
  milch: {
    id: 'milch',
    name: 'Frische Ziegenmilch',
    category: 'food',
    desc: 'Nahrhafte Milch von gezähmten Tieren aus dem Gehege (+25 Essen).',
    foodValue: 25,
  },
  brot: {
    id: 'brot',
    name: 'Warmes Fladenbrot',
    category: 'food',
    desc: 'Aus gemahlenem Emmer-Korn auf heißen Steinen gebacken (+50 Essen).',
    foodValue: 50,
    tint: 0xe6b873,
  },
  stoff: {
    id: 'stoff',
    name: 'Gewebter Stoff',
    category: 'material',
    desc: 'Am Gewichtswebstuhl geknüpftes Tuch. Weich, warm und begehrte Handelsware.',
  },
  salz: {
    id: 'salz',
    name: 'Alpensalz („Weißes Gold“)',
    category: 'material',
    desc: 'Kostbares Salz aus fernen Stollen. Macht Fleisch und Vorräte monatelang haltbar.',
  },
  bernstein: {
    id: 'bernstein',
    name: 'Ostsee-Bernstein',
    category: 'material',
    desc: 'Versteinertes Baumharz von der fernen Ostsee. Edler Schmuck und Statussymbol.',
  },
  spitzhacke: {
    id: 'spitzhacke',
    name: 'Bergbau-Spitzhacke',
    category: 'tool',
    desc: 'Schwere Hacke zum Herausschlagen von Kupfer- und Eisenerzen aus dem Fels.',
  },
  kupfererz: {
    id: 'kupfererz',
    name: 'Kupfererz (Malachit)',
    category: 'material',
    desc: 'Grünlich schimmerndes Erz von der Bergwand. Schmilzt bei rund 1.085 °C.',
    tint: 0xe07a45,
  },
  kupfer: {
    id: 'kupfer',
    name: 'Kupferbarren',
    category: 'material',
    desc: 'Im Rennofen verhüttetes Reinkupfer. Weich, aber erstmals gießbar!',
  },
  kupferbeil: {
    id: 'kupferbeil',
    name: 'Kupferbeil (Ötzi)',
    category: 'tool',
    desc: 'Das berühmte Statussymbol der Kupferzeit – exakt wie das Beil der Gletschermumie Ötzi.',
    tint: 0xe08955,
  },
  zinn: {
    id: 'zinn',
    name: 'Zinnerz (Kassiterit)',
    category: 'material',
    desc: 'Sehr seltenes Metallerz von Fernhändlern. Zusammen mit Kupfer entsteht Bronze!',
  },
  bronze: {
    id: 'bronze',
    name: 'Bronzebarren',
    category: 'material',
    desc: 'Harte Legierung aus 9 Teilen Kupfer und 1 Teil Zinn. Ein gewaltiger Epochensprung.',
  },
  bronzeschwert: {
    id: 'bronzeschwert',
    name: 'Bronzeschwert',
    category: 'tool',
    desc: 'In Steinformen gegossene, scharfe Waffe der Bronzezeit-Krieger und Häuptlinge.',
  },
  eisenerz: {
    id: 'eisenerz',
    name: 'Eisenerz (Roteisen)',
    category: 'material',
    desc: 'Dunkler Erzstein aus dem Bergstollen. Benötigt über 1.500 °C Gluthitze.',
    tint: 0x9aa5b8,
  },
  eisen: {
    id: 'eisen',
    name: 'Eisenbarren',
    category: 'material',
    desc: 'Zähes, schmiedbares Roheisen. Überall in der Natur vorkommend und extrem widerstandsfähig.',
  },
  eisenwerkzeug: {
    id: 'eisenwerkzeug',
    name: 'Eisenschmiedewerkzeug',
    category: 'tool',
    desc: 'Am Amboss geschmiedete Werkzeuge der Eisenzeit. Revolutionierten Landbau und Handwerk.',
  },
};

export type RecipeId =
  | 'fire'
  | 'trap'
  | 'faustkeil'
  | 'hacke'
  | 'sichel'
  | 'tontopf'
  | 'brot'
  | 'stoff'
  | 'spitzhacke'
  | 'kupfer'
  | 'kupferbeil'
  | 'bronze'
  | 'bronzeschwert'
  | 'eisen'
  | 'eisenwerkzeug';

export interface Recipe {
  id: RecipeId;
  name: string;
  desc: string;
  minChapter: number;
  requiresBuilding?: BuildingId;
  cost: Partial<Record<ItemId, number>>;
}

export const RECIPES: Recipe[] = [
  { id: 'fire', name: 'Lagerfeuer', desc: 'Wärme, Licht und Schutz', minChapter: 1, cost: { stock: 3, stein: 2 } },
  { id: 'trap', name: 'Falle', desc: 'Fängt nach kurzer Zeit ein Tier', minChapter: 1, cost: { stock: 3 } },
  { id: 'faustkeil', name: 'Faustkeil', desc: 'Universalwerkzeug aus Stein', minChapter: 1, cost: { stein: 2 } },
  { id: 'hacke', name: 'Steinhacke', desc: 'Gräbt Ackerboden um', minChapter: 2, cost: { stock: 2, stein: 2 } },
  { id: 'tontopf', name: 'Tontopf', desc: 'Schöpft Wasser am See & speichert Vorräte', minChapter: 2, cost: { lehm: 2 } },
  { id: 'sichel', name: 'Erntesichel', desc: 'Schneidet reifes Getreide', minChapter: 2, cost: { stock: 2, stein: 2 } },
  { id: 'brot', name: 'Fladenbrot backen', desc: 'Macht lange satt (+50 Essen)', minChapter: 3, cost: { getreide: 2 } },
  {
    id: 'stoff',
    name: 'Stoff weben',
    desc: 'Warme Kleidung & begehrte Handelsware (Webstuhl)',
    minChapter: 4,
    requiresBuilding: 'webstuhl',
    cost: { wolle: 2 },
  },
  { id: 'spitzhacke', name: 'Spitzhacke', desc: 'Baut Erzadern im Nord-Stollen ab', minChapter: 5, cost: { stock: 2, stein: 3 } },
  {
    id: 'kupfer',
    name: 'Kupfer schmelzen',
    desc: 'Verhüttet Kupfererz im Schmelzofen',
    minChapter: 5,
    requiresBuilding: 'schmelzofen',
    cost: { kupfererz: 2, stock: 1 },
  },
  {
    id: 'kupferbeil',
    name: 'Kupferbeil gießen',
    desc: 'Wie das berühmte Beil von Ötzi!',
    minChapter: 5,
    requiresBuilding: 'schmelzofen',
    cost: { kupfer: 1, stock: 1 },
  },
  {
    id: 'bronze',
    name: 'Bronze legieren',
    desc: 'Kupfer + Zinn = viel härtere Bronze!',
    minChapter: 6,
    requiresBuilding: 'schmelzofen',
    cost: { kupfer: 1, zinn: 1 },
  },
  {
    id: 'bronzeschwert',
    name: 'Bronzeschwert gießen',
    desc: 'Edle Waffe der Bronzezeit (+Schutz)',
    minChapter: 6,
    requiresBuilding: 'schmelzofen',
    cost: { bronze: 1, stock: 1 },
  },
  {
    id: 'eisen',
    name: 'Eisen verhütten',
    desc: 'Schmilzt Eisenerz bei über 1.500 °C in der Schmiede',
    minChapter: 6,
    requiresBuilding: 'schmiede',
    cost: { eisenerz: 2, stock: 2 },
  },
  {
    id: 'eisenwerkzeug',
    name: 'Eisenwerkzeug schmieden',
    desc: 'Krönung der Metallzeit an Amboss & Esse!',
    minChapter: 6,
    requiresBuilding: 'schmiede',
    cost: { eisen: 1, stock: 1 },
  },
];

export type BuildingId = 'toepferofen' | 'speicher' | 'gehege' | 'langhaus' | 'webstuhl' | 'schmelzofen' | 'schmiede';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  desc: string;
  helperName: string;
  helperRole: string;
  helperSprite?: string;
  minChapter: number;
  x: number;
  y: number;
  cost: Partial<Record<ItemId, number>>;
}

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'toepferofen',
    name: 'Töpferofen',
    desc: 'Brennt feste Keramik aus Lehm',
    helperName: 'Mila (Töpferin)',
    helperRole: 'Schenkt dir bei Bedarf frische Tontöpfe.',
    helperSprite: 'npc_mila',
    minChapter: 3,
    x: 330,
    y: 250,
    cost: { lehm: 3, stein: 3 },
  },
  {
    id: 'gehege',
    name: 'Tiergehege',
    desc: 'Holzzaun für gezähmte Ziegen',
    helperName: 'Tarek (Hirte)',
    helperRole: 'Hütet die Ziegen im Gehege.',
    helperSprite: 'npc_tarek',
    minChapter: 3,
    x: 530,
    y: 350,
    cost: { stock: 5, stein: 2 },
  },
  {
    id: 'speicher',
    name: 'Vorratsspeicher',
    desc: 'Schützt Ernte vor Nässe und Mäusen',
    helperName: 'Kora (Müllerin)',
    helperRole: 'Mahlt Korn auf dem Mahlstein zu Fladenbrot.',
    helperSprite: 'npc_kora',
    minChapter: 3,
    x: 330,
    y: 340,
    cost: { stock: 4, lehm: 3 },
  },
  {
    id: 'langhaus',
    name: 'Jungsteinzeit-Langhaus',
    desc: 'Festes Haus aus Holzpfosten und Lehmwänden',
    helperName: 'Sippe',
    helperRole: 'Dauerhaftes Zuhause (+Schutz).',
    minChapter: 3,
    x: 410,
    y: 225,
    cost: { stock: 6, lehm: 4, stein: 3 },
  },
  {
    id: 'webstuhl',
    name: 'Webstuhl',
    desc: 'Webt Wolle zu warmen Stoffen (Kap. 4+)',
    helperName: 'Jana (Weberin)',
    helperRole: 'Webt aus Ziegenwolle feine Stoffe für Kleidung und Tauschhandel.',
    helperSprite: 'npc_jana',
    minChapter: 4,
    x: 260,
    y: 295,
    cost: { stock: 4, stein: 2 },
  },
  {
    id: 'schmelzofen',
    name: 'Schmelzofen',
    desc: 'Schmilzt Kupfer und Bronze mit Blasebalg (Kap. 5+)',
    helperName: 'Barak (Schmelzer)',
    helperRole: 'Hält die Glut mit Blasebälgen über 1.000 °C heiß für Kupfer & Bronze.',
    helperSprite: 'npc_barak',
    minChapter: 5,
    x: 260,
    y: 215,
    cost: { lehm: 4, stein: 4 },
  },
  {
    id: 'schmiede',
    name: 'Eisenschmiede & Amboss',
    desc: 'Rennofen und Amboss für die Eisenzeit (Kap. 6)',
    helperName: 'Torin (Schmied)',
    helperRole: 'Schmiedet glühendes Eisen mit dem Hammer zu Werkzeugen.',
    helperSprite: 'npc_barak',
    minChapter: 6,
    x: 335,
    y: 175,
    cost: { stein: 5, lehm: 4, bronze: 1 },
  },
];

export interface TradeOffer {
  id: string;
  name: string;
  desc: string;
  minChapter: number;
  give: Partial<Record<ItemId, number>>;
  receive: { item: ItemId; count: number };
}

/** Tauschhandels-Angebote bei Fernhändler Enki (Ware gegen Ware, ohne Münzen!). */
export const TRADES: TradeOffer[] = [
  {
    id: 'trade_salz',
    name: 'Salz ertauschen',
    desc: 'Macht Vorräte lange haltbar („Weißes Gold“)',
    minChapter: 4,
    give: { getreide: 2 },
    receive: { item: 'salz', count: 1 },
  },
  {
    id: 'trade_bernstein',
    name: 'Ostsee-Bernstein ertauschen',
    desc: 'Wertvoller Schmuckstein von fernen Küsten',
    minChapter: 4,
    give: { stoff: 1 },
    receive: { item: 'bernstein', count: 1 },
  },
  {
    id: 'trade_wolle_getreide',
    name: 'Wolle gegen Samen & Lehm',
    desc: 'Hilft beim Ausbau der Siedlung',
    minChapter: 4,
    give: { beere: 3 },
    receive: { item: 'wolle', count: 2 },
  },
  {
    id: 'trade_zinn_stoff',
    name: 'Seltenes Zinnerz (gegen Stoff)',
    desc: 'Unverzichtbar für Bronze (Kupfer + Zinn)!',
    minChapter: 6,
    give: { stoff: 1 },
    receive: { item: 'zinn', count: 2 },
  },
  {
    id: 'trade_zinn_brot',
    name: 'Seltenes Zinnerz (gegen 2× Getreide)',
    desc: 'Tausche Ernteüberschuss gegen Zinnerz aus der Ferne',
    minChapter: 6,
    give: { getreide: 2 },
    receive: { item: 'zinn', count: 1 },
  },
];
