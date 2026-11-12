import type { Lesson, Pack } from '../types';
import { words, verb, lesson, grammar as g } from './concepts';

// Espagnol, allemand, italien, portugais : même structure que les autres langues de départ.
// Contenu rédigé par Claude et non relu par un locuteur natif (voir « Sources et licences »).

const conjugator = (P: string[]) => (forms: string[]) => forms.map((f, i) => `${P[i]}=${f}`);

// ───────────────────────────── Espagnol ─────────────────────────────
const cEs = conjugator(['yo', 'tú', 'él / ella', 'nosotros', 'vosotros', 'ellos']);

export const es: Pack = {
  words: words('es', [
    'hola', 'buenos días', 'buenas tardes', 'adiós', 'gracias', 'de nada', 'perdón', 'sí', 'no', 'por favor',
    'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'agua', 'pan', 'arroz', 'pescado', 'carne', 'té', 'fruta', 'leche',
    'madre', 'padre', 'amigo', 'niño', 'hermano',
    'casa', 'escuela', 'trabajo', 'libro', 'día', 'noche', 'perro', 'gato',
  ]),
  verbs: [
    verb('es', 'ser', 'être (identité, nature)', [
      ['Presente', ...cEs(['soy', 'eres', 'es', 'somos', 'sois', 'son'])],
      ['Pretérito indefinido', ...cEs(['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'])],
      ['Futuro', ...cEs(['seré', 'serás', 'será', 'seremos', 'seréis', 'serán'])],
      ['Pretérito perfecto', ...cEs(['he sido', 'has sido', 'ha sido', 'hemos sido', 'habéis sido', 'han sido'])],
    ], "Irrégulier. « ser » dit ce qu'on est ; « estar » dit où on est ou comment on va."),
    verb('es', 'tener', 'avoir', [
      ['Presente', ...cEs(['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'])],
      ['Pretérito indefinido', ...cEs(['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvisteis', 'tuvieron'])],
      ['Futuro', ...cEs(['tendré', 'tendrás', 'tendrá', 'tendremos', 'tendréis', 'tendrán'])],
      ['Pretérito perfecto', ...cEs(['he tenido', 'has tenido', 'ha tenido', 'hemos tenido', 'habéis tenido', 'han tenido'])],
    ], "Aussi utilisé pour l'âge : tengo veinte años."),
    verb('es', 'ir', 'aller', [
      ['Presente', ...cEs(['voy', 'vas', 'va', 'vamos', 'vais', 'van'])],
      ['Pretérito indefinido', ...cEs(['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'])],
      ['Futuro', ...cEs(['iré', 'irás', 'irá', 'iremos', 'iréis', 'irán'])],
      ['Pretérito perfecto', ...cEs(['he ido', 'has ido', 'ha ido', 'hemos ido', 'habéis ido', 'han ido'])],
    ], "Au pretérito indefinido, « ir » et « ser » ont les mêmes formes : fui."),
    verb('es', 'comer', 'manger', [
      ['Presente', ...cEs(['como', 'comes', 'come', 'comemos', 'coméis', 'comen'])],
      ['Pretérito indefinido', ...cEs(['comí', 'comiste', 'comió', 'comimos', 'comisteis', 'comieron'])],
      ['Futuro', ...cEs(['comeré', 'comerás', 'comerá', 'comeremos', 'comeréis', 'comerán'])],
      ['Pretérito perfecto', ...cEs(['he comido', 'has comido', 'ha comido', 'hemos comido', 'habéis comido', 'han comido'])],
    ], 'Modèle des verbes réguliers en -er.'),
  ],
  lessons: [
    lesson('es', 1, {
      title: 'Saluer et se présenter', level: 'Débutant',
      intro: "Les formules de base pour dire bonjour, se présenter et prendre des nouvelles.",
      sections: [
        { heading: 'Saluer', body: "« Hola » convient partout. « Buenos días » jusqu'à midi, « buenas tardes » l'après-midi et en début de soirée, « buenas noches » quand il fait nuit." },
        { heading: 'Se présenter', body: "« Me llamo… » (je m'appelle…) ou « Soy… » (je suis…). Pour répondre : « Mucho gusto » ou « Encantado / encantada »." },
        { heading: 'Prendre des nouvelles', body: "« ¿Cómo estás? » (tu) ou « ¿Cómo está usted? » (vous). Réponse : « Bien, gracias, ¿y tú? »." },
      ],
      phrases: [
        { text: 'Hola, me llamo Ana.', fr: "Bonjour, je m'appelle Ana." },
        { text: 'Mucho gusto.', fr: 'Enchanté.' },
        { text: '¿Cómo estás?', fr: 'Comment vas-tu ?' },
        { text: 'Bien, gracias, ¿y tú?', fr: 'Bien, merci, et toi ?' },
        { text: '¿De dónde eres?', fr: "D'où viens-tu ?" },
        { text: 'Soy de Francia.', fr: 'Je viens de France.' },
      ],
      quiz: [
        { q: 'Que dit-on le matin ?', choices: ['Buenas noches', 'Buenos días', 'Adiós'], answer: 1 },
        { q: '« Me llamo Ana » signifie…', choices: ["Je m'appelle Ana", 'Je viens de Ana', "J'aime Ana"], answer: 0 },
        { q: 'Réponse à « Mucho gusto » :', choices: ['De nada', 'Igualmente', 'Perdón'], answer: 1 },
      ],
    }),
    lesson('es', 2, {
      title: 'Le présent des verbes en -ar, -er, -ir', level: 'Débutant',
      intro: "Trois familles de verbes, trois terminaisons. Le pronom sujet est souvent omis car la terminaison suffit.",
      sections: [
        { heading: 'Les terminaisons', body: "-ar (hablar) : hablo, hablas, habla, hablamos, habláis, hablan. -er (comer) : como, comes, come, comemos, coméis, comen. -ir (vivir) : vivo, vives, vive, vivimos, vivís, viven." },
        { heading: 'Pas de pronom', body: "On dit « hablo español » plutôt que « yo hablo español ». Le pronom sert à insister ou à lever une ambiguïté (él / ella)." },
        { heading: 'Négation et question', body: "On place « no » devant le verbe : no hablo francés. Pour une question, l'intonation suffit, avec « ¿ » au début : ¿Hablas inglés?" },
      ],
      phrases: [
        { text: 'Hablo un poco de español.', fr: "Je parle un peu d'espagnol." },
        { text: 'Ella vive en Madrid.', fr: 'Elle vit à Madrid.' },
        { text: 'Comemos pan y fruta.', fr: 'Nous mangeons du pain et des fruits.' },
        { text: 'No bebo café.', fr: 'Je ne bois pas de café.' },
        { text: '¿Trabajas aquí?', fr: 'Travailles-tu ici ?' },
      ],
      quiz: [
        { q: 'Complétez : « Nosotros ___ (comer) pan. »', choices: ['como', 'comemos', 'comen'], answer: 1 },
        { q: 'Forme négative correcte :', choices: ['Hablo no español.', 'No hablo español.', 'Hablo español no.'], answer: 1 },
        { q: '« Vivís » correspond à…', choices: ['vosotros', 'ellos', 'tú'], answer: 0 },
      ],
    }),
    lesson('es', 3, {
      title: 'Demander et commander', level: 'Débutant',
      intro: 'Des formules polies pour commander au café ou au restaurant, ou demander un prix.',
      sections: [
        { heading: 'Demander poliment', body: "« Quisiera… » (je voudrais…) ou « Me gustaría… ». Plus simple : « Un café, por favor »." },
        { heading: 'Le prix', body: "« ¿Cuánto cuesta? » pour un objet, « ¿Cuánto cuestan? » pour plusieurs. L'addition : « La cuenta, por favor »." },
        { heading: 'Remercier', body: "« Gracias », « muchas gracias ». On répond « de nada »." },
      ],
      phrases: [
        { text: 'Quisiera un café, por favor.', fr: "Je voudrais un café, s'il vous plaît." },
        { text: '¿Tiene agua?', fr: "Avez-vous de l'eau ?" },
        { text: '¿Cuánto cuesta?', fr: 'Combien ça coûte ?' },
        { text: 'La cuenta, por favor.', fr: "L'addition, s'il vous plaît." },
        { text: 'Muchas gracias. — De nada.', fr: 'Merci beaucoup. — De rien.' },
      ],
      quiz: [
        { q: 'Pour demander poliment :', choices: ['Dame un café.', 'Quisiera un café, por favor.', 'Café.'], answer: 1 },
        { q: 'Pour demander le prix de plusieurs objets :', choices: ['¿Cuánto cuesta?', '¿Cuánto cuestan?', '¿Cuántos son?'], answer: 1 },
        { q: 'Réponse à « Gracias » :', choices: ['De nada', 'Por favor', 'Perdón'], answer: 0 },
      ],
    }),
  ],
};

export const esExtra = [
  'rojo', 'azul', 'verde', 'amarillo', 'negro', 'blanco',
  'cabeza', 'mano', 'ojo', 'corazón',
  'hoy', 'mañana', 'ayer', 'ahora', 'la mañana',
  'ciudad', 'camino', 'estación', 'coche', 'tienda', 'hospital',
  'comer', 'beber', 'ir', 'venir', 'ver', 'hablar', 'querer', 'saber', 'amar', 'comprar', 'dormir', 'trabajar',
  'grande', 'pequeño', 'bueno', 'nuevo', 'bonito', 'caliente', 'frío',
  'qué', 'quién', 'dónde', 'cuándo', 'por qué', 'cómo', 'cuánto',
  'yo', 'tú', 'él / ella', 'nosotros', 'vosotros', 'ellos',
  'sol', 'lluvia', 'montaña', 'mar', 'árbol',
];

export const esGrammar: Lesson[] = [
  g('es', 1, {
    title: 'Genre et pluriel des noms', level: 'Débutant',
    intro: "Tout nom espagnol est masculin ou féminin, et l'article et l'adjectif s'accordent avec lui.",
    sections: [
      { heading: 'Les articles', body: "Défini : el (masc.), la (fém.), los, las au pluriel. Indéfini : un, una, unos, unas. Le libro, la casa, los libros, las casas." },
      { heading: 'Deviner le genre', body: "Les noms en -o sont en général masculins (el libro) et ceux en -a féminins (la casa). Exceptions fréquentes : el día, el mapa, la mano." },
      { heading: 'Le pluriel', body: "On ajoute -s après une voyelle (casa → casas) et -es après une consonne (ciudad → ciudades). Un -z devient -c- : lápiz → lápices." },
    ],
    phrases: [
      { text: 'El libro está en la mesa.', fr: 'Le livre est sur la table.' },
      { text: 'Tengo una casa y unos amigos.', fr: "J'ai une maison et des amis." },
      { text: 'Las ciudades son grandes.', fr: 'Les villes sont grandes.' },
      { text: 'El día es largo.', fr: 'Le jour est long.' },
    ],
    quiz: [
      { q: 'Article de « casa » :', choices: ['el', 'la', 'los'], answer: 1 },
      { q: 'Pluriel de « ciudad » :', choices: ['ciudads', 'ciudades', 'ciudaes'], answer: 1 },
      { q: '« Día » est…', choices: ['féminin', 'masculin', 'neutre'], answer: 1 },
    ],
  }),
  g('es', 2, {
    title: 'Ser et estar', level: 'Débutant',
    intro: "L'espagnol a deux verbes « être ». Le bon choix dépend de ce qu'on exprime.",
    sections: [
      { heading: 'Ser', body: "Identité, origine, profession, caractère, heure, matière : soy francés, es médico, es alto, son las tres." },
      { heading: 'Estar', body: "Lieu et état temporaire : estoy en casa, está cansado, está abierto. Aussi avec le gérondif : estoy comiendo." },
      { heading: 'Le sens change', body: "Es aburrido = il est ennuyeux ; está aburrido = il s'ennuie. Es listo = il est malin ; está listo = il est prêt." },
    ],
    phrases: [
      { text: 'Soy estudiante.', fr: 'Je suis étudiant.' },
      { text: 'Estoy en el trabajo.', fr: 'Je suis au travail.' },
      { text: 'La sopa está caliente.', fr: 'La soupe est chaude.' },
      { text: 'Es de México.', fr: 'Il est du Mexique.' },
    ],
    quiz: [
      { q: 'Complétez : « Ella ___ médica. »', choices: ['está', 'es', 'estás'], answer: 1 },
      { q: 'Complétez : « Estoy ___ casa. » (lieu)', choices: ['ser', 'en', 'es'], answer: 1 },
      { q: 'Pour un état temporaire (fatigué) :', choices: ['ser', 'estar', 'tener'], answer: 1 },
    ],
  }),
  g('es', 3, {
    title: "L'accord de l'adjectif", level: 'Élémentaire',
    intro: "L'adjectif s'accorde en genre et en nombre, et se place le plus souvent après le nom.",
    sections: [
      { heading: 'Accord', body: "Les adjectifs en -o ont quatre formes : bueno, buena, buenos, buenas. Ceux en -e ou en consonne n'en ont que deux : grande / grandes, fácil / fáciles." },
      { heading: 'Place', body: "Après le nom : una casa grande, un libro interesante. Certains adjectifs courts se placent avant : buen día, mala idea. « Bueno » et « malo » perdent leur -o devant un nom masculin singulier." },
      { heading: 'Comparer', body: "más… que (plus… que), menos… que (moins… que), tan… como (aussi… que). Irréguliers : mejor (meilleur), peor (pire)." },
    ],
    phrases: [
      { text: 'Es una casa muy bonita.', fr: 'C’est une très jolie maison.' },
      { text: 'Los coches son nuevos.', fr: 'Les voitures sont neuves.' },
      { text: 'Este libro es más interesante que ese.', fr: 'Ce livre est plus intéressant que celui-là.' },
      { text: 'Hoy es un buen día.', fr: "Aujourd'hui est un bon jour." },
    ],
    quiz: [
      { q: 'Féminin pluriel de « bueno » :', choices: ['buenos', 'buenas', 'buenes'], answer: 1 },
      { q: '« Un ___ día » :', choices: ['bueno', 'buen', 'buena'], answer: 1 },
      { q: 'Meilleur :', choices: ['más bueno', 'mejor', 'bueno más'], answer: 1 },
    ],
  }),
  g('es', 4, {
    title: 'Le passé : indefinido et perfecto', level: 'Élémentaire',
    intro: "Deux passés courants pour les actions terminées.",
    sections: [
      { heading: 'Pretérito indefinido', body: "Action terminée à un moment précis du passé : ayer comí paella. Terminaisons en -ar : -é, -aste, -ó, -amos, -asteis, -aron ; en -er / -ir : -í, -iste, -ió, -imos, -isteis, -ieron." },
      { heading: 'Pretérito perfecto', body: "haber au présent + participe passé : he comido. Il relie le passé au présent (aujourd'hui, cette semaine, déjà) : hoy he trabajado mucho." },
      { heading: 'Participes', body: "-ar → -ado (hablado), -er / -ir → -ido (comido, vivido). Irréguliers : hecho (hacer), dicho (decir), visto (ver), escrito (escribir)." },
    ],
    phrases: [
      { text: 'Ayer hablé con mi madre.', fr: 'Hier, j’ai parlé avec ma mère.' },
      { text: 'Comimos en un restaurante.', fr: 'Nous avons mangé dans un restaurant.' },
      { text: 'Hoy he visto a Pedro.', fr: "Aujourd'hui, j'ai vu Pedro." },
      { text: '¿Has comido ya?', fr: 'As-tu déjà mangé ?' },
    ],
    quiz: [
      { q: 'Indefinido de « hablar » (yo) :', choices: ['hablé', 'hablo', 'he hablado'], answer: 0 },
      { q: 'Participe passé de « vivir » :', choices: ['vivado', 'vivido', 'vivo'], answer: 1 },
      { q: 'Avec « ayer » (hier) on emploie plutôt :', choices: ['le perfecto', "l'indefinido", 'le futur'], answer: 1 },
    ],
  }),
];

// ───────────────────────────── Allemand ─────────────────────────────
const cDe = conjugator(['ich', 'du', 'er / sie / es', 'wir', 'ihr', 'sie / Sie']);
const fut = (inf: string) => ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'].map((w) => `${w} ${inf}`);
const perf = (aux: string[], pp: string) => aux.map((a) => `${a} ${pp}`);
const HAB = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'];
const SEI = ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'];

export const de: Pack = {
  words: words('de', [
    'hallo', 'guten Morgen', 'guten Abend', 'auf Wiedersehen', 'danke', 'gern geschehen', 'Entschuldigung', 'ja', 'nein', 'bitte',
    'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn',
    'das Wasser', 'das Brot', 'der Reis', 'der Fisch', 'das Fleisch', 'der Tee', 'das Obst', 'die Milch',
    'die Mutter', 'der Vater', 'der Freund', 'das Kind', 'der Bruder',
    'das Haus', 'die Schule', 'die Arbeit', 'das Buch', 'der Tag', 'die Nacht', 'der Hund', 'die Katze',
  ]),
  verbs: [
    verb('de', 'sein', 'être', [
      ['Präsens', ...cDe(['bin', 'bist', 'ist', 'sind', 'seid', 'sind'])],
      ['Präteritum', ...cDe(['war', 'warst', 'war', 'waren', 'wart', 'waren'])],
      ['Futur I', ...cDe(fut('sein'))],
      ['Perfekt', ...cDe(perf(SEI, 'gewesen'))],
    ], 'Irrégulier. Le Perfekt se forme avec sein lui-même.'),
    verb('de', 'haben', 'avoir', [
      ['Präsens', ...cDe(['habe', 'hast', 'hat', 'haben', 'habt', 'haben'])],
      ['Präteritum', ...cDe(['hatte', 'hattest', 'hatte', 'hatten', 'hattet', 'hatten'])],
      ['Futur I', ...cDe(fut('haben'))],
      ['Perfekt', ...cDe(perf(HAB, 'gehabt'))],
    ], 'Auxiliaire du Perfekt pour la plupart des verbes.'),
    verb('de', 'gehen', 'aller', [
      ['Präsens', ...cDe(['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'])],
      ['Präteritum', ...cDe(['ging', 'gingst', 'ging', 'gingen', 'gingt', 'gingen'])],
      ['Futur I', ...cDe(fut('gehen'))],
      ['Perfekt', ...cDe(perf(SEI, 'gegangen'))],
    ], "Verbe de mouvement : le Perfekt prend sein."),
    verb('de', 'essen', 'manger', [
      ['Präsens', ...cDe(['esse', 'isst', 'isst', 'essen', 'esst', 'essen'])],
      ['Präteritum', ...cDe(['aß', 'aßt', 'aß', 'aßen', 'aßt', 'aßen'])],
      ['Futur I', ...cDe(fut('essen'))],
      ['Perfekt', ...cDe(perf(HAB, 'gegessen'))],
    ], 'Verbe fort : e → i aux 2e et 3e personnes du singulier.'),
  ],
  lessons: [
    lesson('de', 1, {
      title: 'Saluer et se présenter', level: 'Débutant',
      intro: "Les formules de base. En allemand, on distingue « du » (tu) et « Sie » (vous de politesse).",
      sections: [
        { heading: 'Saluer', body: "« Hallo » est universel. « Guten Morgen » le matin, « guten Tag » dans la journée, « guten Abend » le soir, « gute Nacht » pour aller dormir." },
        { heading: 'Se présenter', body: "« Ich heiße… » (je m'appelle…) ou « Mein Name ist… ». Pour répondre : « Freut mich » (enchanté)." },
        { heading: 'Du ou Sie ?', body: "« Wie geht es Ihnen? » est poli, « Wie geht's? » familier. Avec des inconnus et des adultes, on emploie « Sie »." },
      ],
      phrases: [
        { text: 'Hallo, ich heiße Anna.', fr: "Bonjour, je m'appelle Anna." },
        { text: 'Freut mich.', fr: 'Enchanté.' },
        { text: 'Wie geht es Ihnen?', fr: 'Comment allez-vous ?' },
        { text: 'Gut, danke. Und Ihnen?', fr: 'Bien, merci. Et vous ?' },
        { text: 'Woher kommen Sie?', fr: "D'où venez-vous ?" },
        { text: 'Ich komme aus Frankreich.', fr: 'Je viens de France.' },
      ],
      quiz: [
        { q: 'Que dit-on le soir ?', choices: ['Guten Morgen', 'Guten Abend', 'Danke'], answer: 1 },
        { q: '« Ich heiße Anna » signifie…', choices: ["Je m'appelle Anna", 'Je viens de Anna', "J'ai Anna"], answer: 0 },
        { q: 'Pour vouvoyer :', choices: ['du', 'Sie', 'ihr'], answer: 1 },
      ],
    }),
    lesson('de', 2, {
      title: 'Le présent et la place du verbe', level: 'Débutant',
      intro: "Le présent est simple ; la difficulté est la place du verbe : toujours en deuxième position dans une phrase déclarative.",
      sections: [
        { heading: 'Terminaisons', body: "Radical + -e, -st, -t, -en, -t, -en : ich wohne, du wohnst, er wohnt, wir wohnen, ihr wohnt, sie wohnen." },
        { heading: 'Verbe en deuxième position', body: "Même si l'on commence par autre chose que le sujet, le verbe reste en 2e position : Heute arbeite ich. (et non « Heute ich arbeite »)." },
        { heading: 'Négation et question', body: "« nicht » après le verbe : ich arbeite nicht. « kein » nie un nom : ich habe keinen Hund. Question oui/non : le verbe passe en tête : Arbeitest du heute?" },
      ],
      phrases: [
        { text: 'Ich wohne in Berlin.', fr: "J'habite à Berlin." },
        { text: 'Heute arbeite ich zu Hause.', fr: "Aujourd'hui, je travaille à la maison." },
        { text: 'Sie trinkt keinen Kaffee.', fr: 'Elle ne boit pas de café.' },
        { text: 'Sprichst du Englisch?', fr: 'Parles-tu anglais ?' },
        { text: 'Wir essen nicht viel.', fr: 'Nous ne mangeons pas beaucoup.' },
      ],
      quiz: [
        { q: 'Phrase correcte :', choices: ['Heute ich arbeite.', 'Heute arbeite ich.', 'Ich heute arbeite.'], answer: 1 },
        { q: 'Complétez : « Er ___ (wohnen) hier. »', choices: ['wohne', 'wohnt', 'wohnen'], answer: 1 },
        { q: 'Négation de « Ich habe einen Hund » :', choices: ['Ich habe nicht Hund.', 'Ich habe keinen Hund.', 'Ich nicht habe Hund.'], answer: 1 },
      ],
    }),
    lesson('de', 3, {
      title: 'Demander et commander', level: 'Débutant',
      intro: 'Des formules polies au café, au restaurant ou dans un magasin.',
      sections: [
        { heading: 'Demander poliment', body: "« Ich möchte… » (je voudrais…) est la formule la plus sûre. Ajoutez « bitte » : « Einen Kaffee, bitte »." },
        { heading: 'Le prix', body: "« Was kostet das? » (singulier), « Was kosten die? » (pluriel). L'addition : « Zahlen, bitte » ou « Die Rechnung, bitte »." },
        { heading: 'Remercier', body: "« Danke » ou « Danke schön ». On répond « Bitte » ou « Gern geschehen »." },
      ],
      phrases: [
        { text: 'Ich möchte einen Kaffee, bitte.', fr: "Je voudrais un café, s'il vous plaît." },
        { text: 'Haben Sie Wasser?', fr: "Avez-vous de l'eau ?" },
        { text: 'Was kostet das?', fr: 'Combien ça coûte ?' },
        { text: 'Die Rechnung, bitte.', fr: "L'addition, s'il vous plaît." },
        { text: 'Danke schön. — Bitte schön.', fr: 'Merci beaucoup. — Je vous en prie.' },
      ],
      quiz: [
        { q: 'Formule polie pour commander :', choices: ['Gib mir Kaffee.', 'Ich möchte einen Kaffee, bitte.', 'Kaffee!'], answer: 1 },
        { q: '« Was kostet das? » signifie…', choices: ['Combien ça coûte ?', "Qu'est-ce que c'est ?", 'Où est-ce ?'], answer: 0 },
        { q: 'Réponse à « Danke » :', choices: ['Bitte', 'Ja', 'Entschuldigung'], answer: 0 },
      ],
    }),
  ],
};

export const deExtra = [
  'rot', 'blau', 'grün', 'gelb', 'schwarz', 'weiß',
  'der Kopf', 'die Hand', 'das Auge', 'das Herz',
  'heute', 'morgen', 'gestern', 'jetzt', 'der Morgen',
  'die Stadt', 'der Weg', 'der Bahnhof', 'das Auto', 'das Geschäft', 'das Krankenhaus',
  'essen', 'trinken', 'gehen', 'kommen', 'sehen', 'sprechen', 'wollen', 'wissen', 'lieben', 'kaufen', 'schlafen', 'arbeiten',
  'groß', 'klein', 'gut', 'neu', 'schön', 'heiß', 'kalt',
  'was', 'wer', 'wo', 'wann', 'warum', 'wie', 'wie viel',
  'ich', 'du', 'er / sie', 'wir', 'ihr', 'sie (pluriel)',
  'die Sonne', 'der Regen', 'der Berg', 'das Meer', 'der Baum',
];

export const deGrammar: Lesson[] = [
  g('de', 1, {
    title: 'Les trois genres et les articles', level: 'Débutant',
    intro: "Trois genres : masculin (der), féminin (die), neutre (das). Il faut apprendre chaque nom avec son article.",
    sections: [
      { heading: 'Défini et indéfini', body: "Défini : der, die, das (pluriel : die). Indéfini : ein, eine, ein (pas de pluriel). Der Hund, die Katze, das Kind, die Kinder." },
      { heading: 'Majuscule', body: "Tous les noms prennent une majuscule : das Haus, die Schule." },
      { heading: 'Indices', body: "Souvent féminins : les noms en -ung, -heit, -keit, -schaft (die Zeitung). Souvent neutres : les diminutifs en -chen et -lein (das Mädchen). Les jours, mois et saisons sont masculins." },
    ],
    phrases: [
      { text: 'Der Mann liest ein Buch.', fr: 'L’homme lit un livre.' },
      { text: 'Die Frau hat eine Katze.', fr: 'La femme a un chat.' },
      { text: 'Das Kind spielt im Garten.', fr: "L'enfant joue dans le jardin." },
      { text: 'Die Kinder sind zu Hause.', fr: 'Les enfants sont à la maison.' },
    ],
    quiz: [
      { q: 'Article de « Katze » :', choices: ['der', 'die', 'das'], answer: 1 },
      { q: 'Article de « Mädchen » (-chen) :', choices: ['die', 'der', 'das'], answer: 2 },
      { q: 'Écriture correcte :', choices: ['das haus', 'das Haus', 'Das haus'], answer: 1 },
    ],
  }),
  g('de', 2, {
    title: 'Les cas : nominatif et accusatif', level: 'Élémentaire',
    intro: "Le cas indique la fonction du nom. Pour commencer, deux cas suffisent : le sujet (nominatif) et le complément d'objet direct (accusatif).",
    sections: [
      { heading: 'Nominatif', body: "Le sujet : der Mann, die Frau, das Kind. Ein Mann, eine Frau, ein Kind." },
      { heading: 'Accusatif', body: "Seul le masculin change : der → den, ein → einen. Ich sehe den Mann. Ich habe einen Hund. Féminin, neutre et pluriel restent identiques." },
      { heading: 'Verbes courants', body: "haben, sehen, kaufen, essen, trinken, brauchen se construisent avec l'accusatif : Ich kaufe einen Tisch." },
    ],
    phrases: [
      { text: 'Ich sehe den Hund.', fr: 'Je vois le chien.' },
      { text: 'Er kauft einen Apfel.', fr: 'Il achète une pomme.' },
      { text: 'Wir haben eine Katze.', fr: 'Nous avons un chat.' },
      { text: 'Sie liest das Buch.', fr: 'Elle lit le livre.' },
    ],
    quiz: [
      { q: 'Complétez : « Ich habe ___ Bruder. »', choices: ['ein', 'einen', 'eine'], answer: 1 },
      { q: 'Accusatif de « die Frau » :', choices: ['die Frau', 'den Frau', 'der Frau'], answer: 0 },
      { q: 'Complétez : « Ich sehe ___ Mann. »', choices: ['der', 'den', 'dem'], answer: 1 },
    ],
  }),
  g('de', 3, {
    title: 'Le Perfekt', level: 'Élémentaire',
    intro: "À l'oral, on raconte le passé surtout avec le Perfekt : auxiliaire (haben ou sein) en 2e position, participe passé à la fin.",
    sections: [
      { heading: 'Formation', body: "haben / sein au présent + participe passé en fin de phrase : Ich habe gegessen. Wir sind nach Hause gegangen." },
      { heading: 'Participes', body: "Verbes faibles : ge- + radical + -t (machen → gemacht). Verbes forts : ge- + radical + -en, souvent avec changement de voyelle (gehen → gegangen, sehen → gesehen)." },
      { heading: 'Haben ou sein ?', body: "Sein avec les verbes de mouvement ou de changement d'état (gehen, kommen, fahren, bleiben, werden). Haben pour presque tous les autres." },
    ],
    phrases: [
      { text: 'Ich habe Brot gekauft.', fr: "J'ai acheté du pain." },
      { text: 'Er ist nach Berlin gefahren.', fr: 'Il est allé à Berlin (en véhicule).' },
      { text: 'Hast du schon gegessen?', fr: 'As-tu déjà mangé ?' },
      { text: 'Wir haben gestern gearbeitet.', fr: 'Nous avons travaillé hier.' },
    ],
    quiz: [
      { q: 'Participe de « machen » :', choices: ['gemacht', 'gemachen', 'machet'], answer: 0 },
      { q: 'Complétez : « Sie ___ nach Hause gegangen. »', choices: ['hat', 'ist', 'wird'], answer: 1 },
      { q: 'Place du participe :', choices: ['2e position', 'à la fin', 'au début'], answer: 1 },
    ],
  }),
  g('de', 4, {
    title: 'Les pronoms et la politesse', level: 'Débutant',
    intro: "Les pronoms personnels et le choix entre tutoiement et vouvoiement.",
    sections: [
      { heading: 'Les pronoms', body: "ich, du, er / sie / es, wir, ihr, sie. « sie » (elle) et « sie » (ils / elles) ne se distinguent que par le verbe : sie geht / sie gehen." },
      { heading: 'Sie (politesse)', body: "« Sie » avec une majuscule désigne une ou plusieurs personnes vouvoyées et s'accorde comme « sie » (ils) : Sprechen Sie Deutsch?" },
      { heading: 'Ihr', body: "« ihr » est le « vous » pluriel familier : Kommt ihr mit?" },
    ],
    phrases: [
      { text: 'Sprechen Sie Englisch?', fr: 'Parlez-vous anglais ?' },
      { text: 'Kommt ihr heute Abend?', fr: 'Venez-vous ce soir ?' },
      { text: 'Sie ist müde.', fr: 'Elle est fatiguée.' },
      { text: 'Sie sind müde.', fr: 'Ils sont fatigués / Vous êtes fatigué.' },
    ],
    quiz: [
      { q: 'Vouvoiement d’un inconnu :', choices: ['du', 'Sie', 'ihr'], answer: 1 },
      { q: '« Ihr » désigne…', choices: ['vous (pluriel familier)', 'elle', 'tu'], answer: 0 },
      { q: 'Complétez : « ___ spricht Deutsch. » (elle)', choices: ['Er', 'Sie', 'Wir'], answer: 1 },
    ],
  }),
];

// ───────────────────────────── Italien ─────────────────────────────
const cIt = conjugator(['io', 'tu', 'lui / lei', 'noi', 'voi', 'loro']);

export const it: Pack = {
  words: words('it', [
    'ciao', 'buongiorno', 'buonasera', 'arrivederci', 'grazie', 'prego', 'scusa', 'sì', 'no', 'per favore',
    'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
    'acqua', 'pane', 'riso', 'pesce', 'carne', 'tè', 'frutta', 'latte',
    'madre', 'padre', 'amico', 'bambino', 'fratello',
    'casa', 'scuola', 'lavoro', 'libro', 'giorno', 'notte', 'cane', 'gatto',
  ]),
  verbs: [
    verb('it', 'essere', 'être', [
      ['Presente', ...cIt(['sono', 'sei', 'è', 'siamo', 'siete', 'sono'])],
      ['Passato prossimo', ...cIt(['sono stato/a', 'sei stato/a', 'è stato/a', 'siamo stati/e', 'siete stati/e', 'sono stati/e'])],
      ['Imperfetto', ...cIt(['ero', 'eri', 'era', 'eravamo', 'eravate', 'erano'])],
      ['Futuro', ...cIt(['sarò', 'sarai', 'sarà', 'saremo', 'sarete', 'saranno'])],
    ], "Auxiliaire de son propre passé composé et des verbes de mouvement."),
    verb('it', 'avere', 'avoir', [
      ['Presente', ...cIt(['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno'])],
      ['Passato prossimo', ...cIt(['ho avuto', 'hai avuto', 'ha avuto', 'abbiamo avuto', 'avete avuto', 'hanno avuto'])],
      ['Imperfetto', ...cIt(['avevo', 'avevi', 'aveva', 'avevamo', 'avevate', 'avevano'])],
      ['Futuro', ...cIt(['avrò', 'avrai', 'avrà', 'avremo', 'avrete', 'avranno'])],
    ], "Le « h » de ho, hai, ha, hanno est muet."),
    verb('it', 'andare', 'aller', [
      ['Presente', ...cIt(['vado', 'vai', 'va', 'andiamo', 'andate', 'vanno'])],
      ['Passato prossimo', ...cIt(['sono andato/a', 'sei andato/a', 'è andato/a', 'siamo andati/e', 'siete andati/e', 'sono andati/e'])],
      ['Imperfetto', ...cIt(['andavo', 'andavi', 'andava', 'andavamo', 'andavate', 'andavano'])],
      ['Futuro', ...cIt(['andrò', 'andrai', 'andrà', 'andremo', 'andrete', 'andranno'])],
    ], "Le participe s'accorde avec le sujet : sono andata (elle)."),
    verb('it', 'mangiare', 'manger', [
      ['Presente', ...cIt(['mangio', 'mangi', 'mangia', 'mangiamo', 'mangiate', 'mangiano'])],
      ['Passato prossimo', ...cIt(['ho mangiato', 'hai mangiato', 'ha mangiato', 'abbiamo mangiato', 'avete mangiato', 'hanno mangiato'])],
      ['Imperfetto', ...cIt(['mangiavo', 'mangiavi', 'mangiava', 'mangiavamo', 'mangiavate', 'mangiavano'])],
      ['Futuro', ...cIt(['mangerò', 'mangerai', 'mangerà', 'mangeremo', 'mangerete', 'mangeranno'])],
    ], 'Verbe en -are régulier. Le i disparaît devant e ou i : mangi, mangerò.'),
  ],
  lessons: [
    lesson('it', 1, {
      title: 'Saluer et se présenter', level: 'Débutant',
      intro: "Les formules de base pour dire bonjour, se présenter et prendre des nouvelles.",
      sections: [
        { heading: 'Saluer', body: "« Ciao » est familier (bonjour et au revoir). « Buongiorno » jusqu'en début d'après-midi, « buonasera » ensuite, « buonanotte » pour dormir. « Arrivederci » pour au revoir poli." },
        { heading: 'Se présenter', body: "« Mi chiamo… » (je m'appelle…) ou « Sono… » (je suis…). Pour répondre : « Piacere » (enchanté)." },
        { heading: 'Prendre des nouvelles', body: "« Come stai? » (tu) ou « Come sta? » (vous). Réponse : « Bene, grazie, e tu? »." },
      ],
      phrases: [
        { text: 'Ciao, mi chiamo Anna.', fr: "Salut, je m'appelle Anna." },
        { text: 'Piacere.', fr: 'Enchanté.' },
        { text: 'Come stai?', fr: 'Comment vas-tu ?' },
        { text: 'Bene, grazie, e tu?', fr: 'Bien, merci, et toi ?' },
        { text: 'Di dove sei?', fr: "D'où viens-tu ?" },
        { text: 'Sono francese.', fr: 'Je suis français(e).' },
      ],
      quiz: [
        { q: 'Salutation polie pour partir :', choices: ['Ciao', 'Arrivederci', 'Prego'], answer: 1 },
        { q: '« Mi chiamo Anna » signifie…', choices: ["Je m'appelle Anna", 'Je viens de Anna', "J'aime Anna"], answer: 0 },
        { q: 'Réponse à « Piacere » :', choices: ['Piacere mio', 'Prego', 'Scusa'], answer: 0 },
      ],
    }),
    lesson('it', 2, {
      title: 'Le présent des verbes en -are, -ere, -ire', level: 'Débutant',
      intro: "Trois familles de verbes. Le pronom sujet est le plus souvent omis.",
      sections: [
        { heading: 'Terminaisons', body: "-are (parlare) : parlo, parli, parla, parliamo, parlate, parlano. -ere (prendere) : prendo, prendi, prende, prendiamo, prendete, prendono. -ire (dormire) : dormo, dormi, dorme, dormiamo, dormite, dormono." },
        { heading: 'Verbes en -isc-', body: "Beaucoup de verbes en -ire intercalent -isc- aux trois personnes du singulier et à la 3e du pluriel : finisco, finisci, finisce, finiamo, finite, finiscono." },
        { heading: 'Négation et question', body: "« non » devant le verbe : non parlo francese. L'intonation fait la question : Parli inglese?" },
      ],
      phrases: [
        { text: 'Parlo un po’ di italiano.', fr: "Je parle un peu d'italien." },
        { text: 'Lei abita a Roma.', fr: 'Elle habite à Rome.' },
        { text: 'Mangiamo pane e frutta.', fr: 'Nous mangeons du pain et des fruits.' },
        { text: 'Non bevo caffè.', fr: 'Je ne bois pas de café.' },
        { text: 'Lavori qui?', fr: 'Travailles-tu ici ?' },
      ],
      quiz: [
        { q: 'Complétez : « Noi ___ (parlare) italiano. »', choices: ['parlo', 'parliamo', 'parlano'], answer: 1 },
        { q: 'Négation correcte :', choices: ['Parlo non italiano.', 'Non parlo italiano.', 'Parlo italiano non.'], answer: 1 },
        { q: '« Finisce » correspond à…', choices: ['lui / lei', 'noi', 'tu'], answer: 0 },
      ],
    }),
    lesson('it', 3, {
      title: 'Demander et commander', level: 'Débutant',
      intro: 'Formules polies pour commander au café ou au restaurant, ou demander un prix.',
      sections: [
        { heading: 'Demander poliment', body: "« Vorrei… » (je voudrais…) est la formule idéale. Plus simple : « Un caffè, per favore »." },
        { heading: 'Le prix', body: "« Quanto costa? » pour un objet, « Quanto costano? » pour plusieurs. L'addition : « Il conto, per favore »." },
        { heading: 'Remercier', body: "« Grazie », « grazie mille ». On répond « prego »." },
      ],
      phrases: [
        { text: 'Vorrei un caffè, per favore.', fr: "Je voudrais un café, s'il vous plaît." },
        { text: 'Avete dell’acqua?', fr: "Avez-vous de l'eau ?" },
        { text: 'Quanto costa?', fr: 'Combien ça coûte ?' },
        { text: 'Il conto, per favore.', fr: "L'addition, s'il vous plaît." },
        { text: 'Grazie mille. — Prego.', fr: 'Merci mille fois. — De rien.' },
      ],
      quiz: [
        { q: 'Pour demander poliment :', choices: ['Dammi un caffè.', 'Vorrei un caffè, per favore.', 'Caffè.'], answer: 1 },
        { q: 'Prix de plusieurs objets :', choices: ['Quanto costa?', 'Quanto costano?', 'Quanti sono?'], answer: 1 },
        { q: 'Réponse à « Grazie » :', choices: ['Prego', 'Ciao', 'Scusa'], answer: 0 },
      ],
    }),
  ],
};

export const itExtra = [
  'rosso', 'blu', 'verde', 'giallo', 'nero', 'bianco',
  'testa', 'mano', 'occhio', 'cuore',
  'oggi', 'domani', 'ieri', 'adesso', 'mattina',
  'città', 'strada', 'stazione', 'macchina', 'negozio', 'ospedale',
  'mangiare', 'bere', 'andare', 'venire', 'vedere', 'parlare', 'volere', 'sapere', 'amare', 'comprare', 'dormire', 'lavorare',
  'grande', 'piccolo', 'buono', 'nuovo', 'bello', 'caldo', 'freddo',
  'che cosa', 'chi', 'dove', 'quando', 'perché', 'come', 'quanto',
  'io', 'tu', 'lui / lei', 'noi', 'voi', 'loro',
  'sole', 'pioggia', 'montagna', 'mare', 'albero',
];

export const itGrammar: Lesson[] = [
  g('it', 1, {
    title: 'Articles, genre et pluriel', level: 'Débutant',
    intro: "Deux genres. L'article change selon le genre, le nombre et le premier son du mot suivant.",
    sections: [
      { heading: 'Articles définis', body: "Masculin : il (il libro), l' devant voyelle (l'amico), lo devant s + consonne, z, gn, ps (lo studente, lo zaino). Féminin : la (la casa), l' devant voyelle (l'amica). Pluriels : i, gli, le." },
      { heading: 'Articles indéfinis', body: "un, uno (devant s + consonne, z), una, un' (devant voyelle) : un libro, uno studente, una casa, un'amica." },
      { heading: 'Pluriel', body: "-o → -i (libro → libri), -a → -e (casa → case), -e → -i (nome → nomi). Les noms en -ca et -ga deviennent -che, -ghe : amica → amiche." },
    ],
    phrases: [
      { text: 'Il libro è sul tavolo.', fr: 'Le livre est sur la table.' },
      { text: 'Ho un’amica a Roma.', fr: "J'ai une amie à Rome." },
      { text: 'Gli studenti sono qui.', fr: 'Les étudiants sont ici.' },
      { text: 'Le case sono grandi.', fr: 'Les maisons sont grandes.' },
    ],
    quiz: [
      { q: 'Article de « studente » :', choices: ['il', 'lo', 'la'], answer: 1 },
      { q: 'Pluriel de « casa » :', choices: ['casi', 'case', 'casas'], answer: 1 },
      { q: 'Pluriel de « amico » :', choices: ['amici', 'amichi', 'amiche'], answer: 0 },
    ],
  }),
  g('it', 2, {
    title: 'Le passato prossimo', level: 'Élémentaire',
    intro: "Le passé composé italien, le temps du récit courant : auxiliaire (avere ou essere) + participe passé.",
    sections: [
      { heading: 'Formation', body: "ho mangiato, hai mangiato… Participes : -are → -ato (parlato), -ere → -uto (venduto), -ire → -ito (dormito). Irréguliers : fatto, detto, visto, preso, scritto." },
      { heading: 'Avere ou essere ?', body: "Essere avec les verbes de mouvement ou de changement d'état (andare, venire, partire, nascere) et les verbes pronominaux : sono andato. Avere pour la plupart des autres." },
      { heading: 'Accord', body: "Avec essere, le participe s'accorde avec le sujet : lei è andata, loro sono andati." },
    ],
    phrases: [
      { text: 'Ieri ho mangiato la pizza.', fr: "Hier, j'ai mangé de la pizza." },
      { text: 'Siamo andati al mare.', fr: 'Nous sommes allés à la mer.' },
      { text: 'Maria è arrivata tardi.', fr: 'Maria est arrivée tard.' },
      { text: 'Hai già mangiato?', fr: 'As-tu déjà mangé ?' },
    ],
    quiz: [
      { q: 'Participe de « parlare » :', choices: ['parlato', 'parluto', 'parlito'], answer: 0 },
      { q: 'Complétez : « Lei ___ andata. »', choices: ['ha', 'è', 'sono'], answer: 1 },
      { q: 'Participe de « fare » :', choices: ['fatto', 'fato', 'fareto'], answer: 0 },
    ],
  }),
  g('it', 3, {
    title: 'Adjectifs et possessifs', level: 'Élémentaire',
    intro: "L'adjectif s'accorde avec le nom et se place le plus souvent après lui.",
    sections: [
      { heading: 'Accord', body: "Les adjectifs en -o ont quatre formes : bello, bella, belli, belle. Ceux en -e en ont deux : grande / grandi." },
      { heading: 'Possessifs', body: "mio, tuo, suo, nostro, vostro, loro, avec l'article : il mio libro, la tua casa. Pour la famille au singulier, pas d'article : mia madre, mio fratello." },
      { heading: 'Comparer', body: "più… di (plus… que), meno… di, come (aussi… que). Irréguliers : migliore (meilleur), peggiore (pire)." },
    ],
    phrases: [
      { text: 'È una casa molto bella.', fr: 'C’est une très belle maison.' },
      { text: 'Il mio amico è simpatico.', fr: 'Mon ami est sympathique.' },
      { text: 'Mia madre abita qui.', fr: 'Ma mère habite ici.' },
      { text: 'Roma è più grande di Firenze.', fr: 'Rome est plus grande que Florence.' },
    ],
    quiz: [
      { q: 'Féminin pluriel de « bello » :', choices: ['belli', 'belle', 'bella'], answer: 1 },
      { q: '« Ma mère » :', choices: ['la mia madre', 'mia madre', 'mia la madre'], answer: 1 },
      { q: 'Plus grand que :', choices: ['più grande di', 'grande più di', 'più grande che'], answer: 0 },
    ],
  }),
  g('it', 4, {
    title: 'Les prépositions articulées', level: 'Élémentaire',
    intro: "En italien, une préposition se soude à l'article défini qui suit.",
    sections: [
      { heading: 'Le principe', body: "di + il = del ; a + il = al ; da + il = dal ; in + il = nel ; su + il = sul. Il libro del ragazzo, vado al mare, siamo nel bar." },
      { heading: 'Toutes les formes', body: "a : al, allo, alla, all', ai, agli, alle. di : del, dello, della, dell', dei, degli, delle. in : nel, nello, nella, nell', nei, negli, nelle." },
      { heading: 'Cas particuliers', body: "Pas d'article avec les noms de villes (a Roma) ni avec in + pays singulier courant (in Francia, in Italia)." },
    ],
    phrases: [
      { text: 'Vado al mercato.', fr: 'Je vais au marché.' },
      { text: 'Il libro è nella borsa.', fr: 'Le livre est dans le sac.' },
      { text: 'Arrivo dalla stazione.', fr: 'J’arrive de la gare.' },
      { text: 'Abito a Roma, in Italia.', fr: "J'habite à Rome, en Italie." },
    ],
    quiz: [
      { q: 'a + il =', choices: ['al', 'allo', 'alla'], answer: 0 },
      { q: 'in + la =', choices: ['nel', 'nella', 'nelle'], answer: 1 },
      { q: 'Ville : « Vado ___ Roma. »', choices: ['a', 'alla', 'in'], answer: 0 },
    ],
  }),
];

// ───────────────────────────── Portugais (Portugal) ─────────────────────────────
const cPt = conjugator(['eu', 'tu', 'ele / ela', 'nós', 'vocês', 'eles']);

export const pt: Pack = {
  words: words('pt', [
    'olá', 'bom dia', 'boa noite', 'adeus', 'obrigado', 'de nada', 'desculpe', 'sim', 'não', 'por favor',
    'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
    'água', 'pão', 'arroz', 'peixe', 'carne', 'chá', 'fruta', 'leite',
    'mãe', 'pai', 'amigo', 'criança', 'irmão',
    'casa', 'escola', 'trabalho', 'livro', 'dia', 'noite', 'cão', 'gato',
  ]),
  verbs: [
    verb('pt', 'ser', 'être (identité, nature)', [
      ['Presente', ...cPt(['sou', 'és', 'é', 'somos', 'são', 'são'])],
      ['Pretérito perfeito', ...cPt(['fui', 'foste', 'foi', 'fomos', 'foram', 'foram'])],
      ['Imperfeito', ...cPt(['era', 'eras', 'era', 'éramos', 'eram', 'eram'])],
      ['Futuro', ...cPt(['serei', 'serás', 'será', 'seremos', 'serão', 'serão'])],
    ], "Irrégulier. « ser » dit ce qu'on est ; « estar » dit où on est ou comment on va. Pour « vocês », les formes sont celles de « eles »."),
    verb('pt', 'ter', 'avoir', [
      ['Presente', ...cPt(['tenho', 'tens', 'tem', 'temos', 'têm', 'têm'])],
      ['Pretérito perfeito', ...cPt(['tive', 'tiveste', 'teve', 'tivemos', 'tiveram', 'tiveram'])],
      ['Imperfeito', ...cPt(['tinha', 'tinhas', 'tinha', 'tínhamos', 'tinham', 'tinham'])],
      ['Futuro', ...cPt(['terei', 'terás', 'terá', 'teremos', 'terão', 'terão'])],
    ], "Au pluriel, « têm » prend un accent circonflexe (« tem » au singulier)."),
    verb('pt', 'ir', 'aller', [
      ['Presente', ...cPt(['vou', 'vais', 'vai', 'vamos', 'vão', 'vão'])],
      ['Pretérito perfeito', ...cPt(['fui', 'foste', 'foi', 'fomos', 'foram', 'foram'])],
      ['Imperfeito', ...cPt(['ia', 'ias', 'ia', 'íamos', 'iam', 'iam'])],
      ['Futuro', ...cPt(['irei', 'irás', 'irá', 'iremos', 'irão', 'irão'])],
    ], "Au pretérito perfeito, « ir » et « ser » ont les mêmes formes : fui."),
    verb('pt', 'comer', 'manger', [
      ['Presente', ...cPt(['como', 'comes', 'come', 'comemos', 'comem', 'comem'])],
      ['Pretérito perfeito', ...cPt(['comi', 'comeste', 'comeu', 'comemos', 'comeram', 'comeram'])],
      ['Imperfeito', ...cPt(['comia', 'comias', 'comia', 'comíamos', 'comiam', 'comiam'])],
      ['Futuro', ...cPt(['comerei', 'comerás', 'comerá', 'comeremos', 'comerão', 'comerão'])],
    ], 'Modèle des verbes réguliers en -er.'),
  ],
  lessons: [
    lesson('pt', 1, {
      title: 'Saluer et se présenter', level: 'Débutant',
      intro: "Les formules de base. Cette langue est étudiée ici dans sa variante européenne (Portugal).",
      sections: [
        { heading: 'Saluer', body: "« Olá » convient partout. « Bom dia » le matin, « boa tarde » l'après-midi, « boa noite » le soir et pour aller dormir." },
        { heading: 'Se présenter', body: "« Chamo-me… » (je m'appelle…) ou « Sou… » (je suis…). Pour répondre : « Muito prazer » ou « Prazer em conhecê-lo »." },
        { heading: 'Prendre des nouvelles', body: "« Como estás? » (tu) ou « Como está? » (vous de politesse). Réponse : « Bem, obrigado / obrigada, e tu? »." },
      ],
      phrases: [
        { text: 'Olá, chamo-me Ana.', fr: "Bonjour, je m'appelle Ana." },
        { text: 'Muito prazer.', fr: 'Enchanté.' },
        { text: 'Como estás?', fr: 'Comment vas-tu ?' },
        { text: 'Bem, obrigada, e tu?', fr: 'Bien, merci, et toi ?' },
        { text: 'De onde és?', fr: "D'où viens-tu ?" },
        { text: 'Sou de França.', fr: 'Je viens de France.' },
      ],
      quiz: [
        { q: 'Que dit-on le matin ?', choices: ['Boa noite', 'Bom dia', 'Adeus'], answer: 1 },
        { q: '« Chamo-me Ana » signifie…', choices: ["Je m'appelle Ana", 'Je viens de Ana', "J'aime Ana"], answer: 0 },
        { q: 'Une femme dit « merci » :', choices: ['obrigado', 'obrigada', 'obrigade'], answer: 1 },
      ],
    }),
    lesson('pt', 2, {
      title: 'Le présent des verbes en -ar, -er, -ir', level: 'Débutant',
      intro: "Trois familles de verbes, trois séries de terminaisons. Le pronom sujet est souvent omis.",
      sections: [
        { heading: 'Terminaisons', body: "-ar (falar) : falo, falas, fala, falamos, falam. -er (comer) : como, comes, come, comemos, comem. -ir (partir) : parto, partes, parte, partimos, partem." },
        { heading: 'Le « vós » est rare', body: "Au Portugal, on dit « vocês » pour le pluriel et le verbe prend la forme de « eles » : vocês falam." },
        { heading: 'Négation et question', body: "« não » devant le verbe : não falo francês. L'intonation suffit pour la question : Falas inglês?" },
      ],
      phrases: [
        { text: 'Falo um pouco de português.', fr: 'Je parle un peu portugais.' },
        { text: 'Ela vive em Lisboa.', fr: 'Elle vit à Lisbonne.' },
        { text: 'Comemos pão e fruta.', fr: 'Nous mangeons du pain et des fruits.' },
        { text: 'Não bebo café.', fr: 'Je ne bois pas de café.' },
        { text: 'Trabalhas aqui?', fr: 'Travailles-tu ici ?' },
      ],
      quiz: [
        { q: 'Complétez : « Nós ___ (comer) pão. »', choices: ['como', 'comemos', 'comem'], answer: 1 },
        { q: 'Négation correcte :', choices: ['Falo não português.', 'Não falo português.', 'Falo português não.'], answer: 1 },
        { q: '« Vocês falam » : le verbe est à la forme de…', choices: ['eles', 'nós', 'tu'], answer: 0 },
      ],
    }),
    lesson('pt', 3, {
      title: 'Demander et commander', level: 'Débutant',
      intro: 'Des formules polies au café, au restaurant ou dans un magasin.',
      sections: [
        { heading: 'Demander poliment', body: "« Queria… » (je voudrais…) ou « Gostaria de… ». Simple : « Um café, por favor »." },
        { heading: 'Le prix', body: "« Quanto custa? » pour un objet, « Quanto custam? » pour plusieurs. L'addition : « A conta, por favor »." },
        { heading: 'Remercier', body: "« Obrigado » (dit par un homme), « obrigada » (par une femme). On répond « de nada »." },
      ],
      phrases: [
        { text: 'Queria um café, por favor.', fr: "Je voudrais un café, s'il vous plaît." },
        { text: 'Tem água?', fr: "Avez-vous de l'eau ?" },
        { text: 'Quanto custa?', fr: 'Combien ça coûte ?' },
        { text: 'A conta, por favor.', fr: "L'addition, s'il vous plaît." },
        { text: 'Muito obrigado. — De nada.', fr: 'Merci beaucoup. — De rien.' },
      ],
      quiz: [
        { q: 'Pour demander poliment :', choices: ['Dá-me um café.', 'Queria um café, por favor.', 'Café.'], answer: 1 },
        { q: 'Prix de plusieurs objets :', choices: ['Quanto custa?', 'Quanto custam?', 'Quantos são?'], answer: 1 },
        { q: 'Réponse à « Obrigado » :', choices: ['De nada', 'Por favor', 'Desculpe'], answer: 0 },
      ],
    }),
  ],
};

export const ptExtra = [
  'vermelho', 'azul', 'verde', 'amarelo', 'preto', 'branco',
  'cabeça', 'mão', 'olho', 'coração',
  'hoje', 'amanhã', 'ontem', 'agora', 'manhã',
  'cidade', 'caminho', 'estação', 'carro', 'loja', 'hospital',
  'comer', 'beber', 'ir', 'vir', 'ver', 'falar', 'querer', 'saber', 'amar', 'comprar', 'dormir', 'trabalhar',
  'grande', 'pequeno', 'bom', 'novo', 'bonito', 'quente', 'frio',
  'o quê', 'quem', 'onde', 'quando', 'porquê', 'como', 'quanto',
  'eu', 'tu', 'ele / ela', 'nós', 'vocês', 'eles',
  'sol', 'chuva', 'montanha', 'mar', 'árvore',
];

export const ptGrammar: Lesson[] = [
  g('pt', 1, {
    title: 'Genre et pluriel des noms', level: 'Débutant',
    intro: "Deux genres. L'article et l'adjectif s'accordent avec le nom.",
    sections: [
      { heading: 'Les articles', body: "Défini : o (masc.), a (fém.), os, as. Indéfini : um, uma, uns, umas. O livro, a casa, os livros, as casas." },
      { heading: 'Deviner le genre', body: "Les noms en -o sont en général masculins, ceux en -a féminins. Les noms en -ção, -dade, -agem sont féminins (a canção, a cidade). Exceptions : o dia, o mapa, a mão." },
      { heading: 'Le pluriel', body: "On ajoute -s après une voyelle (casa → casas). Après -r, -z : -es (mulher → mulheres). Les noms en -ão font -ões, -ães ou -ãos : canção → canções, pão → pães, mão → mãos." },
    ],
    phrases: [
      { text: 'O livro está na mesa.', fr: 'Le livre est sur la table.' },
      { text: 'Tenho uma casa e uns amigos.', fr: "J'ai une maison et des amis." },
      { text: 'As cidades são grandes.', fr: 'Les villes sont grandes.' },
      { text: 'O dia é longo.', fr: 'Le jour est long.' },
    ],
    quiz: [
      { q: 'Article de « casa » :', choices: ['o', 'a', 'os'], answer: 1 },
      { q: 'Pluriel de « pão » :', choices: ['pãos', 'pães', 'pões'], answer: 1 },
      { q: '« Cidade » est…', choices: ['masculin', 'féminin', 'neutre'], answer: 1 },
    ],
  }),
  g('pt', 2, {
    title: 'Ser et estar', level: 'Débutant',
    intro: "Comme en espagnol, deux verbes « être » : le choix dépend de ce qu'on exprime.",
    sections: [
      { heading: 'Ser', body: "Identité, origine, profession, caractère, heure : sou francês, ele é médico, é alto, são três horas." },
      { heading: 'Estar', body: "Lieu et état temporaire : estou em casa, está cansado. Au Portugal, estar a + infinitif exprime l'action en cours : estou a comer." },
      { heading: 'Le sens change', body: "Ele é chato = il est ennuyeux ; ele está chato = il est pénible en ce moment. Distinguer le permanent du transitoire aide à choisir." },
    ],
    phrases: [
      { text: 'Sou estudante.', fr: 'Je suis étudiant.' },
      { text: 'Estou no trabalho.', fr: 'Je suis au travail.' },
      { text: 'A sopa está quente.', fr: 'La soupe est chaude.' },
      { text: 'Estou a ler um livro.', fr: 'Je suis en train de lire un livre.' },
    ],
    quiz: [
      { q: 'Complétez : « Ela ___ médica. »', choices: ['está', 'é', 'estás'], answer: 1 },
      { q: 'Complétez : « Estou ___ casa. » (lieu)', choices: ['ser', 'em', 'é'], answer: 1 },
      { q: '« Estou a comer » signifie…', choices: ['je mange (en ce moment)', 'je mangerai', 'j’ai mangé'], answer: 0 },
    ],
  }),
  g('pt', 3, {
    title: "L'accord de l'adjectif", level: 'Élémentaire',
    intro: "L'adjectif s'accorde en genre et en nombre et se place le plus souvent après le nom.",
    sections: [
      { heading: 'Accord', body: "Adjectifs en -o : bom, boa, bons, boas… (bonito, bonita, bonitos, bonitas). Ceux en -e ou en consonne : grande / grandes, fácil / fáceis." },
      { heading: 'Place', body: "Après le nom : uma casa grande. Quelques adjectifs courts avant : um bom dia, um grande amigo." },
      { heading: 'Comparer', body: "mais… (do) que, menos… (do) que, tão… como. Irréguliers : melhor (meilleur), pior (pire)." },
    ],
    phrases: [
      { text: 'É uma casa muito bonita.', fr: 'C’est une très jolie maison.' },
      { text: 'Os carros são novos.', fr: 'Les voitures sont neuves.' },
      { text: 'Este livro é melhor do que aquele.', fr: 'Ce livre est meilleur que celui-là.' },
      { text: 'Hoje é um bom dia.', fr: "Aujourd'hui est un bon jour." },
    ],
    quiz: [
      { q: 'Féminin pluriel de « bonito » :', choices: ['bonitos', 'bonitas', 'bonites'], answer: 1 },
      { q: 'Meilleur :', choices: ['mais bom', 'melhor', 'bom mais'], answer: 1 },
      { q: 'Pluriel de « fácil » :', choices: ['fáceis', 'fácils', 'fácis'], answer: 0 },
    ],
  }),
  g('pt', 4, {
    title: 'Le passé : perfeito et imperfeito', level: 'Élémentaire',
    intro: "Deux passés simples à distinguer : l'action terminée et l'habitude ou la description.",
    sections: [
      { heading: 'Pretérito perfeito', body: "Action terminée à un moment précis : ontem comi peixe. Terminaisons -ar : -ei, -aste, -ou, -ámos, -aram ; -er : -i, -este, -eu, -emos, -eram." },
      { heading: 'Pretérito imperfeito', body: "Habitude, description, action en cours dans le passé : quando era criança, comia muito pão. Terminaisons -ar : -ava, -avas, -ava, -ávamos, -avam ; -er / -ir : -ia, -ias, -ia, -íamos, -iam." },
      { heading: 'Irréguliers', body: "Seulement quatre verbes à l'imparfait : ser (era), ter (tinha), vir (vinha), pôr (punha). Les autres sont réguliers." },
    ],
    phrases: [
      { text: 'Ontem falei com a minha mãe.', fr: 'Hier, j’ai parlé avec ma mère.' },
      { text: 'Quando era criança, vivia em Lisboa.', fr: 'Quand j’étais enfant, je vivais à Lisbonne.' },
      { text: 'Comemos num restaurante.', fr: 'Nous avons mangé dans un restaurant.' },
      { text: 'Ele tinha um cão.', fr: 'Il avait un chien.' },
    ],
    quiz: [
      { q: 'Perfeito de « falar » (eu) :', choices: ['falei', 'falava', 'falo'], answer: 0 },
      { q: 'Pour une habitude passée :', choices: ['perfeito', 'imperfeito', 'futuro'], answer: 1 },
      { q: 'Imperfeito de « ser » (eu) :', choices: ['fui', 'era', 'sou'], answer: 1 },
    ],
  }),
];
