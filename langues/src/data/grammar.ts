import type { Lesson } from '../types';
import { grammar as g } from './concepts';

export const GRAMMAR: Record<string, Lesson[]> = {
  en: [
    g('en', 1, {
      title: 'Les articles : a, an, the', level: 'Débutant',
      intro: "L'anglais n'a pas de genre : un seul article défini (the) et un article indéfini (a / an) pour tous les noms.",
      sections: [
        { heading: 'A ou an ?', body: "« a » devant un son consonne (a book, a university car « university » commence par le son /y/). « an » devant un son voyelle (an apple, an hour, car le h de « hour » ne se prononce pas). On se fie au son, pas à la lettre." },
        { heading: 'The', body: "« the » désigne quelque chose de précis ou déjà mentionné : I have a dog. The dog is black. Il s'emploie aussi pour les choses uniques : the sun, the moon." },
        { heading: 'Pas d\'article', body: "On n'en met pas devant un pluriel ou un nom indénombrable pris en général (I like cats, I drink water), ni devant les langues et les repas : I speak French. We have lunch at noon." },
      ],
      phrases: [
        { text: 'I have a cat and an apple.', fr: "J'ai un chat et une pomme." },
        { text: 'She works in an office.', fr: 'Elle travaille dans un bureau.' },
        { text: 'The book on the table is mine.', fr: 'Le livre sur la table est à moi.' },
        { text: 'I like music.', fr: "J'aime la musique." },
        { text: 'He is a university student.', fr: 'Il est étudiant à l’université.' },
      ],
      quiz: [
        { q: 'Complétez : « I eat ___ orange. »', choices: ['a', 'an', 'the'], answer: 1 },
        { q: 'Complétez : « She is ___ honest woman. »', choices: ['a', 'an', '(rien)'], answer: 1 },
        { q: 'Phrase correcte :', choices: ['I speak the French.', 'I speak French.', 'I speak a French.'], answer: 1 },
      ],
    }),
    g('en', 2, {
      title: 'Le prétérit (passé simple)', level: 'Élémentaire',
      intro: 'Le prétérit raconte une action terminée à un moment du passé : yesterday, last week, in 2020.',
      sections: [
        { heading: 'Verbes réguliers', body: "On ajoute -ed : work → worked, play → played. Si le verbe finit par -e, on ajoute -d : live → lived. Consonne + y devient -ied : study → studied." },
        { heading: 'Verbes irréguliers', body: "Il faut les apprendre : go → went, see → saw, have → had, eat → ate, buy → bought, take → took, make → made, come → came." },
        { heading: 'Négation et question', body: "On utilise « did » : I did not (didn't) go. Did you go? Après did, le verbe revient à la base : did you went est une faute. Exception : was / were n'ont pas besoin de did : Was he there?" },
      ],
      phrases: [
        { text: 'I visited my grandmother yesterday.', fr: "J'ai rendu visite à ma grand-mère hier." },
        { text: 'We went to the market.', fr: 'Nous sommes allés au marché.' },
        { text: "She didn't see the film.", fr: "Elle n'a pas vu le film." },
        { text: 'Did you eat breakfast?', fr: 'As-tu pris le petit-déjeuner ?' },
        { text: 'They were tired.', fr: 'Ils étaient fatigués.' },
      ],
      quiz: [
        { q: 'Prétérit de « go » :', choices: ['goed', 'went', 'gone'], answer: 1 },
        { q: 'Négation correcte :', choices: ["He didn't went.", "He didn't go.", "He not go."], answer: 1 },
        { q: 'Prétérit de « study » :', choices: ['studyed', 'studied', 'studdied'], answer: 1 },
      ],
    }),
    g('en', 3, {
      title: 'Les verbes modaux', level: 'Élémentaire',
      intro: "can, must, should, may… se placent devant un verbe à la base. Ils ne prennent ni -s à la 3e personne ni « to ».",
      sections: [
        { heading: 'Capacité et permission : can', body: "« can » exprime la capacité (I can swim) ou la permission familière (Can I sit here?). Au passé : could. Négation : cannot / can't." },
        { heading: 'Obligation et conseil', body: "« must » exprime une obligation forte (You must stop at red lights). « should » donne un conseil (You should sleep more). « have to » remplace must au passé et au futur : I had to leave." },
        { heading: 'Politesse', body: "« could » et « would » adoucissent une demande : Could you help me? Would you like some tea? « may » est plus formel : May I come in?" },
      ],
      phrases: [
        { text: 'She can speak three languages.', fr: 'Elle parle trois langues.' },
        { text: 'You must wear a seat belt.', fr: 'Vous devez attacher votre ceinture.' },
        { text: 'You should see a doctor.', fr: 'Tu devrais voir un médecin.' },
        { text: 'Could you open the window, please?', fr: 'Pourriez-vous ouvrir la fenêtre, s’il vous plaît ?' },
        { text: 'He cannot come tonight.', fr: 'Il ne peut pas venir ce soir.' },
      ],
      quiz: [
        { q: 'Phrase correcte :', choices: ['She cans swim.', 'She can swims.', 'She can swim.'], answer: 2 },
        { q: 'Pour donner un conseil :', choices: ['should', 'must', 'can'], answer: 0 },
        { q: 'Phrase correcte :', choices: ['I must to go.', 'I must go.', 'I musts go.'], answer: 1 },
      ],
    }),
    g('en', 4, {
      title: 'Comparatif et superlatif', level: 'Élémentaire',
      intro: 'Comparer deux choses (plus grand que) ou en désigner une seule parmi plusieurs (le plus grand).',
      sections: [
        { heading: 'Adjectifs courts', body: "On ajoute -er et -est : tall → taller → the tallest. big → bigger → the biggest (on double la consonne). happy → happier → the happiest. Le « que » se dit than : She is taller than me." },
        { heading: 'Adjectifs longs', body: "Deux syllabes et plus (sauf en -y) : more / the most. interesting → more interesting → the most interesting." },
        { heading: 'Irréguliers et égalité', body: "good → better → the best ; bad → worse → the worst ; far → farther → the farthest. Pour l'égalité : as … as : He is as tall as his father." },
      ],
      phrases: [
        { text: 'This house is bigger than that one.', fr: 'Cette maison est plus grande que celle-là.' },
        { text: 'She is the smartest in the class.', fr: 'Elle est la plus intelligente de la classe.' },
        { text: 'This book is more interesting than the film.', fr: 'Ce livre est plus intéressant que le film.' },
        { text: 'Today is better than yesterday.', fr: "Aujourd'hui est mieux qu'hier." },
        { text: "I'm as tired as you.", fr: 'Je suis aussi fatigué que toi.' },
      ],
      quiz: [
        { q: 'Comparatif de « good » :', choices: ['gooder', 'more good', 'better'], answer: 2 },
        { q: 'Superlatif de « big » :', choices: ['the bigest', 'the biggest', 'the most big'], answer: 1 },
        { q: 'Complétez : « She is taller ___ me. »', choices: ['than', 'that', 'as'], answer: 0 },
      ],
    }),
  ],

  ja: [
    g('ja', 1, {
      title: 'Les adjectifs en い et en な', level: 'Débutant',
      intro: 'Le japonais a deux familles d’adjectifs. Elles se conjuguent différemment, et il faut savoir à laquelle appartient chaque mot.',
      sections: [
        { heading: 'Adjectifs en い', body: "Ils finissent par い : 大きい (grand), 新しい (nouveau). Ils se conjuguent eux-mêmes. Négatif : い devient くない (大きくない). Passé : い devient かった (大きかった). Poli : on ajoute です (大きいです)." },
        { heading: 'Adjectifs en な', body: "Ce sont des noms qui se comportent comme des adjectifs : 静か (calme), きれい (joli, propre). Devant un nom, on ajoute な : 静かな町. Négatif : じゃない (静かじゃない). Passé : だった (静かだった)." },
        { heading: 'Exception', body: "いい (bien) devient よ- à toutes les autres formes : よくない (pas bien), よかった (c'était bien)." },
      ],
      phrases: [
        { text: 'この本は新しいです。', reading: 'kono hon wa atarashii desu', fr: 'Ce livre est neuf.' },
        { text: 'この町は静かです。', reading: 'kono machi wa shizuka desu', fr: 'Cette ville est calme.' },
        { text: '静かな町ですね。', reading: 'shizuka na machi desu ne', fr: 'C’est une ville calme, n’est-ce pas ?' },
        { text: '昨日は暑くなかったです。', reading: 'kinō wa atsuku nakatta desu', fr: "Hier, il ne faisait pas chaud." },
        { text: '映画はよかったです。', reading: 'eiga wa yokatta desu', fr: 'Le film était bien.' },
      ],
      quiz: [
        { q: 'Négatif de 大きい :', choices: ['大きいじゃない', '大きくない', '大きなない'], answer: 1 },
        { q: 'Devant un nom, 静か devient :', choices: ['静かい', '静かな', '静かの'], answer: 1 },
        { q: 'Passé de いい :', choices: ['いかった', 'よかった', 'いいだった'], answer: 1 },
      ],
    }),
    g('ja', 2, {
      title: 'La forme en て', level: 'Élémentaire',
      intro: "La forme en て est la plus utile du japonais : elle sert à demander, à décrire une action en cours et à enchaîner des actions.",
      sections: [
        { heading: 'Formation (groupe 1)', body: "Selon la dernière syllabe : う・つ・る → って (買う → 買って, 待つ → 待って, 帰る → 帰って) ; む・ぶ・ぬ → んで (飲む → 飲んで) ; く → いて (書く → 書いて, mais 行く → 行って) ; ぐ → いで (泳ぐ → 泳いで) ; す → して (話す → 話して)." },
        { heading: 'Groupe 2 et irréguliers', body: "Groupe 2 : on remplace る par て (食べる → 食べて, 見る → 見て). Irréguliers : する → して, 来る → 来て (きて)." },
        { heading: 'Emplois', body: "〜てください : s'il vous plaît, faites… (見てください). 〜ている : action en cours ou état (食べています, je suis en train de manger). Enchaîner : 起きて、食べて、学校に行きます (je me lève, je mange, je vais à l'école)." },
      ],
      phrases: [
        { text: '水を飲んでください。', reading: 'mizu o nonde kudasai', fr: "Buvez de l'eau, s'il vous plaît." },
        { text: '今、本を読んでいます。', reading: 'ima, hon o yonde imasu', fr: 'En ce moment, je lis un livre.' },
        { text: '朝ご飯を食べて、学校に行きます。', reading: 'asagohan o tabete, gakkō ni ikimasu', fr: "Je prends mon petit-déjeuner puis je vais à l'école." },
        { text: 'ちょっと待ってください。', reading: 'chotto matte kudasai', fr: 'Attendez un instant, s’il vous plaît.' },
      ],
      quiz: [
        { q: 'Forme en て de 飲む :', choices: ['飲って', '飲んで', '飲いて'], answer: 1 },
        { q: 'Forme en て de 食べる :', choices: ['食べて', '食べって', '食んで'], answer: 0 },
        { q: '〜てください sert à…', choices: ['demander poliment', 'interdire', 'raconter le passé'], answer: 0 },
      ],
    }),
    g('ja', 3, {
      title: 'Les particules は, が, も, の', level: 'Débutant',
      intro: "Quatre particules à maîtriser en premier pour construire des phrases simples.",
      sections: [
        { heading: 'は : le thème', body: "は (prononcé « wa ») annonce de quoi l'on parle : 私は学生です (moi, je suis étudiant). Il sert aussi à opposer ou comparer." },
        { heading: 'が : le sujet', body: "が désigne le sujet, surtout pour une information nouvelle, une question avec un mot interrogatif ou avec les verbes d'état : 誰が来ましたか (qui est venu ?), 猫がいます (il y a un chat)." },
        { heading: 'も et の', body: "も signifie « aussi » et remplace は ou を : 私も学生です (moi aussi). の relie deux noms comme « de » : 私の本 (mon livre), 日本語の先生 (le professeur de japonais)." },
      ],
      phrases: [
        { text: '私は学生です。', reading: 'watashi wa gakusei desu', fr: 'Je suis étudiant.' },
        { text: '私も学生です。', reading: 'watashi mo gakusei desu', fr: 'Moi aussi, je suis étudiant.' },
        { text: 'これは私の本です。', reading: 'kore wa watashi no hon desu', fr: "C'est mon livre." },
        { text: '誰が来ましたか。', reading: 'dare ga kimashita ka', fr: 'Qui est venu ?' },
        { text: '庭に猫がいます。', reading: 'niwa ni neko ga imasu', fr: 'Il y a un chat dans le jardin.' },
      ],
      quiz: [
        { q: 'Quelle particule signifie « aussi » ?', choices: ['も', 'の', 'が'], answer: 0 },
        { q: '« Mon livre » :', choices: ['私が本', '私の本', '私は本'], answer: 1 },
        { q: 'Comment se prononce は quand c’est une particule ?', choices: ['ha', 'wa', 'o'], answer: 1 },
      ],
    }),
    g('ja', 4, {
      title: 'Compter : les compteurs', level: 'Élémentaire',
      intro: 'En japonais, on ne dit pas « trois livres » mais « livres trois-volumes » : le nombre se combine avec un compteur selon la nature de l’objet.',
      sections: [
        { heading: 'Les objets divers : 〜つ', body: "Pour compter sans compteur précis, jusqu'à dix : ひとつ, ふたつ, みっつ, よっつ, いつつ, むっつ, ななつ, やっつ, ここのつ, とお." },
        { heading: 'Les personnes', body: "一人 (ひとり, 1), 二人 (ふたり, 2), puis 三人 (さんにん), 四人 (よにん)… Le suffixe est 人 (にん) à partir de trois." },
        { heading: 'Quelques compteurs usuels', body: "〜本 (ほん) pour les objets longs : 鉛筆 (crayon), bouteille ; 〜枚 (まい) pour les objets plats : feuille, ticket ; 〜冊 (さつ) pour les livres ; 〜匹 (ひき) pour les petits animaux. Le nombre se place avant le verbe : 本を三冊買いました." },
      ],
      phrases: [
        { text: 'りんごを三つください。', reading: 'ringo o mittsu kudasai', fr: "Trois pommes, s'il vous plaît." },
        { text: '学生が二人います。', reading: 'gakusei ga futari imasu', fr: 'Il y a deux étudiants.' },
        { text: '本を三冊買いました。', reading: 'hon o sansatsu kaimashita', fr: "J'ai acheté trois livres." },
        { text: '猫が二匹います。', reading: 'neko ga nihiki imasu', fr: 'Il y a deux chats.' },
      ],
      quiz: [
        { q: 'Comment dit-on « deux personnes » ?', choices: ['二人 (ふたり)', '二人 (にんにん)', '二つ (ふたつ)'], answer: 0 },
        { q: 'Quel compteur pour les livres ?', choices: ['本', '冊', '匹'], answer: 1 },
        { q: 'Où se place le nombre dans la phrase ?', choices: ['Après le verbe', 'Avant le verbe', 'En début de phrase obligatoirement'], answer: 1 },
      ],
    }),
  ],

  zh: [
    g('zh', 1, {
      title: 'Les mots de mesure', level: 'Débutant',
      intro: "Entre un nombre (ou 这 / 那) et un nom, le chinois place un mot de mesure : « un [pièce] personne », « deux [volume] livre ».",
      sections: [
        { heading: 'Le plus courant : 个 (gè)', body: "个 convient à beaucoup de noms et sert de mot de secours : 一个人 (yí gè rén, une personne), 三个苹果 (trois pommes)." },
        { heading: 'Mots spécifiques', body: "本 (běn) pour les livres : 两本书. 杯 (bēi) pour ce qui se boit dans un verre : 一杯茶. 只 (zhī) pour les petits animaux : 一只猫. 条 (tiáo) pour les choses longues : 一条鱼, 一条路." },
        { heading: '二 ou 两 ?', body: "Devant un mot de mesure, on dit 两 (liǎng) et non 二 : 两个人, 两本书. 二 (èr) reste pour compter (un, deux, trois) et les numéros." },
      ],
      phrases: [
        { text: '我有一只猫。', reading: 'wǒ yǒu yì zhī māo', fr: "J'ai un chat." },
        { text: '请给我两杯茶。', reading: 'qǐng gěi wǒ liǎng bēi chá', fr: "Donnez-moi deux thés, s'il vous plaît." },
        { text: '这本书很好。', reading: 'zhè běn shū hěn hǎo', fr: 'Ce livre est bien.' },
        { text: '我们有三个孩子。', reading: 'wǒmen yǒu sān gè háizi', fr: 'Nous avons trois enfants.' },
      ],
      quiz: [
        { q: 'Mot de mesure des livres :', choices: ['本', '只', '杯'], answer: 0 },
        { q: '« Deux personnes » :', choices: ['二个人', '两个人', '两人个'], answer: 1 },
        { q: 'Mot de secours le plus courant :', choices: ['条', '个', '只'], answer: 1 },
      ],
    }),
    g('zh', 2, {
      title: 'Les particules 了 et 过', level: 'Élémentaire',
      intro: "Le verbe chinois ne change jamais de forme : l'aspect s'exprime par de petites particules placées après lui.",
      sections: [
        { heading: '了 : action accomplie', body: "了 indique qu'une action est réalisée : 我吃了饭 (j'ai mangé). Avec un changement de situation en fin de phrase, il peut aussi signifier « maintenant » : 下雨了 (il pleut maintenant)." },
        { heading: '过 : expérience', body: "过 indique qu'on a déjà vécu quelque chose : 我去过中国 (je suis déjà allé en Chine). Négation : 我没去过中国." },
        { heading: 'Négation du passé', body: "On nie avec 没 (没有) et le 了 disparaît : 我没吃饭 (je n'ai pas mangé). On n'écrit pas 我没吃了饭." },
      ],
      phrases: [
        { text: '我买了一本书。', reading: 'wǒ mǎi le yì běn shū', fr: "J'ai acheté un livre." },
        { text: '我去过日本。', reading: 'wǒ qù guo Rìběn', fr: 'Je suis déjà allé au Japon.' },
        { text: '我没吃早饭。', reading: 'wǒ méi chī zǎofàn', fr: "Je n'ai pas pris le petit-déjeuner." },
        { text: '下雨了。', reading: 'xià yǔ le', fr: 'Il pleut (maintenant).' },
      ],
      quiz: [
        { q: 'Particule de l’expérience vécue :', choices: ['了', '过', '吗'], answer: 1 },
        { q: 'Négation correcte du passé :', choices: ['我没吃了饭', '我没吃饭', '我不吃了饭'], answer: 1 },
        { q: '« 我去过中国 » signifie…', choices: ['Je vais en Chine', 'Je suis déjà allé en Chine', 'Je ne veux pas aller en Chine'], answer: 1 },
      ],
    }),
    g('zh', 3, {
      title: 'Comparer avec 比', level: 'Élémentaire',
      intro: 'Pour dire « A est plus … que B », le chinois utilise 比 (bǐ) : A 比 B + adjectif.',
      sections: [
        { heading: 'Structure', body: "他比我高 (tā bǐ wǒ gāo) : il est plus grand que moi. L'adjectif vient après B, sans 很 : on ne dit pas 他比我很高." },
        { heading: 'Préciser la différence', body: "On ajoute la différence après l'adjectif : 高一点儿 (un peu plus grand), 高很多 (beaucoup plus grand), 高五厘米 (de cinq centimètres)." },
        { heading: 'Moins que, aussi que', body: "Moins que : A 没有 B + adjectif (我没有他高, je suis moins grand que lui). Aussi que : A 跟 B 一样 + adjectif (我跟他一样高)." },
      ],
      phrases: [
        { text: '今天比昨天冷。', reading: 'jīntiān bǐ zuótiān lěng', fr: "Aujourd'hui il fait plus froid qu'hier." },
        { text: '她比我大两岁。', reading: 'tā bǐ wǒ dà liǎng suì', fr: "Elle a deux ans de plus que moi." },
        { text: '这个比那个贵很多。', reading: 'zhège bǐ nàge guì hěn duō', fr: 'Celui-ci est beaucoup plus cher que celui-là.' },
        { text: '我没有你高。', reading: 'wǒ méiyǒu nǐ gāo', fr: 'Je suis moins grand que toi.' },
      ],
      quiz: [
        { q: 'Phrase correcte :', choices: ['他比我很高。', '他比我高。', '他我比高。'], answer: 1 },
        { q: '« Moins grand que » :', choices: ['没有 … 高', '比 … 不高', '更 … 高'], answer: 0 },
        { q: '« Beaucoup plus cher » :', choices: ['贵很多', '很贵比', '比贵'], answer: 0 },
      ],
    }),
    g('zh', 4, {
      title: 'La particule 的', level: 'Débutant',
      intro: '的 (de) relie un complément à un nom : possession, qualité, ou toute une description.',
      sections: [
        { heading: 'Possession', body: "我的书 (mon livre), 老师的车 (la voiture du professeur). Avec les proches et les groupes, 的 disparaît : 我妈妈, 我们学校." },
        { heading: 'Adjectif + nom', body: "Un adjectif seul se place directement devant un nom : 好书. Un adjectif accompagné d'un adverbe prend 的 : 很漂亮的衣服 (une très jolie robe)." },
        { heading: 'Proposition complète', body: "Une phrase entière peut qualifier un nom, devant lequel elle se place avec 的 : 我昨天买的书 (le livre que j'ai acheté hier)." },
      ],
      phrases: [
        { text: '这是我的手机。', reading: 'zhè shì wǒ de shǒujī', fr: "C'est mon téléphone." },
        { text: '他是我的朋友。', reading: 'tā shì wǒ de péngyou', fr: "C'est mon ami." },
        { text: '我妈妈很好。', reading: 'wǒ māma hěn hǎo', fr: 'Ma mère va bien.' },
        { text: '这是我昨天买的书。', reading: 'zhè shì wǒ zuótiān mǎi de shū', fr: "C'est le livre que j'ai acheté hier." },
      ],
      quiz: [
        { q: '« Mon livre » :', choices: ['我书的', '我的书', '书我的'], answer: 1 },
        { q: 'Avec « maman », on dit plutôt :', choices: ['我的妈妈 obligatoire', '我妈妈', '妈妈我'], answer: 1 },
        { q: 'Où se place la proposition qui qualifie un nom ?', choices: ['Avant le nom, suivie de 的', 'Après le nom', 'À la fin de la phrase'], answer: 0 },
      ],
    }),
  ],

  lt: [
    g('lt', 1, {
      title: 'Genre et pluriel des noms', level: 'Débutant',
      intro: 'Tous les noms lituaniens sont masculins ou féminins. La terminaison du nominatif indique le genre.',
      sections: [
        { heading: 'Masculin', body: "Terminaisons -as, -is, -ys, -us : draugas (ami), brolis (frère), šuo (chien, irrégulier). Pluriel : draugas → draugai, brolis → broliai, namas → namai." },
        { heading: 'Féminin', body: "Terminaisons -a, -ė, et quelques mots en -is : knyga (livre), katė (chat), širdis (cœur). Pluriel : knyga → knygos, katė → katės, širdis → širdys." },
        { heading: 'Pas d’article', body: "Le lituanien n'a ni article défini ni article indéfini : « šuo » peut vouloir dire « un chien » ou « le chien » selon le contexte." },
      ],
      phrases: [
        { text: 'Draugas turi šunį.', fr: 'L’ami a un chien.' },
        { text: 'Namai yra dideli.', fr: 'Les maisons sont grandes.' },
        { text: 'Knygos yra ant stalo.', fr: 'Les livres sont sur la table.' },
        { text: 'Katė miega.', fr: 'Le chat dort.' },
      ],
      quiz: [
        { q: 'Genre de « knyga » :', choices: ['masculin', 'féminin'], answer: 1 },
        { q: 'Pluriel de « draugas » :', choices: ['draugos', 'draugai', 'draugus'], answer: 1 },
        { q: 'Le lituanien possède-t-il des articles ?', choices: ['Oui, comme le français', 'Non'], answer: 1 },
      ],
    }),
    g('lt', 2, {
      title: 'Les trois conjugaisons du présent', level: 'Élémentaire',
      intro: 'Les verbes lituaniens se rangent en trois types selon la forme de leur 3e personne. Elle est identique au singulier et au pluriel.',
      sections: [
        { heading: 'Première conjugaison : -a', body: "dirbti (travailler) : aš dirbu, tu dirbi, jis / ji dirba, mes dirbame, jūs dirbate, jie dirba." },
        { heading: 'Deuxième conjugaison : -i', body: "mylėti (aimer) : aš myliu, tu myli, jis myli, mes mylime, jūs mylite, jie myli." },
        { heading: 'Troisième conjugaison : -o', body: "daryti (faire) : aš darau, tu darai, jis daro, mes darome, jūs darote, jie daro. Le pronom sujet est facultatif : « dirbu » suffit à dire « je travaille »." },
      ],
      phrases: [
        { text: 'Aš dirbu mokykloje.', fr: 'Je travaille à l’école.' },
        { text: 'Ar tu myli kavą?', fr: 'Aimes-tu le café ?' },
        { text: 'Ką tu darai?', fr: 'Que fais-tu ?' },
        { text: 'Mes kalbame lietuviškai.', fr: 'Nous parlons lituanien.' },
      ],
      quiz: [
        { q: 'Troisième personne de « dirbti » :', choices: ['dirba', 'dirbi', 'dirbo'], answer: 0 },
        { q: '« Nous faisons » (daryti) :', choices: ['darau', 'darome', 'daro'], answer: 1 },
        { q: 'Le 3e personne du pluriel est…', choices: ['différente du singulier', 'identique au singulier'], answer: 1 },
      ],
    }),
    g('lt', 3, {
      title: 'Le locatif : dire « où » ', level: 'Élémentaire',
      intro: "Pour dire qu'on se trouve dans un lieu, le nom prend la terminaison du locatif, qui équivaut à « dans » ou « à ».",
      sections: [
        { heading: 'Masculin en -as / -is', body: "namas → name (dans la maison), miestas → mieste (en ville), Vilnius → Vilniuje (à Vilnius)." },
        { heading: 'Féminin en -a / -ė', body: "mokykla → mokykloje (à l'école), Lietuva → Lietuvoje (en Lituanie), kavinė → kavinėje (au café)." },
        { heading: 'Question', body: "On demande « Kur ? » (où ?) : Kur tu gyveni? — Aš gyvenu Vilniuje." },
      ],
      phrases: [
        { text: 'Aš gyvenu Vilniuje.', fr: 'J’habite à Vilnius.' },
        { text: 'Mes esame mokykloje.', fr: 'Nous sommes à l’école.' },
        { text: 'Jis dirba mieste.', fr: 'Il travaille en ville.' },
        { text: 'Kur tu esi?', fr: 'Où es-tu ?' },
      ],
      quiz: [
        { q: 'Locatif de « mokykla » :', choices: ['mokykloje', 'mokyklą', 'mokyklos'], answer: 0 },
        { q: '« En Lituanie » :', choices: ['Lietuvą', 'Lietuvoje', 'Lietuvos'], answer: 1 },
        { q: 'Comment demande-t-on « où » ?', choices: ['Kas?', 'Kur?', 'Kada?'], answer: 1 },
      ],
    }),
    g('lt', 4, {
      title: 'L’accord des adjectifs', level: 'Débutant',
      intro: "En lituanien l'adjectif s'accorde avec le nom en genre, en nombre et en cas.",
      sections: [
        { heading: 'Masculin et féminin', body: "didelis namas (une grande maison), didelė knyga (un grand livre). Beaucoup d'adjectifs en -as au masculin ont -a au féminin : geras draugas (un bon ami), gera draugė (une bonne amie)." },
        { heading: 'Pluriel', body: "geri draugai (de bons amis), geros draugės (de bonnes amies), dideli namai, didelės knygos." },
        { heading: 'Place', body: "L'adjectif se place d'ordinaire avant le nom : graži katė (un beau chat)." },
      ],
      phrases: [
        { text: 'Tai geras draugas.', fr: 'C’est un bon ami.' },
        { text: 'Ji yra graži moteris.', fr: 'C’est une belle femme.' },
        { text: 'Namai yra dideli.', fr: 'Les maisons sont grandes.' },
        { text: 'Turiu naują knygą.', fr: 'J’ai un livre neuf.' },
      ],
      quiz: [
        { q: 'Féminin de « geras » :', choices: ['geras', 'gera', 'geri'], answer: 1 },
        { q: 'Les adjectifs lituaniens s’accordent avec le nom.', choices: ['Vrai', 'Faux'], answer: 0 },
        { q: 'Place habituelle de l’adjectif :', choices: ['avant le nom', 'après le nom'], answer: 0 },
      ],
    }),
  ],

  tl: [
    g('tl', 1, {
      title: 'La ligature na / -ng', level: 'Débutant',
      intro: "En tagalog, un mot qui qualifie un autre s'y rattache par une ligature, « na » ou « -ng ». Elle est partout.",
      sections: [
        { heading: 'Quelle forme ?', body: "Après une voyelle, on ajoute -ng au premier mot : maganda + bahay → magandang bahay (une belle maison). Après un n, on ajoute -g : luntian → luntiang. Après toute autre consonne, on écrit « na » séparément : mabait na bata (un enfant gentil)." },
        { heading: 'Dans les salutations', body: "Magandang umaga, magandang gabi : « maganda » (beau) + -ng + le moment de la journée." },
        { heading: 'Ordre libre', body: "L'adjectif peut passer avant ou après le nom : magandang bahay ou bahay na maganda." },
      ],
      phrases: [
        { text: 'Magandang umaga po.', fr: 'Bonjour (le matin, poli).' },
        { text: 'Mabait na bata.', fr: 'Un enfant gentil.' },
        { text: 'Malaking aso.', fr: 'Un gros chien.' },
        { text: 'Mainit na tubig.', fr: 'De l’eau chaude.' },
      ],
      quiz: [
        { q: '« Malaki » + « aso » donne :', choices: ['malaki na aso', 'malakeng aso', 'malaking aso'], answer: 2 },
        { q: '« Mabait » + « bata » donne :', choices: ['mabaiting bata', 'mabait na bata', 'mabait bata'], answer: 1 },
        { q: 'Après une voyelle, la ligature est…', choices: ['na', '-ng', '-g'], answer: 1 },
      ],
    }),
    g('tl', 2, {
      title: 'La négation : hindi et wala', level: 'Débutant',
      intro: "Le tagalog distingue nier une action ou une qualité (hindi) et nier l'existence ou la possession (wala).",
      sections: [
        { heading: 'Hindi', body: "On met « hindi » avant le mot nié : Hindi ako pagod (je ne suis pas fatigué). Hindi siya kumain (il n'a pas mangé). Pour une identité : Hindi ito aso (ce n'est pas un chien)." },
        { heading: 'Wala', body: "« Wala » signifie « il n'y a pas » ou « ne pas avoir » : Wala akong pera (je n'ai pas d'argent). Wala siya dito (il n'est pas ici). Le nom suivant se rattache par la ligature : walang pera." },
        { heading: 'Ayaw', body: "« Ayaw » exprime le refus ou le « ne pas vouloir » : Ayaw ko ng kape (je ne veux pas de café)." },
      ],
      phrases: [
        { text: 'Hindi ako pagod.', fr: 'Je ne suis pas fatigué.' },
        { text: 'Wala akong pera.', fr: "Je n'ai pas d'argent." },
        { text: 'Hindi siya kumain.', fr: "Il n'a pas mangé." },
        { text: 'Ayaw ko ng kape.', fr: 'Je ne veux pas de café.' },
      ],
      quiz: [
        { q: '« Je n’ai pas d’argent » :', choices: ['Hindi akong pera', 'Wala akong pera', 'Ayaw akong pera'], answer: 1 },
        { q: 'Pour nier un adjectif ou un verbe :', choices: ['wala', 'hindi', 'oo'], answer: 1 },
        { q: '« Ayaw ko » signifie…', choices: ['je veux', 'je ne veux pas', 'je n’ai pas'], answer: 1 },
      ],
    }),
    g('tl', 3, {
      title: 'Les pronoms possessifs', level: 'Débutant',
      intro: "Le possesseur se place après le nom : bahay ko, « maison mienne ». Voici les formes à connaître.",
      sections: [
        { heading: 'Après le nom', body: "ko (mon), mo (ton), niya (son), natin (notre, toi inclus), namin (notre, toi exclu), ninyo (votre), nila (leur). Exemples : aso ko, libro mo, bahay niya." },
        { heading: 'Formes pleines', body: "akin, iyo, kanya, atin, amin, inyo, kanila s'emploient pour insister ou répondre : Akin ito (c'est à moi), Sa iyo ba ito? (est-ce à toi ?)." },
        { heading: 'Avec un nom', body: "Le possesseur nominal prend ng : bahay ng guro (la maison du professeur), aso ni Anna (le chien d'Anna, ni devant un prénom)." },
      ],
      phrases: [
        { text: 'Ito ang bahay ko.', fr: "Voici ma maison." },
        { text: 'Nasaan ang libro mo?', fr: 'Où est ton livre ?' },
        { text: 'Aso ni Anna ito.', fr: "C'est le chien d'Anna." },
        { text: 'Akin ito.', fr: "C'est à moi." },
      ],
      quiz: [
        { q: 'Où se place « ko » (mon) ?', choices: ['Avant le nom', 'Après le nom'], answer: 1 },
        { q: '« Notre », toi non compris :', choices: ['natin', 'namin', 'ninyo'], answer: 1 },
        { q: '« Le chien d’Anna » :', choices: ['aso ni Anna', 'aso ng Anna', 'aso sa Anna'], answer: 0 },
      ],
    }),
    g('tl', 4, {
      title: 'Les aspects des verbes en -um- et mag-', level: 'Élémentaire',
      intro: "Un verbe tagalog exprime si l'action est terminée, en cours ou à venir. Il suit un schéma régulier selon sa famille.",
      sections: [
        { heading: 'Verbes en -um-', body: "On insère -um- après la première consonne pour l'accompli : kain → kumain. Pour l'inaccompli on répète la première syllabe : kumakain. Pour le futur, on répète la première syllabe de la racine : kakain." },
        { heading: 'Verbes en mag-', body: "Accompli : nag- + racine (nag-aral). Inaccompli : nag- + première syllabe répétée (nag-aaral). Futur : mag- + première syllabe répétée (mag-aaral)." },
        { heading: 'Le tagalog ne marque pas la personne', body: "Kumain ako, kumain ka, kumain siya : le verbe ne change pas, seul le pronom varie." },
      ],
      phrases: [
        { text: 'Kumain ako kanina.', fr: "J'ai mangé tout à l'heure." },
        { text: 'Kumakain siya ngayon.', fr: 'Il mange en ce moment.' },
        { text: 'Kakain tayo mamaya.', fr: 'Nous mangerons tout à l’heure.' },
        { text: 'Nag-aaral ako ng Tagalog.', fr: "J'étudie le tagalog." },
      ],
      quiz: [
        { q: 'Accompli de « kain » :', choices: ['kakain', 'kumain', 'kumakain'], answer: 1 },
        { q: 'Futur de « aral » avec mag- :', choices: ['nag-aral', 'nag-aaral', 'mag-aaral'], answer: 2 },
        { q: 'Le verbe change-t-il avec la personne ?', choices: ['Oui', 'Non, seul le pronom change'], answer: 1 },
      ],
    }),
  ],
};
