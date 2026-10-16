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

export interface ItemDef {
  id: ItemId;
  name: string;
  tint?: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  beere: { id: 'beere', name: 'Beeren' },
  stock: { id: 'stock', name: 'Stöcke' },
  stein: { id: 'stein', name: 'Steine' },
  fleisch: { id: 'fleisch', name: 'Rohes Fleisch' },
  gebraten: { id: 'gebraten', name: 'Gebratenes Fleisch', tint: 0xd9a066 },
  fell: { id: 'fell', name: 'Fell' },
  faustkeil: { id: 'faustkeil', name: 'Faustkeil' },
  samen: { id: 'samen', name: 'Wildkorn-Samen' },
  getreide: { id: 'getreide', name: 'Getreide (Emmer)' },
  hacke: { id: 'hacke', name: 'Steinhacke' },
  sichel: { id: 'sichel', name: 'Erntesichel' },
  lehm: { id: 'lehm', name: 'Lehm' },
  tontopf: { id: 'tontopf', name: 'Tontopf (leer)' },
  wasser: { id: 'wasser', name: 'Wasser im Topf', tint: 0x6ec6ff },
  wolle: { id: 'wolle', name: 'Wolle' },
  milch: { id: 'milch', name: 'Ziegenmilch' },
  brot: { id: 'brot', name: 'Fladenbrot', tint: 0xe6b873 },
  stoff: { id: 'stoff', name: 'Gewebter Stoff' },
  salz: { id: 'salz', name: 'Salz' },
  bernstein: { id: 'bernstein', name: 'Bernstein' },
  spitzhacke: { id: 'spitzhacke', name: 'Spitzhacke' },
  kupfererz: { id: 'kupfererz', name: 'Kupfererz', tint: 0xe07a45 },
  kupfer: { id: 'kupfer', name: 'Kupferbarren' },
  kupferbeil: { id: 'kupferbeil', name: 'Kupferbeil (Ötzi)', tint: 0xe08955 },
  zinn: { id: 'zinn', name: 'Zinnerz' },
  bronze: { id: 'bronze', name: 'Bronzebarren' },
  bronzeschwert: { id: 'bronzeschwert', name: 'Bronzeschwert' },
  eisenerz: { id: 'eisenerz', name: 'Eisenerz', tint: 0x9aa5b8 },
  eisen: { id: 'eisen', name: 'Eisenbarren' },
  eisenwerkzeug: { id: 'eisenwerkzeug', name: 'Eisenschmiedewerkzeug' },
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
