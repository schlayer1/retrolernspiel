import { ItemId } from './items';

export interface LexiconEntry {
  title: string;
  era: string;
  icon: ItemId | 'trap';
  unlockHint: string;
  milestone?: boolean;
  text: string;
}

/** Fachbegriffe, die in Texten für Schüler der 5./6. Klasse farbig hervorgehoben werden. */
export const HIGHLIGHT_TERMS: string[] = [
  'Altsteinzeit',
  'Jungsteinzeit',
  'Kupferzeit',
  'Bronzezeit',
  'Eisenzeit',
  'Metallzeit',
  'Sippe',
  'Nomaden',
  'Sesshaftwerdung',
  'sesshaft',
  'Neolithische Revolution',
  'Faustkeil',
  'Feuerstein',
  'Domestizierung',
  'Ackerbau',
  'Viehzucht',
  'Einkorn',
  'Emmer',
  'Keramik',
  'Langhaus',
  'Arbeitsteilung',
  'Vorratshaltung',
  'Überschuss',
  'Tauschhandel',
  'Weißes Gold',
  'Bernstein',
  'Kupfererz',
  'Kupferbeil',
  'Ötzi',
  'Legierung',
  'Bronze',
  'Zinn',
  'Zinnerz',
  'Eisenerz',
  'Rennofen',
];

/** „Hast du gewusst?“ – Alle 27 illustrierten Facheinträge für Kapitel 1 bis 6 (Klasse 5/6). */
export const LEXICON: Record<string, LexiconEntry> = {
  sippe: {
    title: 'Die Sippe',
    era: 'Altsteinzeit',
    icon: 'beere',
    unlockHint: 'Sprich zu Beginn von Kapitel 1 mit der Ältesten Ota (E).',
    text: 'Jäger und Sammler lebten in kleinen Familiengruppen von etwa 20 bis 40 Menschen. Man nennt so eine Gruppe Sippe. Alle halfen zusammen und teilten die Beute gerecht.',
  },
  nomaden: {
    title: 'Nomaden',
    era: 'Altsteinzeit',
    icon: 'fell',
    unlockHint: 'Sprich zu Beginn von Kapitel 1 mit der Ältesten Ota (E).',
    milestone: true,
    text: 'Menschen, die keinen festen Wohnort haben, heißen Nomaden. In der Altsteinzeit zogen die Sippen den Tierherden hinterher und wohnten in tragbaren Zelten aus Holzstangen und Tierfellen.',
  },
  sammeln: {
    title: 'Sammeln von Pflanzen',
    era: 'Altsteinzeit',
    icon: 'beere',
    unlockHint: 'Pflücke Beeren an einem roten Beerenstrauch (E).',
    text: 'Beeren, Wurzeln, Nüsse, Pilze und Wildkräuter sicherten das tägliche Überleben. Die Kinder lernten schon früh, welche Pflanzen essbar, heilend oder giftig waren.',
  },
  feuer: {
    title: 'Zähmung des Feuers',
    era: 'Altsteinzeit',
    icon: 'stock',
    unlockHint: 'Baue im Handwerksmenü (C) ein Lagerfeuer aus 3 Stöcken und 2 Steinen.',
    milestone: true,
    text: 'Das Feuer spendete Wärme in der Eiszeit, Licht in der Dunkelheit und hielt Raubtiere wie Wölfe und Höhlenbären fern. Mit Feuerstein und Funken lernten die Menschen, selbst Feuer zu entfachen.',
  },
  falle: {
    title: 'Jagd & Fallenbau',
    era: 'Altsteinzeit',
    icon: 'trap',
    unlockHint: 'Stelle eine Falle auf (C) und leere sie, sobald sie ausgelöst hat (E).',
    text: 'Die Jagd lieferte nicht nur energiereiches Fleisch: Aus den Fellen nähten die Menschen warme Kleidung, aus Sehnen drehten sie Schnüre und aus Knochen schnitzten sie Nadeln und Speerspitzen.',
  },
  braten: {
    title: 'Nahrung garen',
    era: 'Altsteinzeit',
    icon: 'gebraten',
    unlockHint: 'Brate rohes Fleisch an einem brennenden Lagerfeuer (E).',
    text: 'Gebratenes Fleisch ist viel leichter verdaulich als rohes Fleisch, enthält keine gefährlichen Keime mehr und gibt dem Körper mehr Energie.',
  },
  faustkeil: {
    title: 'Der Faustkeil',
    era: 'Altsteinzeit',
    icon: 'faustkeil',
    unlockHint: 'Stelle im Handwerksmenü (C) einen Faustkeil aus 2 Steinen her.',
    milestone: true,
    text: 'Der Faustkeil war das „Taschenmesser der Altsteinzeit“. Durch Abschlagen von hartem Feuerstein entstand eine scharfe Kante zum Schneiden, Schaben, Hacken und Graben.',
  },
  nacht: {
    title: 'Gefahren der Nacht',
    era: 'Altsteinzeit',
    icon: 'fell',
    unlockHint: 'Bleibe nachts zum Schutz am wärmenden Lagerfeuer.',
    text: 'Ohne feste Hauswände war die Nacht kalt und gefährlich. Die Sippe versammelte sich eng ums Lagerfeuer, erzählte Geschichten und hielt abwechselnd Wache.',
  },
  klimawandel: {
    title: 'Ende der Eiszeit',
    era: 'Übergang (ca. 10.000 v. Chr.)',
    icon: 'samen',
    unlockHint: 'Sprich zu Beginn von Kapitel 2 mit Ältester Ota (E).',
    milestone: true,
    text: 'Vor rund 12.000 Jahren erwärmte sich das Klima der Erde deutlich. Die riesigen Gletscher schmolzen, dichte Wälder und wilde Getreidegräser breiteten sich aus – der Startschuss für eine neue Lebensweise!',
  },
  wolf: {
    title: 'Vom Wolf zum Hund',
    era: 'Übergang zur Jungsteinzeit',
    icon: 'fleisch',
    unlockHint: 'Füttere den scheuen Wolf im Westen mit 1× Fleisch (E).',
    milestone: true,
    text: 'Der Wolf war das allererste Haustier des Menschen! Weniger scheue Wölfe näherten sich den Lagerfeuern. Die Menschen zogen Wolfswelpen auf – so entstand der Hund als treuer Wächter und Jagdhelfer.',
  },
  wildkorn: {
    title: 'Urgetreide: Einkorn & Emmer',
    era: 'Jungsteinzeit',
    icon: 'samen',
    unlockHint: 'Sammle gelbe Wildkorn-Ähren südlich vom See (E).',
    text: 'Im „Fruchtbaren Halbmond“ wuchsen wilde Getreidearten wie Einkorn und Emmer. Die Menschen erkannten: Wenn man die größten Körner in den Boden steckt und gießt, wächst im nächsten Jahr ein ganzes Feld!',
  },
  keramik: {
    title: 'Tontöpfe & Keramik',
    era: 'Jungsteinzeit',
    icon: 'tontopf',
    unlockHint: 'Forme im Handwerksmenü (C) einen Tontopf aus 2× Lehm.',
    milestone: true,
    text: 'Für Nomaden waren schwere Tontöpfe unpraktisch. Doch sesshafte Bauern brannten feuchten Lehm im Töpferofen zu wasserfester Keramik, um Wasser zu tragen, Brei zu kochen und Korn vor Mäusen zu schützen.',
  },
  ackerbau: {
    title: 'Ackerbau & Erntesichel',
    era: 'Jungsteinzeit',
    icon: 'hacke',
    unlockHint: 'Baue eine Steinhacke oder Erntesichel (C) und bestelle das Ackerfeld.',
    milestone: true,
    text: 'In der Jungsteinzeit wurden Steine nicht mehr nur grob behauen, sondern glatt geschliffen und durchbohrt! Mit der Steinhacke lockerte man den Boden, mit der Feuerstein-Sichel erntete man das Korn.',
  },
  domestizierung: {
    title: 'Viehzucht (Domestizierung)',
    era: 'Jungsteinzeit',
    icon: 'milch',
    unlockHint: 'Locke in Kapitel 3 eine Wildziege mit 1× Getreide ins Gehege (E).',
    milestone: true,
    text: 'Die Zähmung und Haltung von Wildtieren nennt man Domestizierung. Ziegen, Schafe, Rinder und Schweine lieferten im Gehege jederzeit frische Milch, Wolle und Fleisch.',
  },
  langhaus: {
    title: 'Sesshaftwerdung & Langhaus',
    era: 'Jungsteinzeit',
    icon: 'brot',
    unlockHint: 'Errichte das große Langhaus am Bauplatz im Norden des Dorfes (E).',
    milestone: true,
    text: 'Wer Felder sät, muss bis zur Ernte bleiben: Die Menschen wurden sesshaft (Neolithische Revolution)! Sie bauten bis zu 30 Meter lange Häuser aus Eichenpfosten, Weidengeflecht und Lehm, in denen Mensch und Vieh unter einem Dach lebten.',
  },
  arbeitsteilung: {
    title: 'Arbeitsteilung & Vorräte',
    era: 'Jungsteinzeit',
    icon: 'tontopf',
    unlockHint: 'Baue eine Werkstatt (Töpferofen, Gehege oder Speicher) im Dorf (E).',
    milestone: true,
    text: 'Durch Ackerbau und Vorratshaltung gab es Nahrungs-Überschüsse. Deshalb konnten sich Dorfbewohner auf Berufe spezialisieren: Töpferin, Hirte, Müllerin, Weberin oder Schmied. Das nennt man Arbeitsteilung!',
  },
  weben: {
    title: 'Gewichtswebstuhl & Kleidung',
    era: 'Späte Jungsteinzeit',
    icon: 'stoff',
    unlockHint: 'Baue den Webstuhl (Kap. 4) oder webe Stoff aus 2× Wolle (C).',
    milestone: true,
    text: 'Am senkrechten Gewichtswebstuhl hielten gebrannte Tongewichte die Längsfäden straff. Aus Schaf- und Ziegenwolle oder Flachs webten die Menschen leichte, warme Stoffe statt schwerer Tierfelle.',
  },
  tauschhandel: {
    title: 'Tauschhandel ohne Geld',
    era: 'Späte Jungsteinzeit',
    icon: 'salz',
    unlockHint: 'Sprich ab Kapitel 4 mit Fernhändler Enki am Marktstand im Süden (E oder H).',
    milestone: true,
    text: 'Münzgeld wurde erst Jahrtausende später erfunden! In der Stein- und Bronzezeit galt der Tauschhandel (Ware gegen Ware): Eigene Überschüsse wie Getreide und Stoff wurden gegen seltene Güter aus der Ferne getauscht.',
  },
  salz: {
    title: 'Salz – Das „Weiße Gold“',
    era: 'Späte Jungsteinzeit',
    icon: 'salz',
    unlockHint: 'Tausche bei Fernhändler Enki (H) 1× Salz gegen 2× Getreide ein.',
    text: 'Salz war lebenswichtig für Mensch und Tier. Vor allem aber konnte man Fleisch und Fisch mit Salz einreiben (pökeln) und so über viele Monate für den langen Winter haltbar machen!',
  },
  bernstein: {
    title: 'Ostsee-Bernstein & Besitz',
    era: 'Späte Jungsteinzeit',
    icon: 'bernstein',
    unlockHint: 'Tausche bei Fernhändler Enki (H) 1× Bernstein gegen 1× Stoff ein.',
    milestone: true,
    text: 'Bernstein ist versteinertes Baumharz von der Küste, das über Hunderte Kilometer weit gehandelt wurde. Mit solchem Schmuck und vollen Speichern entstanden Reichtum, persönlicher Besitz und erste Rangunterschiede.',
  },
  bergbau: {
    title: 'Bergbau & Stollen',
    era: 'Kupferzeit',
    icon: 'spitzhacke',
    unlockHint: 'Stelle eine Spitzhacke (C) her oder untersuche den Stollen im Norden (E).',
    text: 'Mit Geweihhacken, Steinschlägeln und Feuersetzen gruben Bergleute tiefe Stollen in das Gestein – zuerst für besten Feuerstein und Salz, später für grünlich schimmerndes Kupfererz und Eisenerz.',
  },
  kupfer: {
    title: 'Kupfer schmelzen',
    era: 'Kupferzeit (ab 4.000 v. Chr.)',
    icon: 'kupfer',
    unlockHint: 'Baue Kupfererz ab und schmelze im Menü (C) einen Kupferbarren.',
    text: 'Kupfer war das erste Metall, das Menschen verarbeiteten! Mit Blasebälgen fachten sie das Feuer im Schmelzofen auf über 1.080 °C an, bis flüssiges, rot glänzendes Kupfer aus dem Erzgestein floss.',
  },
  oetzi: {
    title: 'Ötzi & das Kupferbeil',
    era: 'Kupferzeit (ca. 3.300 v. Chr.)',
    icon: 'kupferbeil',
    unlockHint: 'Gieße im Handwerksmenü (C) ein Kupferbeil.',
    milestone: true,
    text: '1991 fanden Wanderer in den Ötztaler Alpen die 5.300 Jahre alte Gletschermumie „Ötzi“. Sein wertvollster Besitz war ein Beil mit einer gegossenen Klinge aus fast reinem Kupfer! Bricht Metall, kann man es einfach neu einschmelzen.',
  },
  zinn: {
    title: 'Zinnerz & Fernhandelswege',
    era: 'Bronzezeit',
    icon: 'zinn',
    unlockHint: 'Tausche in Kapitel 6 seltenes Zinnerz bei Fernhändler Enki (H) ein.',
    text: 'Um aus weichem Kupfer harte Bronze zu machen, brauchte man Zinnerz. Weil Zinn in Europa nur an wenigen Orten (z. B. in England oder im Erzgebirge) vorkam, umspannte ein riesiges Handelsnetz den ganzen Kontinent!',
  },
  bronze: {
    title: 'Die Legierung Bronze',
    era: 'Bronzezeit (ab 2.200 v. Chr.)',
    icon: 'bronze',
    unlockHint: 'Legiere im Menü (C) 1× Bronze aus 1× Kupfer und 1× Zinn.',
    milestone: true,
    text: 'Schmilzt man 9 Teile Kupfer und 1 Teil Zinn zusammen, entsteht eine Metallmischung (Legierung): goldglänzende Bronze! Sie ist viel härter als reines Kupfer und gab einer ganzen Epoche ihren Namen: der Bronzezeit.',
  },
  schwert: {
    title: 'Bronzeschwert & Anführer',
    era: 'Bronzezeit',
    icon: 'bronzeschwert',
    unlockHint: 'Gieße im Menü (C) ein Bronzeschwert.',
    text: 'Erstmals konnten lange, scharfe Schwerter, Schilde und Schmuckscheiben in Stein- oder Tonformen gegossen werden. Wer Bronze besaß, hatte große Macht – Dörfer schützten sich nun mit Wällen und Palisaden.',
  },
  eisen: {
    title: 'Eisenzeit & Schmiedekunst',
    era: 'Eisenzeit (ab 800 v. Chr.)',
    icon: 'eisenwerkzeug',
    unlockHint: 'Baue die Eisenschmiede, verhütte Eisenerz und schmiede Eisenwerkzeug (C).',
    milestone: true,
    text: 'Eisenerz gab es fast überall in heimischen Böden, aber es schmilzt erst bei über 1.500 °C! Im Rennofen gewannen Schmiede glühendes Eisen und hämmerten es auf dem Amboss zu extrem harten Pflugscharen, Äxten und Werkzeugen.',
  },
};

export interface EpochComparisonRow {
  era: string;
  chapter: number;
  time: string;
  housing: string;
  food: string;
  tools: string;
  society: string;
}

/** Übersichtstabelle für das Vergleichs-Fenster (Z) – „Vom Jäger zum Schmied auf einen Blick“. */
export const EPOCH_COMPARISON: EpochComparisonRow[] = [
  {
    era: 'Altsteinzeit',
    chapter: 1,
    time: 'ca. 2,5 Mio. – 10.000 v. Chr.',
    housing: 'Nomaden (ziehen umher), Zelte aus Fellen & Ästen, Höhlen',
    food: 'Jagen (Wild, Fallen) & Sammeln (Beeren, Nüsse, Wurzeln)',
    tools: 'Grob geschlagene Steine (Faustkeil aus Feuerstein), Speere, Feuer',
    society: 'Kleine Sippe (20–40 Personen), alle teilen alles, kaum Besitz',
  },
  {
    era: 'Übergang / Klimawandel',
    chapter: 2,
    time: 'ca. 10.000 – 5.500 v. Chr.',
    housing: 'Längere Rastplätze an Flüssen und Seen nach Ende der Eiszeit',
    food: 'Erste Aussaat von Wildgetreide (Einkorn/Emmer), Jagd & Fischfang',
    tools: 'Geschliffene Steinhacke, Erntesichel mit Feuersteinklingen, erste Tontöpfe',
    society: 'Wolf wird als erstes Tier zum Hund gezähmt (Domestizierung)',
  },
  {
    era: 'Jungsteinzeit',
    chapter: 3,
    time: 'ca. 5.500 – 2.200 v. Chr.',
    housing: 'Sesshaftwerdung: Feste Dörfer mit großen Langhäusern (Holz & Lehm)',
    food: 'Planmäßiger Ackerbau (Getreide, Brot) & Viehzucht im Gehege (Ziege, Schaf, Rind)',
    tools: 'Gebrannte Keramik im Töpferofen, Mahlstein, Vorratsspeicher, Webstuhl',
    society: 'Arbeitsteilung im Dorf (Töpfer, Hirten, Weber) & Tauschhandel ohne Geld',
  },
  {
    era: 'Kupferzeit (Ötzi)',
    chapter: 5,
    time: 'ca. 4.000 – 2.200 v. Chr.',
    housing: 'Dörfer mit spezialisierten Werkstätten und Bergbau-Stollen',
    food: 'Ackerbau, Viehzucht & mit Salz („Weißes Gold“) haltbar gemachte Vorräte',
    tools: 'Spitzhacke für Erzbergbau, Schmelzofen (>1.000 °C), gegossenes Kupferbeil',
    society: 'Fernhandel (Salz, Bernstein), Spezialisten (Bergleute, Gießer), erster Reichtum',
  },
  {
    era: 'Bronze- & Eisenzeit',
    chapter: 6,
    time: 'ab 2.200 v. Chr. / ab 800 v. Chr.',
    housing: 'Befestigte Siedlungen mit Schutzwall, Schmieden und Handelsplätzen',
    food: 'Ertragreicher Ackerbau durch eiserne Pflugscharen und Sicheln',
    tools: 'Bronze (Legierung: 90% Kupfer + 10% Zinn) & im Rennofen geschmiedetes Eisen',
    society: 'Europaweiter Zinn-Fernhandel, mächtige Anführer/Häuptlinge, Berufsschmiede',
  },
];

export interface ChapterMeta {
  id: number;
  title: string;
  subtitle: string;
  era: string;
  merksatz: string;
  quests: string[];
  intro: DialogNode[];
  hints: Record<number, string>;
  quiz: DialogNode[];
}

export type DialogNode =
  | { text: string }
  | { question: string; options: string[]; correct: number; explain: string };

export const CHAPTERS: Record<number, ChapterMeta> = {
  1: {
    id: 1,
    title: 'Kapitel 1: Jäger und Sammler',
    subtitle: 'Überleben als Nomaden in der Altsteinzeit',
    era: 'Altsteinzeit (ca. 40.000 v. Chr.)',
    merksatz:
      'In der Altsteinzeit lebten die Menschen als Jäger und Sammler in kleinen Gruppen (Sippen). Weil die Nahrung an einem Ort schnell aufgebraucht war, zogen sie als Nomaden den Tierherden hinterher und wohnten in Zelten. Ihre wichtigsten Hilfsmittel waren das Feuer und Werkzeuge aus geschlagenem Stein wie der Faustkeil.',
    quests: [
      'Sprich mit der Ältesten Ota (E).',
      'Sammle 5 Beeren an den Sträuchern.',
      'Baue ein Lagerfeuer (C): 3 Stöcke, 2 Steine.',
      'Stelle eine Falle auf (C): 3 Stöcke.',
      'Warte kurz und hole das Fleisch aus der Falle.',
      'Brate das Fleisch am Lagerfeuer (E).',
      'Stelle einen Faustkeil her (C): 2 Steine.',
      'Geh zurück zu Ota.',
      'Kapitel 1 geschafft! Sprich mit Ota für Kapitel 2.',
    ],
    intro: [
      { text: 'Willkommen in unserer Sippe! Ich bin Ota, die Älteste.' },
      {
        text: 'Wir sind Jäger und Sammler. Wir bleiben nie lange an einem Ort. Wenn Beeren und Tiere knapp werden, ziehen wir weiter. Wir sind Nomaden.',
      },
      {
        text: 'Heute lernst du das Überleben: Sammle Beeren, baue ein Feuer und fang Wild. Mit C baust du, mit L liest du im Lexikon, mit F isst du.',
      },
      { text: 'Pass auf deine Werte oben rechts auf: Essen, Schutz und Wissen. Viel Erfolg!' },
    ],
    hints: {
      1: 'Die roten Beerensträucher findest du überall auf der Wiese. Geh nah heran und drück E.',
      2: 'Sammle Stöcke an den Baumstümpfen und Steine an den Felsen. Dann drück C und wähle Lagerfeuer.',
      3: 'Eine Falle braucht 3 Stöcke. Stell sie ab, dann musst du ein wenig warten.',
      4: 'Die Falle zeigt ein Ausrufezeichen, wenn sie etwas gefangen hat. Geh hin und drück E.',
      5: 'Rohes Fleisch brät man am Feuer. Stell dich ans Lagerfeuer und drück E.',
      6: 'Für einen Faustkeil brauchst du 2 Steine. Drück C.',
    },
    quiz: [
      { text: 'Das hast du gut gemacht! Jetzt noch drei Fragen, ob du gut aufgepasst hast.' },
      {
        question: 'Warum zogen Jäger und Sammler immer weiter?',
        options: ['Weil ihnen langweilig war', 'Weil an einem Ort die Nahrung knapp wurde', 'Weil sie Häuser bauen wollten'],
        correct: 1,
        explain: 'Wenn Tiere und Pflanzen aufgebraucht waren, mussten sie sich neue Nahrung suchen.',
      },
      {
        question: 'Wozu nutzten die Menschen das Feuer?',
        options: ['Für Wärme, Licht, Schutz und zum Braten', 'Nur zum Spielen', 'Um Häuser aus Stein zu bauen'],
        correct: 0,
        explain: 'Das Feuer war überlebenswichtig, besonders in der Nacht.',
      },
      {
        question: 'Woraus bestanden Faustkeile meistens?',
        options: ['Aus Eisen', 'Aus Holz', 'Aus Stein, meist Feuerstein'],
        correct: 2,
        explain: 'Metall kannten die Menschen damals noch nicht. Das kommt erst viel später!',
      },
      {
        text: 'Sehr gut! Du bist bereit für das nächste Zeitalter: Das Eis schmilzt und die Welt verändert sich!',
      },
    ],
  },
  2: {
    id: 2,
    title: 'Kapitel 2: Der Wendepunkt',
    subtitle: 'Wolf zähmen & die erste Aussaat am See',
    era: 'Übergang zur Jungsteinzeit (ca. 9.000 v. Chr.)',
    merksatz:
      'Nach dem Ende der Eiszeit vor rund 12.000 Jahren wurde das Klima wärmer. Als erstes Tier zähmte der Mensch den Wolf zum Hund (Domestizierung). An Flüssen und Seen begannen die Menschen, Wildgetreide wie Einkorn und Emmer gezielt auszusäen (Ackerbau) und Tontöpfe (Keramik) aus Lehm zu brennen.',
    quests: [
      'Sprich mit Ota über das wärmere Klima (E).',
      'Zähme den scheuen Wolf im Westen mit 1× Fleisch (E).',
      'Sammle 3× Wildkorn-Samen an den gelben Ähren.',
      'Stelle eine Steinhacke her (C): 2 Stöcke, 2 Steine.',
      'Sammle 2× Lehm am Seeufer und forme 1× Tontopf (C).',
      'Grabe ein Ackerfeld um, säe Samen und gieße es mit Wasser aus dem See!',
      'Stelle eine Erntesichel her (C) und ernte das reife Getreide.',
      'Sprich mit Ota über eure erste eigene Ernte!',
      'Kapitel 2 geschafft! Sprich mit Ota für Kapitel 3.',
    ],
    intro: [
      { text: 'Viele Generationen sind vergangen. Spürst du es? Die große Eiszeit ist vorbei, das Klima ist viel wärmer geworden!' },
      { text: 'Am See wachsen jetzt wilde Getreidegräser voller Körner. Und gestern Abend schlich ein neugieriger Wolf um unser Feuer.' },
      { text: 'Vielleicht müssen wir gar nicht mehr ständig weiterziehen, wenn wir lernen, Tiere zu zähmen und Pflanzen selbst anzubauen!' },
      { text: 'Schau zuerst nach dem Wolf westlich vom Lager. Wenn du ihm ein Stück Fleisch gibst, fasst er bestimmt Vertrauen.' },
    ],
    hints: {
      1: 'Der graue Wolf wartet links vom Lager. Wenn du noch kein Fleisch hast, stelle eine Falle auf (C). Geh dann mit Fleisch zum Wolf und drücke E.',
      2: 'Gelbe Wildkorn-Ähren wachsen südlich vom See. Pflücke dort 3× Wildkorn-Samen mit E.',
      3: 'Öffne mit C das Baumenü und stelle eine Steinhacke aus 2 Stöcken und 2 Steinen her.',
      4: 'Am südlichen Rand des Sees findest du braune Lehmhaufen (E). Aus 2× Lehm formst du im Baumenü (C) einen Tontopf.',
      5: 'Geh zu den braunen Acker-Markierungen südlich vom See: 1. Mit E umgraben, 2. Mit E Samen säen, 3. Am See Wasser schöpfen (E) und das Feld gießen (E)!',
      6: 'Baue eine Erntesichel (C: 2 Stöcke, 2 Steine). Sobald das gegossene Getreide goldgelb gereift ist (nach kurzer Zeit oder 1× Schlafen am Feuer), ernte es mit E!',
    },
    quiz: [
      { text: 'Unglaublich! Wir haben eigenes Getreide geerntet und einen treuen Hund an unserer Seite!' },
      {
        question: 'Welches Tier wurde als erstes vom Menschen gezähmt?',
        options: ['Das Huhn', 'Der Wolf (wurde zum Hund)', 'Das Pferd'],
        correct: 1,
        explain: 'Wölfe kamen an die Lagerfeuer der Jäger und wurden vor über 15.000 Jahren zu Wach- und Jagdhunden.',
      },
      {
        question: 'Warum bauten die ersten Bauern ihre Felder am liebsten an Flüssen und Seen an?',
        options: ['Weil sie gerne schwimmen gingen', 'Für fruchtbaren Boden, Lehm und Wasser zum Gießen', 'Weil es dort keine Steine gab'],
        correct: 1,
        explain: 'Ohne Wasser und fruchtbaren Schlamm/Lehm konnte kein Getreide wachsen.',
      },
      {
        question: 'Wozu brauchte man in der Jungsteinzeit gebrannte Tontöpfe?',
        options: ['Zum Wasserholen, Kochen und für Vorräte', 'Als Fußball', 'Zum Jagen von Mammuts'],
        correct: 0,
        explain: 'Keramik schützte Wasser und Getreidevorräte vor Nässe und Schädlingen.',
      },
      {
        text: 'Jetzt, wo wir Felder haben, können wir nicht mehr fortziehen. Lass uns hier am See ein festes Dorf gründen!',
      },
    ],
  },
  3: {
    id: 3,
    title: 'Kapitel 3: Die Jungsteinzeit-Siedlung',
    subtitle: 'Hausbau, Viehzucht & Arbeitsteilung im Dorf',
    era: 'Jungsteinzeit (ca. 6.000 v. Chr.)',
    merksatz:
      'In der Jungsteinzeit wurden aus umherziehenden Nomaden sesshafte Bauern (Sesshaftwerdung / Neolithische Revolution). Sie bauten feste Dörfer mit großen Langhäusern aus Holz und Lehm, hielten Haustiere wie Ziegen, Schafe und Rinder (Viehzucht) und entwickelten durch Vorratshaltung eine Arbeitsteilung mit spezialisierten Handwerkern.',
    quests: [
      'Sprich mit Ota über den Bau eures festen Dorfes (E).',
      'Errichte den Töpferofen am Bauplatz (E): 3 Lehm, 3 Steine.',
      'Errichte das Tiergehege am Bauplatz im Osten (E): 5 Stöcke, 2 Steine.',
      'Locke eine Wildziege mit 1× Getreide in das Gehege (E an der Ziege).',
      'Melke oder schere deine Ziege im Gehege (E).',
      'Errichte den Vorratsspeicher (E: 4 Stöcke, 3 Lehm) und backe Fladenbrot (C).',
      'Errichte das große Langhaus im Norden des Lagers (E): 6 Stöcke, 4 Lehm, 3 Steine.',
      'Sprich mit Ota zur Einweihung eures Jungsteinzeit-Dorfes!',
      'Kapitel 3 geschafft! Sprich mit Ota für Kapitel 4.',
    ],
    intro: [
      { text: 'Schau dir unsere Felder an! Wer sät und ernten will, muss bei seinen Äckern bleiben. Aus uns Nomaden werden jetzt sesshafte Bauern!' },
      { text: 'Rund um unser Lager habe ich vier Bauplätze abgesteckt: für einen Töpferofen, ein Tiergehege, einen Vorratsspeicher und ein festes Langhaus.' },
      { text: 'Sobald ein Gebäude steht, zieht dort jemand aus unserer Sippe ein und übernimmt feste Aufgaben. Das nennt man Arbeitsteilung!' },
      { text: 'Geh einfach zu einem Bauplatz-Schild und drücke E, wenn du das Baumaterial beisammen hast.' },
    ],
    hints: {
      1: 'Der Bauplatz für den Töpferofen liegt links oberhalb von mir. Sammle 3 Lehm am See und 3 Steine an den Felsen und drücke dort E.',
      2: 'Der Bauplatz für das Tiergehege ist rechts vom Acker. Du brauchst 5 Stöcke und 2 Steine.',
      3: 'Im Südosten grasen Wildziegen. Wenn du mindestens 1× geerntetes Getreide im Inventar hast, geh zur Ziege und drücke E!',
      4: 'Geh zu deiner zahmen Ziege im Gehege und drücke E, um Ziegenmilch und Wolle zu erhalten.',
      5: 'Baue den Vorratsspeicher links unten (4 Stöcke, 3 Lehm). Öffne danach mit C das Menü und backe aus 2× Getreide ein Fladenbrot!',
      6: 'Für unser großes Langhaus oben in der Dorfmitte brauchen wir 6 Stöcke, 4 Lehm und 3 Steine. Geh zum Bauschild und drücke E!',
    },
    quiz: [
      { text: 'Sieh dir unser Dorf an! Ein festes Langhaus, ein gefüllter Speicher, Töpferin Mila am Ofen und Ziegen im Gehege!' },
      {
        question: 'Was bedeutet „Sesshaftwerdung“ (Neolithische Revolution)?',
        options: [
          'Dass Menschen auf Sesseln sitzen',
          'Der Übergang vom umherziehenden Jäger zum sesshaften Bauern mit festen Häusern',
          'Dass alle Menschen in Höhlen ziehen',
        ],
        correct: 1,
        explain: 'Mit Ackerbau und Viehzucht blieben die Menschen dauerhaft an einem Ort und gründeten Dörfer.',
      },
      {
        question: 'Warum entstand in den Jungsteinzeit-Dörfern eine Arbeitsteilung?',
        options: [
          'Weil Ackerbau und Vorräte genug Nahrung lieferten, sodass sich einige auf Handwerk spezialisieren konnten',
          'Weil niemand mehr Lust hatte zu essen',
          'Weil es ein König so befohlen hat',
        ],
        correct: 0,
        explain: 'So wurden die Werkzeuge, Töpfe, Gewebe und Häuser immer besser.',
      },
      {
        question: 'Welche Vorteile hatten Haustiere wie Ziegen, Schafe und Rinder?',
        options: [
          'Sie lieferten verlässlich Milch, Wolle, Fleisch und Arbeitskraft',
          'Sie konnten sprechen',
          'Sie bauten die Häuser von allein',
        ],
        correct: 0,
        explain: 'Dadurch war die Sippe nicht mehr allein vom Jagdglück abhängig.',
      },
      {
        text: 'Jetzt produziert unser Dorf sogar mehr, als wir selbst verbrauchen. Das lockt Reisende aus fernen Dörfern an!',
      },
    ],
  },
  4: {
    id: 4,
    title: 'Kapitel 4: Handel und Dorf',
    subtitle: 'Webkunst, Überschuss & Tauschhandel ohne Geld',
    era: 'Späte Jungsteinzeit (ca. 4.500 v. Chr.)',
    merksatz:
      'Am Gewichtswebstuhl webten die Menschen Stoffe aus Wolle und Leinen. Weil die Dörfer mehr produzierten als sie selbst verbrauchten (Überschuss), entstand der Tauschhandel ohne Münzgeld (Ware gegen Ware): Getreide und Stoff wurden gegen Salz („Weißes Gold“ zur Haltbarmachung) und Schmuck wie Bernstein getauscht. So entstanden Besitz und Rangunterschiede.',
    quests: [
      'Sprich mit Ota über den angereisten Fernhändler Enki (E).',
      'Errichte den Webstuhl links im Dorf (E): 4 Stöcke, 2 Steine.',
      'Schere Wolle an deiner Ziege im Gehege (E).',
      'Webe im Handwerksmenü (C) 1× Gewebten Stoff aus 2× Wolle.',
      'Tausche bei Fernhändler Enki im Süden (E oder H) 1× Salz ein (gegen 2× Getreide).',
      'Tausche bei Fernhändler Enki 1× Ostsee-Bernstein ein (gegen 1× Gewebten Stoff).',
      'Sprich mit Ota über Besitz, Schmuck und den Tauschhandel!',
      'Beantworte Otas drei Fragen zum Tauschhandel.',
      'Kapitel 4 geschafft! Sprich mit Ota für Kapitel 5.',
    ],
    intro: [
      { text: 'Gute Neuigkeiten! Im Süden unseres Dorfes hat der Fernhändler Enki seinen bunten Stand aufgebaut.' },
      { text: 'Er bringt Schätze aus weit entfernten Gegenden mit: weißes Salz zum Haltbarmachen von Fleisch und leuchtenden Bernstein von einem fernen Meer!' },
      { text: 'Münzen oder Geld kennt niemand. Aber Enki tauscht Ware gegen Ware: Er sucht Getreide und fein gewebte Stoffe!' },
      { text: 'Baue zuerst links im Dorf unseren neuen Gewichtswebstuhl für Weberin Jana.' },
    ],
    hints: {
      1: 'Der Bauplatz für den Webstuhl liegt links vom Vorratsspeicher (4 Stöcke, 2 Steine).',
      2: 'Geh zum Tiergehege im Osten und drücke E an deiner zahmen Ziege (oder tausche Wolle bei Enki).',
      3: 'Öffne mit C das Handwerksmenü und wähle „Stoff weben“ (kostet 2× Wolle).',
      4: 'Geh nach Süden zu Fernhändler Enki (oder drücke H) und tausche 2× Getreide gegen 1× Salz.',
      5: 'Webe einen Stoff (2× Wolle -> C) und tausche ihn bei Enki (E oder H) gegen 1× Ostsee-Bernstein!',
      6: 'Du hast Salz und Bernstein ertauscht! Geh zurück zu Ältester Ota.',
    },
    quiz: [
      { text: 'Salz aus den Bergen und Bernstein von der fernen Küste – unser Dorf ist jetzt Teil eines großen Handelsnetzes!' },
      {
        question: 'Wie bezahlten die Menschen in der Steinzeit beim Handel?',
        options: [
          'Mit Euro-Münzen und Geldscheinen',
          'Durch Tauschhandel: Ware gegen Ware (z. B. Getreide oder Stoff gegen Salz und Feuerstein)',
          'Mit Kreditkarten aus Ton',
        ],
        correct: 1,
        explain: 'Münzgeld wurde erst Jahrtausende später erfunden. Getauscht wurden landwirtschaftliche Überschüsse gegen seltene Rohstoffe.',
      },
      {
        question: 'Warum war Salz für die Menschen damals so kostbar („Weißes Gold“)?',
        options: [
          'Man konnte damit Fleisch und Fisch einsalzen und für den Winter haltbar machen',
          'Man baute daraus Häuser',
          'Es leuchtete im Dunkeln',
        ],
        correct: 0,
        explain: 'Ohne Kühlschrank war Salz neben dem Räuchern und Trocknen das wichtigste Mittel gegen das Verderben von Vorräten.',
      },
      {
        question: 'Was veränderte sich im Dorf durch Überschüsse und wertvolle Handelsgüter wie Bernstein?',
        options: [
          'Alle zogen wieder in Höhlen',
          'Es entstanden persönlicher Besitz, Reichtum und erste Rangunterschiede (Anführer/Häuptlinge)',
          'Niemand arbeitete mehr',
        ],
        correct: 1,
        explain: 'Wer volle Speicher, Schmuck und seltene Werkzeuge besaß, gewann Ansehen und Einfluss in der Gemeinschaft.',
      },
      {
        text: 'Doch Händler Enki erzählte noch etwas Spannendes: In den Felsen im Norden soll ein rötlich glänzender Stein stecken, der im Feuer schmilzt!',
      },
    ],
  },
  5: {
    id: 5,
    title: 'Kapitel 5: Die Kupferzeit',
    subtitle: 'Erzabbau im Nord-Stollen & das Beil des Ötzi',
    era: 'Kupferzeit (ca. 3.300 v. Chr.)',
    merksatz:
      'In der Kupferzeit entdeckten die Menschen das erste Metall: Sie bauten Kupfererz in Bergbau-Stollen ab, schmolzen es in über 1.000 °C heißen Schmelzöfen und gossen es in Formen. Ein berühmtes Beispiel ist das gegossene Kupferbeil der Gletschermumie Ötzi (ca. 3.300 v. Chr.). Metall ließ sich bei Bruch immer wieder neu einschmelzen.',
    quests: [
      'Sprich mit Ota über die Entdeckung des ersten Metalls (E).',
      'Stelle im Handwerksmenü (C) eine Spitzhacke her (2 Stöcke, 3 Steine).',
      'Errichte den Schmelzofen links oben im Dorf (E): 4 Lehm, 4 Steine.',
      'Baue am Bergbau-Stollen im hohen Norden 2× rötliches Kupfererz ab (E).',
      'Schmelze im Menü (C) aus 2× Kupfererz und 1× Stock einen Kupferbarren.',
      'Gieße im Menü (C) dein erstes Kupferbeil (wie das Beil von Ötzi)!',
      'Zeige Ota dein glänzendes Kupferbeil (E).',
      'Beantworte Otas drei Fragen zur Kupferzeit.',
      'Kapitel 5 geschafft! Sprich mit Ota für das Finale (Kapitel 6).',
    ],
    intro: [
      { text: 'Jahrtausende lang kannten wir nur Stein, Knochen und Holz für unsere Werkzeuge. Doch jetzt beginnt ein neues Zeitalter!' },
      { text: 'Oben an der nördlichen Felswand haben wir einen Bergbau-Stollen freigelegt. Dort glitzert grünlich-rotes Gestein: Kupfererz!' },
      { text: 'Wenn man ein Feuer mit Blasebälgen auf über 1.000 Grad anheizt, schmilzt das Erz zu flüssigem Kupfer und lässt sich in Formen gießen!' },
      { text: 'Stelle zuerst eine robuste Spitzhacke (C) her und baue unseren Schmelzofen links oben im Dorf.' },
    ],
    hints: {
      1: 'Öffne mit C das Handwerksmenü und baue eine Spitzhacke (2 Stöcke, 3 Steine).',
      2: 'Der Bauplatz für den Schmelzofen liegt links vom Langhaus (4 Lehm, 4 Steine).',
      3: 'Lauf ganz nach Norden zum Höhleneingang! Rechts und links davon liegen rötliche Kupfererz-Adern. Baue sie mit E ab.',
      4: 'Öffne mit C das Handwerksmenü und wähle „Kupfer schmelzen“ (2× Kupfererz, 1× Stock).',
      5: 'Wähle im Handwerksmenü (C) „Kupferbeil gießen“ (1× Kupferbarren, 1× Stock).',
      6: 'Du hältst ein echtes Kupferbeil in den Händen! Geh zurück zu Ota.',
    },
    quiz: [
      { text: 'Was für ein Meisterwerk! Ein gegossenes Beil aus glänzendem Kupfer – viel schärfer als jeder Stein!' },
      {
        question: 'Welche berühmte Gletschermumie aus den Alpen (ca. 3.300 v. Chr.) trug genau so ein Kupferbeil bei sich?',
        options: ['Tutanchamun', 'Ötzi (der Mann aus dem Eis)', 'Julius Cäsar'],
        correct: 1,
        explain: 'Ötzis Beil aus fast reinem Kupfer zeigte den Forschern, wie hoch entwickelt die Metallverarbeitung schon vor über 5.000 Jahren war.',
      },
      {
        question: 'Welchen großen Vorteil hatte Metall gegenüber Feuerstein?',
        options: [
          'Metall zersplittert nicht so leicht und lässt sich beim Einschmelzen in jede Form neu gießen',
          'Metall wächst auf Bäumen',
          'Metall ist leichter als Federn',
        ],
        correct: 0,
        explain: 'Bricht ein Steinbeil, ist es kaputt. Ein verbogenes oder gebrochenes Kupferbeil konnte man einfach wieder einschmelzen!',
      },
      {
        question: 'Warum konnte nicht jeder im Dorf selbst Kupfer schmelzen?',
        options: [
          'Weil es verboten war',
          'Weil man großes Spezialwissen über Erze, Gussformen und über 1.000 °C heiße Öfen brauchte',
          'Weil Kupfer nur nachts schmilzt',
        ],
        correct: 1,
        explain: 'Bergleute und Metallgießer wurden zu hoch angesehenen Spezialisten.',
      },
      {
        text: 'Einen Nachteil hat reines Kupfer allerdings: Es ist noch recht weich. Aber Schmelzer Barak hat eine Idee, wie wir es steinhart machen!',
      },
    ],
  },
  6: {
    id: 6,
    title: 'Kapitel 6: Bronze- und Eisenzeit',
    subtitle: 'Zinn-Fernhandel, Bronzeguss & die Eisenschmiede',
    era: 'Bronze- & Eisenzeit (ab 2.200 / 800 v. Chr.)',
    merksatz:
      'In der Bronzezeit (ab ca. 2.200 v. Chr.) schmolzen Gießer 9 Teile Kupfer und 1 Teil seltenes Zinn zu einer harten Legierung zusammen: Bronze. Ab ca. 800 v. Chr. begann in Mitteleuropa die Eisenzeit: In über 1.500 °C heißen Rennöfen wurde heimisches Eisenerz verhüttet und auf dem Amboss zu noch härteren Werkzeugen, Pflugscharen und Schwertern geschmiedet.',
    quests: [
      'Sprich mit Ota über das Geheimnis von Bronze und Eisen (E).',
      'Tausche bei Fernhändler Enki (E oder H) seltenes Zinnerz ein.',
      'Legiere im Menü (C) 1× Bronzebarren (aus 1× Kupfer + 1× Zinn) und gieße 1× Bronzeschwert.',
      'Errichte die Eisenschmiede & Amboss nördlich vom Töpferofen (E: 5 Steine, 4 Lehm, 1 Bronze).',
      'Baue am Nord-Stollen bläuliches Eisenerz ab und verhütte es (C) zu 1× Eisenbarren.',
      'Schmiede im Menü (C) 1× Eisenschmiedewerkzeug!',
      'Sprich mit Ota zum großen Finale eurer Reise durch die Menschheitsgeschichte!',
      'Löse das große Abschlussquiz zur Metallzeit.',
      'Alle 6 Kapitel gemeistert! Öffne deine Epochen-Urkunde (U).',
    ],
    intro: [
      { text: 'Willkommen im letzten großen Kapitel unserer Reise! Schmelzer Barak hat herausgefunden: Wenn man Kupfer mit etwas Zinn zusammenschmilzt, entsteht Bronze!' },
      { text: 'Bronze ist goldglänzend und viel härter als reines Kupfer. Doch Zinnerz gibt es in unseren Bergen nicht – du musst es bei Fernhändler Enki eintauschen!' },
      { text: 'Und das ist noch nicht alles: Im Stollen haben wir graublaues Eisenerz entdeckt. Wenn wir eine richtige Schmiede mit Rennofen und Amboss bauen, beginnt die Eisenzeit!' },
      { text: 'Besorge dir zuerst Zinnerz bei Händler Enki (gegen Getreide oder Stoff) und gieße Bronze!' },
    ],
    hints: {
      1: 'Geh im Süden zu Fernhändler Enki (oder drücke H) und tausche 2× Getreide oder 1× Stoff gegen Zinnerz.',
      2: 'Baue bei Bedarf Kupfererz im Norden ab -> schmelze Kupfer (C) -> wähle „Bronze legieren“ (1 Kupfer + 1 Zinn) -> wähle „Bronzeschwert gießen“ (C)!',
      3: 'Der Bauplatz für die Eisenschmiede liegt oben zwischen Töpferofen und Stollen (5 Steine, 4 Lehm, 1 Bronzebarren).',
      4: 'Rechts am Nord-Stollen findest du graublaue Eisenerz-Adern (E). Verhütte 2× Eisenerz + 2× Stöcke im Menü (C) zu einem Eisenbarren!',
      5: 'Wähle im Handwerksmenü (C) „Eisenwerkzeug schmieden“ (1× Eisenbarren, 1× Stock).',
      6: 'Du hast den Bogen vom Faustkeil bis zum geschmiedeten Eisen gespannt! Sprich jetzt mit Ota.',
    },
    quiz: [
      { text: 'Vom einfachen Faustkeil der Jäger und Sammler bis zum geschmiedeten Eisen im befestigten Dorf – was für eine Reise!' },
      {
        question: 'Aus welchen zwei Metallen besteht die Legierung Bronze?',
        options: ['Aus Gold und Silber', 'Aus Kupfer und Zinn', 'Aus Eisen und Stein'],
        correct: 1,
        explain: 'Etwa 90 % Kupfer und 10 % Zinn ergeben zusammen harte, goldglänzende Bronze.',
      },
      {
        question: 'In welcher richtigen zeitlichen Reihenfolge folgten die Epochen der Menschheitsgeschichte aufeinander?',
        options: [
          'Eisenzeit -> Steinzeit -> Bronzezeit',
          'Altsteinzeit -> Jungsteinzeit -> Kupferzeit -> Bronzezeit -> Eisenzeit',
          'Bronzezeit -> Altsteinzeit -> Eisenzeit',
        ],
        correct: 1,
        explain: 'Erst Steinwerkzeuge, dann Sesshaftwerdung (Jungsteinzeit), dann Kupfer, Bronze und schließlich Eisen!',
      },
      {
        question: 'Warum löste Eisen später die Bronze bei Werkzeugen und Waffen ab?',
        options: [
          'Weil Eisenerz an vielen Orten vorkam (kein seltener Zinn-Fernhandel nötig) und geschmiedetes Eisen noch härter war',
          'Weil Eisen weicher als Butter ist',
          'Weil man für Eisen gar kein Feuer brauchte',
        ],
        correct: 0,
        explain: 'Sobald die Menschen Öfen über 1.500 °C bauen konnten, wurden eiserne Pflugscharen, Äxte und Schwerter zum neuen Standard.',
      },
      {
        text: 'Fantastisch! Du hast alle 6 Kapitel erfolgreich abgeschlossen. Deine persönliche Epochen-Urkunde für den Geschichtshefter ist jetzt bereit!',
      },
    ],
  },
};
