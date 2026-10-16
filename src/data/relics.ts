export interface RelicDef {
  id: string;
  title: string;
  epoch: string;
  icon: string;
  locationHint: string;
  lore: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const RELICS: Record<string, RelicDef> = {
  venus: {
    id: 'venus',
    title: 'Venus vom Hohle Fels',
    epoch: 'Altsteinzeit (~40.000 v. Chr.)',
    icon: '🗿',
    locationHint: 'Verborgen in der dunklen Höhle am Höhlensee',
    lore: 'Geschnitzt aus dem Stoßzahn eines Wollhaarmammuts. Sie ist eine der ältesten figürlichen Menschendarstellungen der Welt und galt den Eiszeit-Jägern als mächtiges Symbol für Schutz und Fruchtbarkeit.',
    question: 'Woraus schnitzten die eiszeitlichen Künstler die berühmte Venus vom Hohle Fels?',
    options: [
      'Aus versteinertem Hartholz',
      'Aus dem Elfenbein eines Mammutstoßzahns',
      'Aus gebranntem Flusston',
    ],
    correct: 1,
    explanation: 'Richtig! Die Figur wurde mit Steinklingen aus fossilem Mammut-Elfenbein herausgearbeitet.',
  },
  loewenmensch: {
    id: 'loewenmensch',
    title: 'Der Löwenmensch von Lonetal',
    epoch: 'Altsteinzeit (~35.000 v. Chr.)',
    icon: '🦁',
    locationHint: 'In einem engen Felsspalt tief in den Höhlengängen',
    lore: 'Eine über 30 cm hohe Skulptur mit aufrechtem menschlichen Körper und dem majestätischen Kopf eines Höhlenlöwen. Sie beweist, dass bereits die Eiszeitmenschen Mythen, Geisterwelten und Zeremonien kannten.',
    question: 'Welches mächtige Raubtier der Eiszeit schmückt das Haupt der Löwenmensch-Statue?',
    options: [
      'Der Höhlenbär',
      'Der Höhlenlöwe',
      'Der Säbelzahntiger',
    ],
    correct: 1,
    explanation: 'Richtig! Der europäische Höhlenlöwe war das gefürchtetste und verehrteste Raubtier der Mammutsteppe.',
  },
  malerei: {
    id: 'malerei',
    title: 'Wandmalerei der Mammutherde',
    epoch: 'Jungpaläolithikum (~20.000 v. Chr.)',
    icon: '🦣',
    locationHint: 'An der großen beleuchteten Nordwand in der Höhle',
    lore: 'Gemalt mit pulverisiertem rotem Ocker, Holzkohle und Tierfett. Die Maler nutzten die natürlichen Wölbungen der Felswand geschickt aus, um den Körpern der Mammuts dreidimensionales Leben einzuhauchen.',
    question: 'Welches natürliche Mineralpulver diente als leuchtend rote Farbe für die Höhlenmalerei?',
    options: [
      'Roter Ocker (Eisenoxid-Gestein)',
      'Geriebene Ziegelsteine',
      'Roter Beeren- und Blütensaft',
    ],
    correct: 0,
    explanation: 'Richtig! Ocker ist ein eisenhaltiges Mineral, das die Eiszeitjäger zu feinstem Puder zermahlten und mit Wasser oder Fett anrührten.',
  },
  oetzi_dolch: {
    id: 'oetzi_dolch',
    title: 'Ötzis kupferne Dolchklinge',
    epoch: 'Kupfersteinzeit (~3.300 v. Chr.)',
    icon: '🗡️',
    locationHint: 'Am Felsenhang nahe dem Mammutpfad im Nordosten',
    lore: 'Die Klinge aus geschmiedetem, fast 100% reinem Kupfer war ein technologisches Meisterwerk. Sie beweist den Übergang von geschlagenem Feuerstein zu den ersten geschmolzenen Metallen.',
    question: 'Aus welchem ersten verhütteten Metall bestand die berühmte Axt und Dolchklinge des Gletschermannes Ötzi?',
    options: [
      'Aus gehärtetem Eisen',
      'Aus gegossenem und geschmiedetem Kupfer',
      'Aus Bronze (Kupfer-Zinn-Legierung)',
    ],
    correct: 1,
    explanation: 'Richtig! Ötzi lebte am Ende der Jungsteinzeit / Kupferzeit. Reine Kupferwerkzeuge waren damals wertvollste Statussymbole.',
  },
  himmelsscheibe: {
    id: 'himmelsscheibe',
    title: 'Fragment der Himmelsscheibe von Nebra',
    epoch: 'Frühe Bronzezeit (~1.600 v. Chr.)',
    icon: '✨',
    locationHint: 'Auf dem Steinkreis-Hügel südlich des Dorfes',
    lore: 'Die weltweit älteste bekannte konkrete Himmelsdarstellung! Auf der Bronzescheibe sind Sonne, Mondsichel und 32 goldene Sterne abgebildet, darunter die Siebengestirn-Gruppe (Plejaden). Sie diente als astronomisches Meisterwerk zur Kalenderbestimmung.',
    question: 'Welche markante Sternengruppe (Siebengestirn) ist als goldene Sternen-Ansammlung auf der Scheibe verewigt?',
    options: [
      'Der Große Wagen',
      'Die Plejaden (Siebengestirn)',
      'Der Gürtel des Orion',
    ],
    correct: 1,
    explanation: 'Richtig! Die Konjunktion der Plejaden mit der Mondsichel zeigte den bronzezeitlichen Bauern den genauen Zeitpunkt für Aussaat und Ernte an.',
  },
};
