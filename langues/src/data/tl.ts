import type { Pack } from '../types';
import { words, verb, lesson } from './concepts';

const asp = (inf: string, done: string, doing: string, will: string, obj = ''): [string, ...string[]][] => [
  ['Aspects', `infinitif=${inf}`, `accompli=${done}`, `inaccompli=${doing}`, `contemplé (futur)=${will}`],
  ['En phrase', `j'ai…=${cap(done)} ako${obj}`, `je suis en train de…=${cap(doing)} ako${obj}`, `je vais…=${cap(will)} ako${obj}`],
];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export const tl: Pack = {
  words: words('tl', [
    'kumusta', 'magandang umaga', 'magandang gabi', 'paalam', 'salamat', 'walang anuman', 'pasensya na', 'oo', 'hindi', 'pakiusap',
    'isa', 'dalawa', 'tatlo', 'apat', 'lima', 'anim', 'pito', 'walo', 'siyam', 'sampu',
    'tubig', 'tinapay', 'kanin', 'isda', 'karne', 'tsaa', 'prutas', 'gatas',
    'nanay', 'tatay', 'kaibigan', 'bata', 'kuya|grand frère',
    'bahay', 'paaralan', 'trabaho', 'aklat', 'araw', 'gabi', 'aso', 'pusa',
  ]),
  verbs: [
    verb('tl', 'kumain', 'manger', asp('kumain', 'kumain', 'kumakain', 'kakain', ' ng kanin'),
      "Verbe en -um-. Le tagalog ne marque pas le temps mais l'aspect : action accomplie, en cours ou envisagée. La forme ne change pas selon la personne."),
    verb('tl', 'uminom', 'boire', asp('uminom', 'uminom', 'umiinom', 'iinom', ' ng tubig'), 'Verbe en -um-.'),
    verb('tl', 'pumunta', 'aller', asp('pumunta', 'pumunta', 'pumupunta', 'pupunta', ' sa paaralan'), 'Verbe en -um-.'),
    verb('tl', 'mag-aral', 'étudier', asp('mag-aral', 'nag-aral', 'nag-aaral', 'mag-aaral', ' ng Tagalog'),
      'Verbe en mag- : le préfixe devient nag- pour les actions commencées.'),
  ],
  lessons: [
    lesson('tl', 1, {
      title: 'Saluer et la politesse', level: 'Débutant',
      intro: 'Les salutations tagalog reposent sur « maganda » (beau) et sur la particule de respect « po ».',
      sections: [
        { heading: 'Saluer', body: "« Kumusta? » sert à la fois de bonjour et de « comment ça va ? ». Selon l'heure : magandang umaga (matin), magandang hapon (après-midi), magandang gabi (soir)." },
        { heading: 'Po et opo', body: "« Po » s'ajoute à la phrase pour marquer le respect envers un aîné ou un inconnu : Salamat po. « Opo » est le « oui » respectueux, « oo » le « oui » ordinaire." },
        { heading: 'Se présenter', body: "« Ako si… » : je suis… « Ano ang pangalan mo? » : comment t'appelles-tu ?" },
      ],
      phrases: [
        { text: 'Kumusta ka?', fr: 'Comment vas-tu ?' },
        { text: 'Mabuti, salamat.', fr: 'Bien, merci.' },
        { text: 'Magandang umaga po.', fr: 'Bonjour (le matin, forme respectueuse).' },
        { text: 'Ako si Anna.', fr: 'Je suis Anna.' },
        { text: 'Ano ang pangalan mo?', fr: "Comment t'appelles-tu ?" },
        { text: 'Salamat po.', fr: 'Merci (respectueux).' },
      ],
      quiz: [
        { q: 'À quoi sert « po » ?', choices: ['À poser une question', 'À marquer le respect', 'À dire non'], answer: 1 },
        { q: 'Le « oui » respectueux :', choices: ['oo', 'opo', 'hindi'], answer: 1 },
        { q: '« Magandang gabi » se dit…', choices: ['le matin', "l'après-midi", 'le soir'], answer: 2 },
      ],
    }),
    lesson('tl', 2, {
      title: 'La phrase et les marqueurs', level: 'Débutant',
      intro: "En tagalog le verbe ou l'attribut vient en premier, et de petits mots indiquent le rôle des noms.",
      sections: [
        { heading: 'Le prédicat en tête', body: "Maganda ang bahay : « belle – la maison », c'est-à-dire « la maison est belle ». Il n'y a pas de verbe « être »." },
        { heading: 'Ang, ng, sa', body: "« ang » marque le sujet de la phrase. « ng » (prononcé « nang ») marque l'objet ou le possesseur. « sa » marque le lieu ou la direction." },
        { heading: 'Les noms de personnes', body: "Devant un prénom, « ang » devient « si » et « ng » devient « ni » : Kumain si Anna." },
      ],
      phrases: [
        { text: 'Maganda ang bahay.', fr: 'La maison est belle.' },
        { text: 'Kumain ang bata ng kanin.', fr: "L'enfant a mangé du riz." },
        { text: 'Pumunta ako sa paaralan.', fr: "Je suis allé à l'école." },
        { text: 'Kumain si Anna.', fr: 'Anna a mangé.' },
      ],
      quiz: [
        { q: 'Quel élément vient en premier dans la phrase ?', choices: ['Le sujet', 'Le prédicat (verbe ou attribut)', 'Le lieu'], answer: 1 },
        { q: 'Quel marqueur indique le lieu ?', choices: ['ang', 'ng', 'sa'], answer: 2 },
        { q: 'Devant un prénom, « ang » devient…', choices: ['si', 'ni', 'sa'], answer: 0 },
      ],
    }),
    lesson('tl', 3, {
      title: 'Les pronoms personnels', level: 'Débutant',
      intro: 'Les pronoms sujets, et la distinction entre le « nous » qui inclut l’interlocuteur et celui qui l’exclut.',
      sections: [
        { heading: 'Singulier', body: "ako (je), ikaw ou ka (tu), siya (il ou elle : le tagalog ne distingue pas le genre)." },
        { heading: 'Pluriel', body: "tayo (nous, toi compris), kami (nous, sans toi), kayo (vous), sila (ils, elles)." },
        { heading: 'Ka ou ikaw ?', body: "« ikaw » s'emploie en début de phrase, « ka » après le prédicat : Ikaw ba? / Kumain ka na ba?" },
      ],
      phrases: [
        { text: 'Estudyante ako.', fr: 'Je suis étudiant(e).' },
        { text: 'Kumain ka na ba?', fr: 'As-tu déjà mangé ?' },
        { text: 'Kaibigan ko siya.', fr: "C'est mon ami(e)." },
        { text: 'Pupunta tayo sa bahay.', fr: 'Nous allons (toi et moi) à la maison.' },
      ],
      quiz: [
        { q: '« Nous » en incluant la personne à qui l’on parle :', choices: ['kami', 'tayo', 'sila'], answer: 1 },
        { q: '« siya » signifie…', choices: ['il seulement', 'elle seulement', 'il ou elle'], answer: 2 },
        { q: 'Quelle forme de « tu » suit le prédicat ?', choices: ['ikaw', 'ka', 'kayo'], answer: 1 },
      ],
    }),
  ],
};
