import type { Pack } from '../types';
import { words, verb, lesson } from './concepts';

const P = ['aš', 'tu', 'jis / ji', 'mes', 'jūs', 'jie / jos'];
const conj = (forms: string[]) => forms.map((f, i) => `${P[i]}=${f}`);

export const lt: Pack = {
  words: words('lt', [
    'laba diena', 'labas rytas', 'labas vakaras', 'viso gero', 'ačiū', 'nėra už ką', 'atsiprašau', 'taip', 'ne', 'prašau',
    'vienas', 'du', 'trys', 'keturi', 'penki', 'šeši', 'septyni', 'aštuoni', 'devyni', 'dešimt',
    'vanduo', 'duona', 'ryžiai', 'žuvis', 'mėsa', 'arbata', 'vaisius', 'pienas',
    'motina', 'tėvas', 'draugas', 'vaikas', 'brolis',
    'namas', 'mokykla', 'darbas', 'knyga', 'diena', 'naktis', 'šuo', 'katė',
  ]),
  verbs: [
    verb('lt', 'būti', 'être', [
      ['Présent', ...conj(['esu', 'esi', 'yra', 'esame', 'esate', 'yra'])],
      ['Passé', ...conj(['buvau', 'buvai', 'buvo', 'buvome', 'buvote', 'buvo'])],
      ['Futur', ...conj(['būsiu', 'būsi', 'bus', 'būsime', 'būsite', 'bus'])],
    ], 'Verbe irrégulier. La 3e personne est identique au singulier et au pluriel, comme pour tous les verbes lituaniens.'),
    verb('lt', 'turėti', 'avoir', [
      ['Présent', ...conj(['turiu', 'turi', 'turi', 'turime', 'turite', 'turi'])],
      ['Passé', ...conj(['turėjau', 'turėjai', 'turėjo', 'turėjome', 'turėjote', 'turėjo'])],
      ['Futur', ...conj(['turėsiu', 'turėsi', 'turės', 'turėsime', 'turėsite', 'turės'])],
    ]),
    verb('lt', 'kalbėti', 'parler', [
      ['Présent', ...conj(['kalbu', 'kalbi', 'kalba', 'kalbame', 'kalbate', 'kalba'])],
      ['Passé', ...conj(['kalbėjau', 'kalbėjai', 'kalbėjo', 'kalbėjome', 'kalbėjote', 'kalbėjo'])],
      ['Futur', ...conj(['kalbėsiu', 'kalbėsi', 'kalbės', 'kalbėsime', 'kalbėsite', 'kalbės'])],
    ]),
    verb('lt', 'eiti', 'aller (à pied)', [
      ['Présent', ...conj(['einu', 'eini', 'eina', 'einame', 'einate', 'eina'])],
      ['Passé', ...conj(['ėjau', 'ėjai', 'ėjo', 'ėjome', 'ėjote', 'ėjo'])],
      ['Futur', ...conj(['eisiu', 'eisi', 'eis', 'eisime', 'eisite', 'eis'])],
    ]),
  ],
  lessons: [
    lesson('lt', 1, {
      title: "L'alphabet et la prononciation", level: 'Débutant',
      intro: "Le lituanien s'écrit avec 32 lettres latines et se lit presque comme il s'écrit. Quelques lettres portent des signes particuliers.",
      sections: [
        { heading: 'Les chuintantes', body: "č se prononce « tch », š « ch », ž « j » comme dans « jour ». Exemples : ačiū (merci), šuo (chien), žuvis (poisson)." },
        { heading: 'Les voyelles longues', body: "ą, ę, į, ų portent une « queue » et se prononcent longues. ė est un « é » long et fermé, ū un « ou » long, y un « i » long." },
        { heading: 'Autres repères', body: "j se prononce comme le « y » de « yoga ». c se prononce « ts ». Le r est roulé. L'accent tonique est mobile et s'apprend avec chaque mot." },
      ],
      phrases: [
        { text: 'ačiū', fr: 'merci (č = tch)' },
        { text: 'šuo', fr: 'chien (š = ch)' },
        { text: 'žuvis', fr: 'poisson (ž = j)' },
        { text: 'katė', fr: 'chat (ė = é long)' },
        { text: 'jūs', fr: 'vous (j = y, ū = ou long)' },
      ],
      quiz: [
        { q: 'Comment se prononce š ?', choices: ['s', 'ch', 'tch'], answer: 1 },
        { q: 'La lettre j se prononce comme…', choices: ['le j de « jour »', 'le y de « yoga »', 'le g de « gare »'], answer: 1 },
        { q: 'Combien de lettres compte l’alphabet lituanien ?', choices: ['26', '32', '40'], answer: 1 },
      ],
    }),
    lesson('lt', 2, {
      title: 'Saluer et se présenter', level: 'Débutant',
      intro: 'Les formules courantes pour dire bonjour et se présenter.',
      sections: [
        { heading: 'Saluer', body: "« Labas » est familier (salut). « Laba diena » est le bonjour standard de la journée, « labas rytas » se dit le matin et « labas vakaras » le soir." },
        { heading: 'Se présenter', body: "« Mano vardas… » signifie « mon prénom est… ». On peut aussi dire « Aš esu… » (je suis…). Enchanté : « Malonu susipažinti »." },
        { heading: 'Se quitter', body: "« Viso gero » (au revoir) ou « iki » (à bientôt, familier)." },
      ],
      phrases: [
        { text: 'Laba diena!', fr: 'Bonjour !' },
        { text: 'Mano vardas Ana.', fr: 'Je m’appelle Ana.' },
        { text: 'Malonu susipažinti.', fr: 'Enchanté.' },
        { text: 'Kaip sekasi?', fr: 'Comment ça va ?' },
        { text: 'Gerai, ačiū.', fr: 'Bien, merci.' },
        { text: 'Aš esu iš Prancūzijos.', fr: 'Je viens de France.' },
      ],
      quiz: [
        { q: 'Quelle salutation est familière ?', choices: ['Laba diena', 'Labas', 'Labas vakaras'], answer: 1 },
        { q: '« Mano vardas… » signifie…', choices: ['Je viens de…', 'Mon prénom est…', 'Comment ça va ?'], answer: 1 },
        { q: 'Pour dire au revoir :', choices: ['Viso gero', 'Ačiū', 'Prašau'], answer: 0 },
      ],
    }),
    lesson('lt', 3, {
      title: 'Les cas : première approche', level: 'Débutant',
      intro: "En lituanien, la terminaison d'un nom change selon son rôle dans la phrase. Il existe sept cas ; voici les trois premiers à connaître.",
      sections: [
        { heading: 'Nominatif : le sujet', body: "C'est la forme du dictionnaire. Draugas kalba : l'ami parle." },
        { heading: 'Accusatif : le complément direct', body: "La terminaison change : draugas → draugą, knyga → knygą. Aš turiu knygą : j'ai un livre." },
        { heading: 'Génitif : possession et négation', body: "draugas → draugo, knyga → knygos. Draugo knyga : le livre de l'ami. Après une négation, l'objet passe au génitif : Aš neturiu knygos (je n'ai pas de livre)." },
      ],
      phrases: [
        { text: 'Aš turiu knygą.', fr: "J'ai un livre." },
        { text: 'Aš neturiu knygos.', fr: "Je n'ai pas de livre." },
        { text: 'Draugo namas.', fr: "La maison de l'ami." },
        { text: 'Aš geriu vandenį.', fr: "Je bois de l'eau." },
      ],
      quiz: [
        { q: 'Combien de cas possède le lituanien ?', choices: ['4', '6', '7'], answer: 2 },
        { q: 'Accusatif de « knyga » :', choices: ['knygos', 'knygą', 'knyga'], answer: 1 },
        { q: 'Après une négation, l’objet se met au…', choices: ['nominatif', 'accusatif', 'génitif'], answer: 2 },
      ],
    }),
  ],
};
