import type { Pack } from '../types';
import { words, verb, lesson } from './concepts';

export const ja: Pack = {
  words: words('ja', [
    'こんにちは|konnichiwa', 'おはよう|ohayō', 'こんばんは|konbanwa', 'さようなら|sayōnara', 'ありがとう|arigatō',
    'どういたしまして|dō itashimashite', 'すみません|sumimasen', 'はい|hai', 'いいえ|iie', 'お願いします|おねがいします · onegai shimasu',
    '一|いち · ichi', '二|に · ni', '三|さん · san', '四|よん · yon', '五|ご · go',
    '六|ろく · roku', '七|なな · nana', '八|はち · hachi', '九|きゅう · kyū', '十|じゅう · jū',
    '水|みず · mizu', 'パン|pan', 'ご飯|ごはん · gohan', '魚|さかな · sakana', '肉|にく · niku',
    'お茶|おちゃ · ocha', '果物|くだもの · kudamono', '牛乳|ぎゅうにゅう · gyūnyū',
    '母|はは · haha', '父|ちち · chichi', '友達|ともだち · tomodachi', '子供|こども · kodomo', '兄|あに · ani (grand frère)',
    '家|いえ · ie', '学校|がっこう · gakkō', '仕事|しごと · shigoto', '本|ほん · hon',
    '日|ひ · hi', '夜|よる · yoru', '犬|いぬ · inu', '猫|ねこ · neko',
  ]),
  verbs: [
    verb('ja', '食べる|たべる · taberu', 'manger', [
      ['Formes polies', 'présent=食べます|tabemasu', 'négatif=食べません|tabemasen', 'passé=食べました|tabemashita', 'passé négatif=食べませんでした|tabemasen deshita'],
      ['Formes neutres', 'dictionnaire=食べる|taberu', 'négatif (ない)=食べない|tabenai', 'passé (た)=食べた|tabeta', 'forme en て=食べて|tabete'],
    ], 'Verbe ichidan (groupe 2) : on retire る et on ajoute la terminaison.'),
    verb('ja', '行く|いく · iku', 'aller', [
      ['Formes polies', 'présent=行きます|ikimasu', 'négatif=行きません|ikimasen', 'passé=行きました|ikimashita', 'passé négatif=行きませんでした|ikimasen deshita'],
      ['Formes neutres', 'dictionnaire=行く|iku', 'négatif (ない)=行かない|ikanai', 'passé (た)=行った|itta', 'forme en て=行って|itte'],
    ], 'Verbe godan (groupe 1). Exception : la forme en て est 行って et non 行いて.'),
    verb('ja', 'する|suru', 'faire', [
      ['Formes polies', 'présent=します|shimasu', 'négatif=しません|shimasen', 'passé=しました|shimashita', 'passé négatif=しませんでした|shimasen deshita'],
      ['Formes neutres', 'dictionnaire=する|suru', 'négatif (ない)=しない|shinai', 'passé (た)=した|shita', 'forme en て=して|shite'],
    ], "Verbe irrégulier. Il transforme beaucoup de noms en verbes : 勉強する (étudier)."),
    verb('ja', '見る|みる · miru', 'voir, regarder', [
      ['Formes polies', 'présent=見ます|mimasu', 'négatif=見ません|mimasen', 'passé=見ました|mimashita', 'passé négatif=見ませんでした|mimasen deshita'],
      ['Formes neutres', 'dictionnaire=見る|miru', 'négatif (ない)=見ない|minai', 'passé (た)=見た|mita', 'forme en て=見て|mite'],
    ], 'Verbe ichidan (groupe 2).'),
  ],
  lessons: [
    lesson('ja', 1, {
      title: 'Les trois écritures', level: 'Débutant',
      intro: "Le japonais combine trois systèmes d'écriture dans une même phrase. Savoir à quoi sert chacun rend la lecture beaucoup moins intimidante.",
      sections: [
        { heading: 'Hiragana ひらがな', body: "46 signes de base qui notent des syllabes (あ a, い i, う u, え e, お o, か ka…). Ils servent aux mots grammaticaux et aux terminaisons. C'est le premier système à apprendre." },
        { heading: 'Katakana カタカナ', body: "Les mêmes syllabes, avec un tracé plus anguleux. Ils notent surtout les mots d'origine étrangère : パン (pan, le pain), コーヒー (kōhī, le café)." },
        { heading: 'Kanji 漢字', body: "Caractères d'origine chinoise qui portent le sens : 水 (eau), 日 (jour, soleil). Un même kanji a souvent plusieurs lectures. On en apprend environ 2 000 pour lire couramment." },
      ],
      phrases: [
        { text: 'あ い う え お', reading: 'a i u e o', fr: 'les cinq voyelles' },
        { text: 'パン', reading: 'pan', fr: 'pain (katakana)' },
        { text: '水', reading: 'mizu', fr: 'eau (kanji)' },
        { text: '私は水を飲みます。', reading: 'watashi wa mizu o nomimasu', fr: "Je bois de l'eau. (les trois écritures ensemble)" },
      ],
      quiz: [
        { q: 'Quelle écriture note les mots étrangers ?', choices: ['Hiragana', 'Katakana', 'Kanji'], answer: 1 },
        { q: 'Que note un hiragana ?', choices: ['une syllabe', 'un mot entier', 'une lettre seule'], answer: 0 },
        { q: '水 se lit…', choices: ['hi', 'pan', 'mizu'], answer: 2 },
      ],
    }),
    lesson('ja', 2, {
      title: 'Saluer et se présenter', level: 'Débutant',
      intro: 'Les formules de base pour une première rencontre, au niveau de politesse courant (です / ます).',
      sections: [
        { heading: 'Saluer', body: "おはようございます le matin, こんにちは en journée, こんばんは le soir. Entre proches, おはよう suffit." },
        { heading: 'Se présenter', body: "On commence par はじめまして (enchanté), puis « nom + です », et l'on conclut par よろしくお願いします, formule qui demande la bienveillance de l'autre." },
        { heading: 'Le suffixe さん', body: "On ajoute さん au nom des autres (田中さん), jamais au sien." },
      ],
      phrases: [
        { text: 'はじめまして。', reading: 'hajimemashite', fr: 'Enchanté.' },
        { text: 'アンナです。', reading: 'Anna desu', fr: 'Je suis Anna.' },
        { text: 'よろしくお願いします。', reading: 'yoroshiku onegai shimasu', fr: 'Ravi de faire votre connaissance.' },
        { text: 'お元気ですか。', reading: 'o-genki desu ka', fr: 'Comment allez-vous ?' },
        { text: 'フランスから来ました。', reading: 'Furansu kara kimashita', fr: 'Je viens de France.' },
      ],
      quiz: [
        { q: 'Que dit-on en premier lors d’une rencontre ?', choices: ['さようなら', 'はじめまして', 'ありがとう'], answer: 1 },
        { q: 'Peut-on dire « アンナさんです » pour se présenter soi-même ?', choices: ['Oui', 'Non, さん ne s’emploie pas pour soi'], answer: 1 },
        { q: 'Salutation du soir :', choices: ['こんばんは', 'おはよう', 'こんにちは'], answer: 0 },
      ],
    }),
    lesson('ja', 3, {
      title: 'La phrase et les particules', level: 'Débutant',
      intro: "En japonais le verbe vient à la fin, et de petits mots, les particules, indiquent le rôle de chaque élément.",
      sections: [
        { heading: 'Ordre des mots', body: "Sujet – complément – verbe : 私は パンを 食べます (moi – pain – mange)." },
        { heading: 'は (wa) et を (o)', body: "は marque le thème, ce dont on parle. を marque le complément d'objet direct." },
        { heading: 'に (ni) et か (ka)', body: "に indique la destination ou le moment : 学校に行きます (je vais à l'école). か en fin de phrase transforme l'énoncé en question." },
      ],
      phrases: [
        { text: '私はパンを食べます。', reading: 'watashi wa pan o tabemasu', fr: 'Je mange du pain.' },
        { text: '学校に行きます。', reading: 'gakkō ni ikimasu', fr: "Je vais à l'école." },
        { text: 'お茶を飲みますか。', reading: 'ocha o nomimasu ka', fr: 'Buvez-vous du thé ?' },
        { text: 'これは本です。', reading: 'kore wa hon desu', fr: "C'est un livre." },
      ],
      quiz: [
        { q: 'Où se place le verbe ?', choices: ['Au début', 'Au milieu', 'À la fin'], answer: 2 },
        { q: 'Quelle particule marque le complément d’objet ?', choices: ['は', 'を', 'に'], answer: 1 },
        { q: 'Comment former une question ?', choices: ['Ajouter か à la fin', 'Inverser sujet et verbe', 'Ajouter は au début'], answer: 0 },
      ],
    }),
  ],
};
