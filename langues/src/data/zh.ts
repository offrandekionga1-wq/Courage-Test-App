import type { Pack } from '../types';
import { words, verb, lesson } from './concepts';

const aspects = (v: string, p: string, neg = `我不${v}|wǒ bù ${p}`, negPast = `我没${v}|wǒ méi ${p}`): [string, ...string[]][] => [
  ['Affirmation et négation', `affirmatif=我${v}|wǒ ${p}`, `négatif=${neg}`, `question=你${v}吗？|nǐ ${p} ma?`],
  ['Aspects', `accompli (了)=我${v}了|wǒ ${p} le`, `expérience (过)=我${v}过|wǒ ${p} guo`, `en cours (在)=我在${v}|wǒ zài ${p}`, `non accompli (没)=${negPast}`],
  ['Futur et intention', `futur (会)=我会${v}|wǒ huì ${p}`, `intention (要)=我要${v}|wǒ yào ${p}`],
];

export const zh: Pack = {
  words: words('zh', [
    '你好|nǐ hǎo', '早上好|zǎoshang hǎo', '晚上好|wǎnshang hǎo', '再见|zàijiàn', '谢谢|xièxie',
    '不客气|bú kèqi', '对不起|duìbuqǐ', '是|shì', '不|bù', '请|qǐng',
    '一|yī', '二|èr', '三|sān', '四|sì', '五|wǔ', '六|liù', '七|qī', '八|bā', '九|jiǔ', '十|shí',
    '水|shuǐ', '面包|miànbāo', '米饭|mǐfàn', '鱼|yú', '肉|ròu', '茶|chá', '水果|shuǐguǒ', '牛奶|niúnǎi',
    '妈妈|māma', '爸爸|bàba', '朋友|péngyou', '孩子|háizi', '哥哥|gēge (grand frère)',
    '家|jiā', '学校|xuéxiào', '工作|gōngzuò', '书|shū', '天|tiān', '夜晚|yèwǎn', '狗|gǒu', '猫|māo',
  ]),
  verbs: [
    verb('zh', '吃|chī', 'manger', aspects('吃', 'chī'),
      "Le verbe chinois ne se conjugue pas : il garde la même forme à toutes les personnes. Le temps s'exprime par des particules (了, 过) et des adverbes."),
    verb('zh', '去|qù', 'aller', aspects('去', 'qù')),
    verb('zh', '看|kàn', 'regarder, lire', aspects('看', 'kàn')),
    verb('zh', '有|yǒu', 'avoir', [
      ['Affirmation et négation', 'affirmatif=我有|wǒ yǒu', 'négatif=我没有|wǒ méiyǒu', 'question=你有吗？|nǐ yǒu ma?', 'question (有没有)=你有没有？|nǐ yǒu méiyǒu?'],
      ['Aspects', 'expérience (过)=我有过|wǒ yǒu guo'],
      ['Futur', 'futur (会)=我会有|wǒ huì yǒu'],
    ], '有 est le seul verbe dont la négation se fait avec 没 et jamais avec 不.'),
  ],
  lessons: [
    lesson('zh', 1, {
      title: 'Les tons et le pinyin', level: 'Débutant',
      intro: "Le mandarin est une langue à tons : la mélodie d'une syllabe change le sens du mot. Le pinyin est la transcription en lettres latines qui note ces tons.",
      sections: [
        { heading: 'Les quatre tons', body: "1er ton, haut et plat : mā (妈, maman). 2e ton, montant : má (麻, chanvre). 3e ton, descendant puis montant : mǎ (马, cheval). 4e ton, descendant et bref : mà (骂, gronder)." },
        { heading: 'Le ton neutre', body: "Certaines syllabes se prononcent sans ton, légères et courtes : la particule interrogative 吗 (ma)." },
        { heading: 'Changements de ton', body: "Deux 3es tons qui se suivent : le premier devient un 2e ton. 你好 s'écrit nǐ hǎo mais se prononce « ní hǎo ». 不 (bù) passe au 2e ton devant un 4e ton : 不是 bú shì." },
      ],
      phrases: [
        { text: '妈', reading: 'mā', fr: 'maman (1er ton)' },
        { text: '麻', reading: 'má', fr: 'chanvre (2e ton)' },
        { text: '马', reading: 'mǎ', fr: 'cheval (3e ton)' },
        { text: '骂', reading: 'mà', fr: 'gronder (4e ton)' },
        { text: '你好', reading: 'nǐ hǎo', fr: 'bonjour' },
      ],
      quiz: [
        { q: 'Combien de tons principaux compte le mandarin ?', choices: ['2', '4', '6'], answer: 1 },
        { q: '« mǎ » au 3e ton signifie…', choices: ['maman', 'cheval', 'gronder'], answer: 1 },
        { q: 'Comment se prononce 你好 ?', choices: ['nǐ hǎo', 'ní hǎo', 'nì hào'], answer: 1 },
      ],
    }),
    lesson('zh', 2, {
      title: 'Saluer et se présenter', level: 'Débutant',
      intro: 'Les phrases indispensables pour une première rencontre.',
      sections: [
        { heading: 'Saluer', body: "你好 (nǐ hǎo) convient à tout moment. 您好 (nín hǎo) est la forme respectueuse. Le matin : 早上好." },
        { heading: 'Dire son nom', body: "我叫… (wǒ jiào…) signifie « je m'appelle… ». Pour demander : 你叫什么名字？" },
        { heading: 'La nationalité', body: "我是法国人 (wǒ shì Fǎguó rén) : « je suis français ». 人 (rén, personne) suit le nom du pays." },
      ],
      phrases: [
        { text: '你好！', reading: 'nǐ hǎo', fr: 'Bonjour !' },
        { text: '我叫安娜。', reading: 'wǒ jiào Ānnà', fr: "Je m'appelle Anna." },
        { text: '你叫什么名字？', reading: 'nǐ jiào shénme míngzi?', fr: 'Comment tu t’appelles ?' },
        { text: '我是法国人。', reading: 'wǒ shì Fǎguó rén', fr: 'Je suis français(e).' },
        { text: '很高兴认识你。', reading: 'hěn gāoxìng rènshi nǐ', fr: 'Ravi de te connaître.' },
      ],
      quiz: [
        { q: 'Que signifie 我叫… ?', choices: ['Je suis…', "Je m'appelle…", "J'ai…"], answer: 1 },
        { q: 'Forme respectueuse de 你好 :', choices: ['您好', '再见', '谢谢'], answer: 0 },
        { q: 'Dans 法国人, que signifie 人 ?', choices: ['pays', 'langue', 'personne'], answer: 2 },
      ],
    }),
    lesson('zh', 3, {
      title: 'La phrase simple', level: 'Débutant',
      intro: "La phrase chinoise suit l'ordre sujet – verbe – objet, comme en français, et le verbe ne change jamais de forme.",
      sections: [
        { heading: 'Ordre des mots', body: "我吃米饭 (wǒ chī mǐfàn) : je – mange – riz. Les indications de temps se placent avant le verbe : 我今天吃米饭." },
        { heading: 'La négation', body: "不 (bù) se place devant le verbe : 我不吃肉. Avec 有 (avoir), on emploie 没 : 我没有狗." },
        { heading: 'La question', body: "On ajoute 吗 (ma) à la fin d'une phrase affirmative : 你吃肉吗？" },
      ],
      phrases: [
        { text: '我吃米饭。', reading: 'wǒ chī mǐfàn', fr: 'Je mange du riz.' },
        { text: '我不喝茶。', reading: 'wǒ bù hē chá', fr: 'Je ne bois pas de thé.' },
        { text: '你有猫吗？', reading: 'nǐ yǒu māo ma?', fr: 'As-tu un chat ?' },
        { text: '我没有狗。', reading: 'wǒ méiyǒu gǒu', fr: "Je n'ai pas de chien." },
      ],
      quiz: [
        { q: "Ordre des mots d'une phrase simple :", choices: ['Sujet – objet – verbe', 'Sujet – verbe – objet', 'Verbe – sujet – objet'], answer: 1 },
        { q: 'Négation de 有 :', choices: ['不有', '没有', '有不'], answer: 1 },
        { q: 'Quelle particule forme une question ?', choices: ['吗', '了', '的'], answer: 0 },
      ],
    }),
  ],
};
