import type { Pack } from '../types';
import { words, verb, lesson } from './concepts';

const P = ['I', 'you', 'he / she', 'we', 'you (pl.)', 'they'];
const conj = (forms: string[]) => forms.map((f, i) => `${P[i]}=${f}`);

export const en: Pack = {
  words: words('en', [
    'hello', 'good morning', 'good evening', 'goodbye', 'thank you', "you're welcome", 'sorry', 'yes', 'no', 'please',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'water', 'bread', 'rice', 'fish', 'meat', 'tea', 'fruit', 'milk',
    'mother', 'father', 'friend', 'child', 'brother',
    'house', 'school', 'work', 'book', 'day', 'night', 'dog', 'cat',
  ]),
  verbs: [
    verb('en', 'to be', 'être', [
      ['Présent', ...conj(['am', 'are', 'is', 'are', 'are', 'are'])],
      ['Prétérit', ...conj(['was', 'were', 'was', 'were', 'were', 'were'])],
      ['Futur', ...conj(['will be', 'will be', 'will be', 'will be', 'will be', 'will be'])],
      ['Present perfect', ...conj(['have been', 'have been', 'has been', 'have been', 'have been', 'have been'])],
    ], 'Verbe irrégulier, le seul à avoir trois formes au présent.'),
    verb('en', 'to have', 'avoir', [
      ['Présent', ...conj(['have', 'have', 'has', 'have', 'have', 'have'])],
      ['Prétérit', ...conj(['had', 'had', 'had', 'had', 'had', 'had'])],
      ['Futur', ...conj(['will have', 'will have', 'will have', 'will have', 'will have', 'will have'])],
      ['Present perfect', ...conj(['have had', 'have had', 'has had', 'have had', 'have had', 'have had'])],
    ]),
    verb('en', 'to go', 'aller', [
      ['Présent', ...conj(['go', 'go', 'goes', 'go', 'go', 'go'])],
      ['Prétérit', ...conj(['went', 'went', 'went', 'went', 'went', 'went'])],
      ['Futur', ...conj(['will go', 'will go', 'will go', 'will go', 'will go', 'will go'])],
      ['Present perfect', ...conj(['have gone', 'have gone', 'has gone', 'have gone', 'have gone', 'have gone'])],
    ], 'Irrégulier : go / went / gone.'),
    verb('en', 'to eat', 'manger', [
      ['Présent', ...conj(['eat', 'eat', 'eats', 'eat', 'eat', 'eat'])],
      ['Prétérit', ...conj(['ate', 'ate', 'ate', 'ate', 'ate', 'ate'])],
      ['Futur', ...conj(['will eat', 'will eat', 'will eat', 'will eat', 'will eat', 'will eat'])],
      ['Present perfect', ...conj(['have eaten', 'have eaten', 'has eaten', 'have eaten', 'have eaten', 'have eaten'])],
    ], 'Irrégulier : eat / ate / eaten.'),
  ],
  lessons: [
    lesson('en', 1, {
      title: 'Saluer et se présenter', level: 'Débutant',
      intro: "Les premières phrases pour entrer en contact : dire bonjour, donner son nom et demander comment va l'autre.",
      sections: [
        { heading: 'Saluer', body: "« Hello » convient partout. « Hi » est plus familier. « Good morning » se dit jusqu'à midi, « good afternoon » l'après-midi et « good evening » le soir. « Good night » sert seulement à se quitter avant d'aller dormir." },
        { heading: 'Se présenter', body: "On dit « My name is… » ou, plus simplement, « I'm… ». Pour répondre à une présentation : « Nice to meet you »." },
        { heading: 'Demander des nouvelles', body: "« How are you? » appelle une réponse courte : « I'm fine, thank you. And you? »." },
      ],
      phrases: [
        { text: 'Hello, my name is Anna.', fr: "Bonjour, je m'appelle Anna." },
        { text: 'Nice to meet you.', fr: 'Enchanté.' },
        { text: 'How are you?', fr: 'Comment allez-vous ?' },
        { text: "I'm fine, thank you. And you?", fr: 'Je vais bien, merci. Et vous ?' },
        { text: 'Where are you from?', fr: "D'où venez-vous ?" },
        { text: "I'm from France.", fr: 'Je viens de France.' },
      ],
      quiz: [
        { q: 'Quelle salutation utilise-t-on le matin ?', choices: ['Good night', 'Good morning', 'Good evening'], answer: 1 },
        { q: 'Que répondre à « Nice to meet you » ?', choices: ['Nice to meet you too.', "I'm from France.", 'Good night.'], answer: 0 },
        { q: '« Good night » sert à…', choices: ['saluer en arrivant le soir', 'se quitter avant de dormir', 'remercier'], answer: 1 },
      ],
    }),
    lesson('en', 2, {
      title: 'Le présent simple', level: 'Débutant',
      intro: "Le présent simple décrit les habitudes et les faits généraux. Sa seule difficulté : le -s à la troisième personne du singulier.",
      sections: [
        { heading: 'Formation', body: "On utilise la base verbale à toutes les personnes, sauf avec he / she / it où l'on ajoute -s : I work, she works." },
        { heading: 'Négation', body: "On emploie « do not » (don't) ou « does not » (doesn't) suivi de la base verbale : I don't work, he doesn't work. Le -s passe sur « does »." },
        { heading: 'Question', body: "« Do » ou « does » se place en tête : Do you work? Does she work?" },
      ],
      phrases: [
        { text: 'I drink tea every morning.', fr: 'Je bois du thé tous les matins.' },
        { text: 'She works in a school.', fr: 'Elle travaille dans une école.' },
        { text: "We don't eat meat.", fr: 'Nous ne mangeons pas de viande.' },
        { text: 'Do you speak English?', fr: 'Parlez-vous anglais ?' },
        { text: "He doesn't have a dog.", fr: "Il n'a pas de chien." },
      ],
      quiz: [
        { q: 'Complétez : « She ___ in Paris. »', choices: ['live', 'lives', 'living'], answer: 1 },
        { q: 'Forme négative correcte :', choices: ["He don't work.", "He doesn't works.", "He doesn't work."], answer: 2 },
        { q: 'Question correcte :', choices: ['Do you like tea?', 'Like you tea?', 'Does you like tea?'], answer: 0 },
      ],
    }),
    lesson('en', 3, {
      title: 'Demander et commander', level: 'Débutant',
      intro: 'Des formules polies pour demander quelque chose au café, au restaurant ou dans un magasin.',
      sections: [
        { heading: 'Demander poliment', body: "« I would like… » (I'd like…) est la formule la plus sûre. « Can I have…? » est courant et un peu plus direct. On termine par « please »." },
        { heading: 'Le prix', body: "« How much is it? » pour un objet, « How much are they? » pour plusieurs." },
        { heading: 'Remercier', body: "« Thank you » ou « Thanks ». On répond « You're welcome »." },
      ],
      phrases: [
        { text: "I'd like a coffee, please.", fr: "Je voudrais un café, s'il vous plaît." },
        { text: 'Can I have some water?', fr: "Puis-je avoir de l'eau ?" },
        { text: 'How much is it?', fr: 'Combien ça coûte ?' },
        { text: 'The bill, please.', fr: "L'addition, s'il vous plaît." },
        { text: "Thank you. — You're welcome.", fr: 'Merci. — De rien.' },
      ],
      quiz: [
        { q: 'La formule la plus polie :', choices: ['Give me a coffee.', "I'd like a coffee, please.", 'Coffee.'], answer: 1 },
        { q: 'Pour demander le prix de plusieurs objets :', choices: ['How much is it?', 'How much are they?', 'How many is it?'], answer: 1 },
        { q: 'Réponse à « Thank you » :', choices: ["You're welcome.", 'Please.', 'Sorry.'], answer: 0 },
      ],
    }),
  ],
};
