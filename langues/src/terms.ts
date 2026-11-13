// Vocabulaire des contenus générés (temps verbaux, thèmes, titres de cours) dans les langues de
// l'interface. Les scripts de données écrivent des clés (« @present », « family ») ; l'appli les
// traduit ici. Ordre des colonnes : fr, en, es, de, it, pt, ja, zh, ko, lt, tl.
// Traduit par une IA, non relu par des locuteurs natifs (surtout lt et tl).
export const COLS = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'lt', 'tl'];

const ROWS: Record<string, string[]> = {
  // Temps et formes verbales
  '@present': ['Présent', 'Present', 'Presente', 'Präsens', 'Presente', 'Presente', '現在', '现在时', '현재', 'Esamasis laikas', 'Kasalukuyan'],
  '@preterite': ['Passé simple', 'Past / preterite', 'Pretérito', 'Präteritum', 'Passato remoto', 'Pretérito', '過去', '过去时', '과거', 'Būtasis laikas', 'Nakaraan'],
  '@preterite_de': ['Prétérit', 'Preterite', 'Pretérito', 'Präteritum', 'Preterito', 'Pretérito', '過去', '过去时', '과거', 'Būtasis laikas', 'Nakaraan'],
  '@imperfect': ['Imparfait', 'Imperfect', 'Imperfecto', 'Imperfekt', 'Imperfetto', 'Imperfeito', '未完了過去', '未完成过去时', '불완료 과거', 'Netobulasis laikas', 'Di-tapos na nakaraan'],
  '@future': ['Futur', 'Future', 'Futuro', 'Futur', 'Futuro', 'Futuro', '未来', '将来时', '미래', 'Busimasis laikas', 'Hinaharap'],
  '@conditional': ['Conditionnel', 'Conditional', 'Condicional', 'Konditional', 'Condizionale', 'Condicional', '条件法', '条件式', '조건법', 'Tariamoji nuosaka', 'Kondisyonal'],
  '@subj_present': ['Subjonctif présent', 'Present subjunctive', 'Subjuntivo presente', 'Konjunktiv (Präsens)', 'Congiuntivo presente', 'Conjuntivo presente', '接続法現在', '虚拟式现在时', '접속법 현재', 'Tariamoji nuosaka (esamasis)', 'Subhuntibo'],
  '@subj1': ['Subjonctif I', 'Subjunctive I', 'Konjuntivo I', 'Konjunktiv I', 'Congiuntivo I', 'Conjuntivo I', '接続法I', '虚拟式 I', '접속법 I', 'Tariamoji nuosaka I', 'Subhuntibo I'],
  '@subj2': ['Subjonctif II', 'Subjunctive II', 'Subjuntivo II', 'Konjunktiv II', 'Congiuntivo II', 'Conjuntivo II', '接続法II', '虚拟式 II', '접속법 II', 'Tariamoji nuosaka II', 'Subhuntibo II'],
  '@imperative': ['Impératif', 'Imperative', 'Imperativo', 'Imperativ', 'Imperativo', 'Imperativo', '命令形', '命令式', '명령형', 'Liepiamoji nuosaka', 'Pautos'],
  '@past': ['Passé', 'Past', 'Pasado', 'Vergangenheit', 'Passato', 'Passado', '過去形', '过去', '과거', 'Būtasis laikas', 'Nakaraan'],
  '@past_freq': ['Passé habituel', 'Habitual past', 'Pasado habitual', 'Habituelle Vergangenheit', 'Passato abituale', 'Passado habitual', '過去の習慣', '过去惯常', '과거 습관', 'Būtasis dažninis', 'Nakaugaliang nakaraan'],
  '@polite': ['Forme polie (-masu)', 'Polite form (-masu)', 'Forma cortés (-masu)', 'Höfliche Form (-masu)', 'Forma cortese (-masu)', 'Forma polida (-masu)', '丁寧形（ます）', '礼貌形（ます）', '정중형 (-ます)', 'Mandagi forma (-masu)', 'Magalang (-masu)'],
  '@negative': ['Négatif', 'Negative', 'Negativo', 'Negativ', 'Negativo', 'Negativo', '否定形', '否定', '부정', 'Neiginys', 'Negatibo'],
  '@potential': ['Potentiel', 'Potential', 'Potencial', 'Potential', 'Potenziale', 'Potencial', '可能形', '可能式', '가능형', 'Galimybė', 'Maaari'],
  '@passive': ['Passif', 'Passive', 'Pasivo', 'Passiv', 'Passivo', 'Passivo', '受身形', '被动式', '피동', 'Neveikiamoji rūšis', 'Balintiyak'],
  '@causative': ['Causatif', 'Causative', 'Causativo', 'Kausativ', 'Causativo', 'Causativo', '使役形', '使役式', '사동', 'Veiksnys', 'Pangsanhi'],
  '@volitional': ['Volitif', 'Volitional', 'Volitivo', 'Volitiv', 'Volitivo', 'Volitivo', '意志形', '意志式', '의지형', 'Valios forma', 'Pagnanais'],
  '@infinitive': ['Infinitif', 'Infinitive', 'Infinitivo', 'Infinitiv', 'Infinito', 'Infinitivo', '不定形', '不定式', '부정사', 'Bendratis', 'Pawatas'],
  '@completive': ['Accompli (passé)', 'Completed (past)', 'Perfectivo (pasado)', 'Abgeschlossen (Vergangenheit)', 'Completivo (passato)', 'Completivo (passado)', '完了（過去）', '完成（过去）', '완료 (과거)', 'Baigtinė (būtasis)', 'Perpektibo (nakaraan)'],
  '@progressive': ['Progressif (en cours)', 'Progressive (ongoing)', 'Progresivo (en curso)', 'Progressiv (laufend)', 'Progressivo (in corso)', 'Progressivo (em curso)', '進行（継続）', '进行（持续）', '진행 (계속)', 'Tęstinė (vykstanti)', 'Imperpektibo (kasalukuyan)'],
  '@contemplative': ['Contemplatif (à venir)', 'Contemplated (future)', 'Contemplativo (futuro)', 'Kontemplativ (Zukunft)', 'Contemplativo (futuro)', 'Contemplativo (futuro)', '予定（未来）', '预期（将来）', '예정 (미래)', 'Numatoma (busimasis)', 'Kontemplatibo (hinaharap)'],
  '@forms': ['Formes', 'Forms', 'Formas', 'Formen', 'Forme', 'Formas', '活用形', '变化形式', '활용형', 'Formos', 'Mga anyo'],
  '@pp': ['Participe passé', 'Past participle', 'Participio pasado', 'Partizip II', 'Participio passato', 'Particípio passado', '過去分詞', '过去分词', '과거분사', 'Būtojo laiko dalyvis', 'Pandiwang pang-nakaraan'],
  '@ppr': ['Participe présent', 'Present participle', 'Participio presente', 'Partizip I', 'Participio presente', 'Particípio presente', '現在分詞', '现在分词', '현재분사', 'Esamojo laiko dalyvis', 'Pandiwang kasalukuyan'],
  '@gerund': ['Gérondif', 'Gerund', 'Gerundio', 'Gerundium', 'Gerundio', 'Gerúndio', '動名詞', '动名词', '동명사', 'Pusdalyvis', 'Gerund'],
  '@aux': ['Auxiliaire', 'Auxiliary', 'Auxiliar', 'Hilfsverb', 'Ausiliare', 'Auxiliar', '助動詞', '助动词', '조동사', 'Pagalbinis veiksmažodis', 'Pantulong'],
  '@ko_polite': ['Poli (-요)', 'Polite (-yo)', 'Cortés (-yo)', 'Höflich (-yo)', 'Cortese (-yo)', 'Polido (-yo)', '丁寧（-요）', '礼貌体（-요）', '해요체', 'Mandagus (-yo)', 'Magalang (-yo)'],
  '@ko_formal': ['Formel (-ㅂ니다)', 'Formal (-mnida)', 'Formal (-mnida)', 'Förmlich (-mnida)', 'Formale (-mnida)', 'Formal (-mnida)', '格式体（-ㅂ니다）', '正式体（-ㅂ니다）', '합쇼체', 'Oficialus (-mnida)', 'Pormal (-mnida)'],
  '@ko_plain': ['Neutre (écrit)', 'Plain (written)', 'Neutro (escrito)', 'Neutral (Schrift)', 'Neutro (scritto)', 'Neutro (escrito)', '平叙形（書き言葉）', '基本形（书面）', '해라체', 'Neutralus (rašytinis)', 'Payak (pasulat)'],
  '@ko_casual': ['Familier (-어)', 'Casual (-eo)', 'Informal (-eo)', 'Locker (-eo)', 'Informale (-eo)', 'Informal (-eo)', 'くだけた形（-어）', '非敬语（-어）', '해체', 'Šnekamasis (-eo)', 'Kaswal (-eo)'],
  '@ko_past': ['Passé poli', 'Polite past', 'Pasado cortés', 'Höfliche Vergangenheit', 'Passato cortese', 'Passado polido', '丁寧な過去', '礼貌过去', '정중한 과거', 'Mandagus būtasis', 'Magalang na nakaraan'],
  '@ko_past_plain': ['Passé neutre', 'Plain past', 'Pasado neutro', 'Neutrale Vergangenheit', 'Passato neutro', 'Passado neutro', '平叙の過去', '基本过去', '해라체 과거', 'Neutralus būtasis', 'Payak na nakaraan'],
  '@ko_question': ['Question formelle', 'Formal question', 'Pregunta formal', 'Förmliche Frage', 'Domanda formale', 'Pergunta formal', '格式体の疑問', '正式疑问', '합쇼체 의문', 'Oficialus klausimas', 'Pormal na tanong'],
  '@ko_hortative': ['Proposition (allons…)', 'Suggestion (let\'s…)', 'Propuesta (vamos a…)', 'Vorschlag (lass uns…)', 'Proposta (facciamo…)', 'Sugestão (vamos…)', '勧誘（〜しよう）', '建议（一起…）', '청유형', 'Siūlymas (darykime…)', 'Mungkahi (tayo na…)'],
  // Niveaux
  '@beginner': ['Débutant', 'Beginner', 'Principiante', 'Anfänger', 'Principiante', 'Iniciante', '初級', '入门', '초급', 'Pradedantysis', 'Baguhan'],
  '@elementary': ['Élémentaire', 'Elementary', 'Elemental', 'Grundstufe', 'Elementare', 'Elementar', '初級後半', '基础', '초중급', 'Pradinis', 'Elementarya'],
  '@intermediate': ['Intermédiaire', 'Intermediate', 'Intermedio', 'Mittelstufe', 'Intermedio', 'Intermédio', '中級', '中级', '중급', 'Vidutinis', 'Katamtaman'],
  'intro.A1': ['Les tout premiers mots : ceux qu\'on rencontre dès les premières phrases.', 'The very first words: the ones you meet in your first sentences.', 'Las primeras palabras: las de las primeras frases.', 'Die allerersten Wörter, die schon in den ersten Sätzen vorkommen.', 'Le primissime parole: quelle delle prime frasi.', 'As primeiras palavras: as das primeiras frases.', 'まず覚えたい基本の単語です。', '最先遇到的基础词汇。', '가장 먼저 만나는 기본 단어입니다.', 'Pirmieji žodžiai, sutinkami pirmuosiuose sakiniuose.', 'Ang mga unang salita na makikita agad sa mga pangungusap.'],
  'intro.A2': ['Le vocabulaire de la vie courante, pour tenir une conversation simple.', 'Everyday vocabulary for simple conversations.', 'Vocabulario cotidiano para conversaciones sencillas.', 'Alltagswortschatz für einfache Gespräche.', 'Il vocabolario quotidiano per conversazioni semplici.', 'Vocabulário do dia a dia para conversas simples.', '簡単な会話のための日常の単語です。', '用于简单对话的日常词汇。', '간단한 대화를 위한 일상 단어입니다.', 'Kasdienė leksika paprastam pokalbiui.', 'Pang-araw-araw na bokabularyo para sa simpleng usapan.'],
  'intro.B1': ['De quoi raconter, expliquer et comprendre l\'essentiel d\'un texte ordinaire.', 'Enough to tell, explain and follow the gist of an ordinary text.', 'Para contar, explicar y entender lo esencial de un texto corriente.', 'Zum Erzählen, Erklären und Verstehen gewöhnlicher Texte.', 'Per raccontare, spiegare e capire l\'essenziale di un testo comune.', 'Para contar, explicar e entender o essencial de um texto comum.', '説明したり、普通の文章の要点を理解するための単語です。', '足以叙述、说明并理解普通文章的大意。', '이야기하고 설명하며 일반 글의 요지를 이해하는 데 필요한 단어입니다.', 'Pakanka papasakoti, paaiškinti ir suprasti įprasto teksto esmę.', 'Sapat para magkuwento, magpaliwanag at umunawa ng karaniwang teksto.'],
  'intro.B2': ['Un vocabulaire plus large, pour suivre une discussion suivie et lire sans peine.', 'A wider vocabulary to follow a discussion and read comfortably.', 'Un vocabulario más amplio para seguir una conversación y leer sin esfuerzo.', 'Ein größerer Wortschatz, um Gesprächen zu folgen und mühelos zu lesen.', 'Un vocabolario più ampio per seguire una discussione e leggere senza fatica.', 'Um vocabulário mais amplo para acompanhar uma discussão e ler sem esforço.', '議論についていき、楽に読むための幅広い単語です。', '更广的词汇，便于跟上讨论并轻松阅读。', '토론을 따라가고 편하게 읽기 위한 폭넓은 어휘입니다.', 'Platesnė leksika diskusijai sekti ir laisvam skaitymui.', 'Mas malawak na bokabularyo para sumunod sa talakayan at magbasa nang maluwag.'],
  'intro.C1': ['Les mots moins courants : la nuance, les domaines spécialisés, la langue écrite.', 'Less common words: nuance, specialised fields, written language.', 'Palabras menos comunes: matices, campos especializados, lengua escrita.', 'Seltenere Wörter: Nuancen, Fachgebiete, Schriftsprache.', 'Parole meno comuni: sfumature, ambiti specialistici, lingua scritta.', 'Palavras menos comuns: nuances, áreas especializadas, língua escrita.', 'ニュアンス、専門分野、書き言葉に使う、あまり一般的でない単語です。', '较少见的词：细微差别、专业领域和书面语。', '뉘앙스, 전문 분야, 문어체에 쓰이는 덜 흔한 단어입니다.', 'Rečiau vartojami žodžiai: niuansai, specialios sritys, rašytinė kalba.', 'Mga salitang hindi gaanong karaniwan: kahulugan, espesyal na larangan, pasulat na wika.'],
  'intro.C2': ['Le fond du dictionnaire : termes rares, techniques ou littéraires.', 'The depths of the dictionary: rare, technical or literary terms.', 'El fondo del diccionario: términos raros, técnicos o literarios.', 'Der Grund des Wörterbuchs: seltene, technische oder literarische Begriffe.', 'Il fondo del dizionario: termini rari, tecnici o letterari.', 'O fundo do dicionário: termos raros, técnicos ou literários.', '辞書の奥深く：まれな専門用語や文学的な語です。', '词典深处：罕见、专业或文学性的词语。', '사전의 깊은 곳: 드물거나 전문적이거나 문학적인 용어입니다.', 'Žodyno gelmės: reti, techniniai ar literatūriniai terminai.', 'Ang kailaliman ng diksyunaryo: bihira, teknikal o pampanitikang termino.'],
  // Cours (guides de conversation)
  '@c_first': ['Premiers mots', 'First words', 'Primeras palabras', 'Erste Wörter', 'Prime parole', 'Primeiras palavras', 'はじめの言葉', '初学词语', '첫 단어', 'Pirmieji žodžiai', 'Mga unang salita'],
  '@c_numbers': ['Les nombres', 'Numbers', 'Los números', 'Zahlen', 'I numeri', 'Os números', '数字', '数字', '숫자', 'Skaičiai', 'Mga numero'],
  '@c_time': ['Le temps qui passe', 'Time and dates', 'El tiempo y las fechas', 'Zeit und Datum', 'Tempo e date', 'Tempo e datas', '時間と日付', '时间和日期', '시간과 날짜', 'Laikas ir datos', 'Oras at petsa'],
  '@c_colours': ['Les couleurs', 'Colours', 'Los colores', 'Farben', 'I colori', 'As cores', '色', '颜色', '색깔', 'Spalvos', 'Mga kulay'],
  '@c_problems': ['En cas de problème', 'When things go wrong', 'En caso de problema', 'Bei Problemen', 'In caso di problemi', 'Em caso de problema', '困ったとき', '遇到问题时', '문제가 생겼을 때', 'Kai kyla problemų', 'Kapag may problema'],
  '@c_transport': ['Se déplacer', 'Getting around', 'Moverse', 'Unterwegs', 'Spostarsi', 'Deslocar-se', '移動', '出行', '이동하기', 'Kaip judėti', 'Paglalakbay'],
  '@c_lodging': ['Se loger', 'Accommodation', 'Alojamiento', 'Unterkunft', 'Alloggio', 'Alojamento', '宿泊', '住宿', '숙박', 'Apgyvendinimas', 'Tuluyan'],
  '@c_money': ['L\'argent', 'Money', 'El dinero', 'Geld', 'Il denaro', 'O dinheiro', 'お金', '金钱', '돈', 'Pinigai', 'Pera'],
  '@c_eating': ['Au restaurant', 'Eating out', 'En el restaurante', 'Im Restaurant', 'Al ristorante', 'No restaurante', 'レストランで', '在餐厅', '식당에서', 'Restorane', 'Sa restawran'],
  '@c_bars': ['Au bar', 'At the bar', 'En el bar', 'In der Bar', 'Al bar', 'No bar', 'バーで', '在酒吧', '술집에서', 'Bare', 'Sa bar'],
  '@c_shopping': ['Faire des achats', 'Shopping', 'De compras', 'Einkaufen', 'Fare acquisti', 'Fazer compras', '買い物', '购物', '쇼핑', 'Apsipirkimas', 'Pamimili'],
  '@c_driving': ['Conduire', 'Driving', 'Conducir', 'Autofahren', 'Guidare', 'Conduzir', '運転', '驾驶', '운전', 'Vairavimas', 'Pagmamaneho'],
  '@c_authority': ['Face aux autorités', 'Dealing with authorities', 'Ante las autoridades', 'Bei Behörden', 'Con le autorità', 'Perante as autoridades', '当局への対応', '面对当局', '당국과 마주할 때', 'Bendravimas su valdžia', 'Sa harap ng awtoridad'],
  '@c_pron': ['Prononciation', 'Pronunciation', 'Pronunciación', 'Aussprache', 'Pronuncia', 'Pronúncia', '発音', '发音', '발음', 'Tarimas', 'Pagbigkas'],
  '@c_pron_intro': ['Comment se prononcent les lettres de cette langue.', 'How the letters of this language are pronounced.', 'Cómo se pronuncian las letras de este idioma.', 'Wie die Buchstaben dieser Sprache ausgesprochen werden.', 'Come si pronunciano le lettere di questa lingua.', 'Como se pronunciam as letras desta língua.', 'この言語の文字の発音です。', '这门语言字母的读法。', '이 언어의 글자 발음입니다.', 'Kaip tariamos šios kalbos raidės.', 'Paano binibigkas ang mga titik ng wikang ito.'],
  '@c_grammar': ['Notions de grammaire', 'Grammar notes', 'Nociones de gramática', 'Grammatikhinweise', 'Nozioni di grammatica', 'Noções de gramática', '文法メモ', '语法要点', '문법 노트', 'Gramatikos pastabos', 'Mga tala sa balarila'],
  '@c_intro': ['Les phrases utiles pour ce thème.', 'Useful phrases for this topic.', 'Frases útiles para este tema.', 'Nützliche Sätze zu diesem Thema.', 'Frasi utili per questo tema.', 'Frases úteis para este tema.', 'このテーマに役立つ表現です。', '本主题的实用句子。', '이 주제에 유용한 문장입니다.', 'Naudingi šios temos sakiniai.', 'Mga kapaki-pakinabang na pangungusap sa paksang ito.'],
  '@c_remember': ['À retenir', 'To remember', 'A recordar', 'Merken', 'Da ricordare', 'A reter', 'ポイント', '要点', '기억할 점', 'Verta atsiminti', 'Tandaan'],
  // Thèmes de vocabulaire
  'family': ['La famille', 'Family', 'La familia', 'Familie', 'La famiglia', 'A família', '家族', '家庭', '가족', 'Šeima', 'Pamilya'],
  'cooking': ['La cuisine', 'Cooking', 'La cocina', 'Kochen', 'La cucina', 'A cozinha', '料理', '烹饪', '요리', 'Maisto gaminimas', 'Pagluluto'],
  'medicine': ['La médecine', 'Medicine', 'La medicina', 'Medizin', 'La medicina', 'A medicina', '医学', '医学', '의학', 'Medicina', 'Medisina'],
  'body': ['Le corps', 'The body', 'El cuerpo', 'Der Körper', 'Il corpo', 'O corpo', '体', '身体', '신체', 'Kūnas', 'Katawan'],
  'politics': ['La politique', 'Politics', 'La política', 'Politik', 'La politica', 'A política', '政治', '政治', '정치', 'Politika', 'Pulitika'],
  'economy': ['L\'économie', 'Economy', 'La economía', 'Wirtschaft', 'L\'economia', 'A economia', '経済', '经济', '경제', 'Ekonomika', 'Ekonomiya'],
  'money': ['L\'argent', 'Money', 'El dinero', 'Geld', 'Il denaro', 'O dinheiro', 'お金', '金钱', '돈', 'Pinigai', 'Pera'],
  'trade': ['Le commerce', 'Trade', 'El comercio', 'Handel', 'Il commercio', 'O comércio', '商業', '商业', '상업', 'Prekyba', 'Kalakalan'],
  'work': ['Le travail', 'Work', 'El trabajo', 'Arbeit', 'Il lavoro', 'O trabalho', '仕事', '工作', '일', 'Darbas', 'Trabaho'],
  'school': ['L\'école', 'School', 'La escuela', 'Schule', 'La scuola', 'A escola', '学校', '学校', '학교', 'Mokykla', 'Paaralan'],
  'sport': ['Le sport', 'Sport', 'El deporte', 'Sport', 'Lo sport', 'O desporto', 'スポーツ', '体育', '스포츠', 'Sportas', 'Isports'],
  'music': ['La musique', 'Music', 'La música', 'Musik', 'La musica', 'A música', '音楽', '音乐', '음악', 'Muzika', 'Musika'],
  'religion': ['La religion', 'Religion', 'La religión', 'Religion', 'La religione', 'A religião', '宗教', '宗教', '종교', 'Religija', 'Relihiyon'],
  'law': ['Le droit', 'Law', 'El derecho', 'Recht', 'Il diritto', 'O direito', '法律', '法律', '법', 'Teisė', 'Batas'],
  'army': ['L\'armée', 'The army', 'El ejército', 'Militär', 'L\'esercito', 'O exército', '軍隊', '军队', '군대', 'Kariuomenė', 'Hukbo'],
  'geography': ['La géographie', 'Geography', 'La geografía', 'Geografie', 'La geografia', 'A geografia', '地理', '地理', '지리', 'Geografija', 'Heograpiya'],
  'transport': ['Les transports', 'Transport', 'El transporte', 'Verkehr', 'I trasporti', 'Os transportes', '交通', '交通', '교통', 'Transportas', 'Transportasyon'],
  'technology': ['La technique', 'Technology', 'La técnica', 'Technik', 'La tecnica', 'A técnica', '技術', '技术', '기술', 'Technika', 'Teknolohiya'],
  'computing': ['L\'informatique', 'Computing', 'La informática', 'Informatik', 'L\'informatica', 'A informática', 'コンピューター', '计算机', '컴퓨터', 'Informatika', 'Kompyuter'],
  'physics': ['La physique', 'Physics', 'La física', 'Physik', 'La fisica', 'A física', '物理', '物理', '물리', 'Fizika', 'Pisika'],
  'chemistry': ['La chimie', 'Chemistry', 'La química', 'Chemie', 'La chimica', 'A química', '化学', '化学', '화학', 'Chemija', 'Kimika'],
  'maths': ['Les mathématiques', 'Mathematics', 'Las matemáticas', 'Mathematik', 'La matematica', 'A matemática', '数学', '数学', '수학', 'Matematika', 'Matematika'],
  'biology': ['La biologie', 'Biology', 'La biología', 'Biologie', 'La biologia', 'A biologia', '生物学', '生物学', '생물학', 'Biologija', 'Biyolohiya'],
  'plants': ['Les plantes', 'Plants', 'Las plantas', 'Pflanzen', 'Le piante', 'As plantas', '植物', '植物', '식물', 'Augalai', 'Halaman'],
  'animals': ['Les animaux', 'Animals', 'Los animales', 'Tiere', 'Gli animali', 'Os animais', '動物', '动物', '동물', 'Gyvūnai', 'Mga hayop'],
  'architecture': ['L\'architecture', 'Architecture', 'La arquitectura', 'Architektur', 'L\'architettura', 'A arquitetura', '建築', '建筑', '건축', 'Architektūra', 'Arkitektura'],
  'language': ['La langue', 'Language', 'La lengua', 'Sprache', 'La lingua', 'A língua', '言語', '语言', '언어', 'Kalba', 'Wika'],
  'history': ['L\'histoire', 'History', 'La historia', 'Geschichte', 'La storia', 'A história', '歴史', '历史', '역사', 'Istorija', 'Kasaysayan'],
  'time': ['Le temps qui passe', 'Time', 'El tiempo', 'Zeit', 'Il tempo', 'O tempo', '時間', '时间', '시간', 'Laikas', 'Oras'],
  'life': ['La vie et la mort', 'Life and death', 'La vida y la muerte', 'Leben und Tod', 'La vita e la morte', 'A vida e a morte', '生と死', '生与死', '삶과 죽음', 'Gyvenimas ir mirtis', 'Buhay at kamatayan'],
  'electricity': ['L\'électricité', 'Electricity', 'La electricidad', 'Elektrizität', 'L\'elettricità', 'A eletricidade', '電気', '电', '전기', 'Elektra', 'Kuryente'],
  'mechanics': ['La mécanique', 'Mechanics', 'La mecánica', 'Mechanik', 'La meccanica', 'A mecânica', '機械', '机械', '기계', 'Mechanika', 'Mekanika'],
  'industry': ['L\'industrie', 'Industry', 'La industria', 'Industrie', 'L\'industria', 'A indústria', '産業', '工业', '산업', 'Pramonė', 'Industriya'],
  'sea': ['La mer', 'The sea', 'El mar', 'Das Meer', 'Il mare', 'O mar', '海', '海洋', '바다', 'Jūra', 'Dagat'],
  'hunting': ['La chasse', 'Hunting', 'La caza', 'Jagd', 'La caccia', 'A caça', '狩猟', '狩猎', '사냥', 'Medžioklė', 'Pangangaso'],
  'fishing': ['La pêche', 'Fishing', 'La pesca', 'Angeln', 'La pesca', 'A pesca', '釣り', '钓鱼', '낚시', 'Žvejyba', 'Pangingisda'],
  'farming': ['L\'agriculture', 'Farming', 'La agricultura', 'Landwirtschaft', 'L\'agricoltura', 'A agricultura', '農業', '农业', '농업', 'Žemės ūkis', 'Pagsasaka'],
  'weather': ['La météo', 'Weather', 'El clima', 'Wetter', 'Il meteo', 'O clima', '天気', '天气', '날씨', 'Orai', 'Panahon'],
  'astronomy': ['L\'astronomie', 'Astronomy', 'La astronomía', 'Astronomie', 'L\'astronomia', 'A astronomia', '天文学', '天文学', '천문학', 'Astronomija', 'Astronomiya'],
  'clothes': ['Les vêtements', 'Clothes', 'La ropa', 'Kleidung', 'I vestiti', 'A roupa', '衣服', '衣服', '옷', 'Drabužiai', 'Damit'],
  'dance': ['La danse', 'Dance', 'El baile', 'Tanz', 'La danza', 'A dança', 'ダンス', '舞蹈', '춤', 'Šokis', 'Sayaw'],
  'theatre': ['Le théâtre', 'Theatre', 'El teatro', 'Theater', 'Il teatro', 'O teatro', '演劇', '戏剧', '연극', 'Teatras', 'Teatro'],
  'photography': ['La photographie', 'Photography', 'La fotografía', 'Fotografie', 'La fotografia', 'A fotografia', '写真', '摄影', '사진', 'Fotografija', 'Potograpiya'],
  'art': ['L\'art', 'Art', 'El arte', 'Kunst', 'L\'arte', 'A arte', '芸術', '艺术', '미술', 'Menas', 'Sining'],
  'psychology': ['La psychologie', 'Psychology', 'La psicología', 'Psychologie', 'La psicologia', 'A psicologia', '心理学', '心理学', '심리학', 'Psichologija', 'Sikolohiya'],
  'philosophy': ['La philosophie', 'Philosophy', 'La filosofía', 'Philosophie', 'La filosofia', 'A filosofia', '哲学', '哲学', '철학', 'Filosofija', 'Pilosopiya'],
  'birds': ['Les oiseaux', 'Birds', 'Las aves', 'Vögel', 'Gli uccelli', 'As aves', '鳥', '鸟类', '새', 'Paukščiai', 'Mga ibon'],
  'fish': ['Les poissons', 'Fish', 'Los peces', 'Fische', 'I pesci', 'Os peixes', '魚', '鱼类', '물고기', 'Žuvys', 'Isda'],
  'insects': ['Les insectes', 'Insects', 'Los insectos', 'Insekten', 'Gli insetti', 'Os insetos', '昆虫', '昆虫', '곤충', 'Vabzdžiai', 'Mga insekto'],
  'trees': ['Les arbres', 'Trees', 'Los árboles', 'Bäume', 'Gli alberi', 'As árvores', '木', '树木', '나무', 'Medžiai', 'Mga puno'],
  'fruits': ['Les fruits', 'Fruit', 'Las frutas', 'Obst', 'La frutta', 'As frutas', '果物', '水果', '과일', 'Vaisiai', 'Mga prutas'],
  'vegetables': ['Les légumes', 'Vegetables', 'Las verduras', 'Gemüse', 'Le verdure', 'Os legumes', '野菜', '蔬菜', '채소', 'Daržovės', 'Mga gulay'],
  'food': ['La nourriture', 'Food', 'La comida', 'Essen', 'Il cibo', 'A comida', '食べ物', '食物', '음식', 'Maistas', 'Pagkain'],
  'drinks': ['Les boissons', 'Drinks', 'Las bebidas', 'Getränke', 'Le bevande', 'As bebidas', '飲み物', '饮料', '음료', 'Gėrimai', 'Inumin'],
  'colours': ['Les couleurs', 'Colours', 'Los colores', 'Farben', 'I colori', 'As cores', '色', '颜色', '색깔', 'Spalvos', 'Mga kulay'],
  'jobs': ['Les métiers', 'Jobs', 'Los oficios', 'Berufe', 'I mestieri', 'As profissões', '職業', '职业', '직업', 'Profesijos', 'Mga trabaho'],
  'health': ['La santé', 'Health', 'La salud', 'Gesundheit', 'La salute', 'A saúde', '健康', '健康', '건강', 'Sveikata', 'Kalusugan'],
  'home': ['La maison', 'Home', 'La casa', 'Haus und Wohnen', 'La casa', 'A casa', '家', '家居', '집', 'Namai', 'Tahanan'],
  'tools': ['Les outils', 'Tools', 'Las herramientas', 'Werkzeuge', 'Gli attrezzi', 'As ferramentas', '道具', '工具', '도구', 'Įrankiai', 'Mga kagamitan'],
  'countries': ['Les pays', 'Countries', 'Los países', 'Länder', 'I paesi', 'Os países', '国', '国家', '나라', 'Šalys', 'Mga bansa'],
  'cities': ['Les villes', 'Cities', 'Las ciudades', 'Städte', 'Le città', 'As cidades', '都市', '城市', '도시', 'Miestai', 'Mga lungsod'],
  'feelings': ['Les sentiments', 'Feelings', 'Los sentimientos', 'Gefühle', 'I sentimenti', 'Os sentimentos', '感情', '情感', '감정', 'Jausmai', 'Damdamin'],
  'measures': ['Les mesures', 'Measures', 'Las medidas', 'Maße', 'Le misure', 'As medidas', '単位', '度量', '단위', 'Matai', 'Mga sukat'],
  'nouns': ['Noms courants', 'Common nouns', 'Sustantivos comunes', 'Häufige Nomen', 'Nomi comuni', 'Substantivos comuns', 'よく使う名詞', '常用名词', '자주 쓰는 명사', 'Dažni daiktavardžiai', 'Karaniwang pangngalan'],
  'verbs': ['Verbes courants', 'Common verbs', 'Verbos comunes', 'Häufige Verben', 'Verbi comuni', 'Verbos comuns', 'よく使う動詞', '常用动词', '자주 쓰는 동사', 'Dažni veiksmažodžiai', 'Karaniwang pandiwa'],
  'adjectives': ['Adjectifs courants', 'Common adjectives', 'Adjetivos comunes', 'Häufige Adjektive', 'Aggettivi comuni', 'Adjetivos comuns', 'よく使う形容詞', '常用形容词', '자주 쓰는 형용사', 'Dažni būdvardžiai', 'Karaniwang pang-uri'],
  'adverbs': ['Adverbes', 'Adverbs', 'Adverbios', 'Adverbien', 'Avverbi', 'Advérbios', '副詞', '副词', '부사', 'Prieveiksmiai', 'Pang-abay'],
  'pronouns': ['Pronoms', 'Pronouns', 'Pronombres', 'Pronomen', 'Pronomi', 'Pronomes', '代名詞', '代词', '대명사', 'Įvardžiai', 'Panghalip'],
  'linkers': ['Mots de liaison', 'Linking words', 'Conectores', 'Bindewörter', 'Connettivi', 'Conectores', '接続語', '连接词', '연결어', 'Jungtukai', 'Mga pang-ugnay'],
  'prepositions': ['Prépositions', 'Prepositions', 'Preposiciones', 'Präpositionen', 'Preposizioni', 'Preposições', '前置詞', '介词', '전치사', 'Prielinksniai', 'Pang-ukol'],
  'interjections': ['Interjections', 'Interjections', 'Interjecciones', 'Interjektionen', 'Interiezioni', 'Interjeições', '感動詞', '感叹词', '감탄사', 'Jaustukai', 'Pandamdam'],
  'particles': ['Particules', 'Particles', 'Partículas', 'Partikeln', 'Particelle', 'Partículas', '助詞', '助词', '조사', 'Dalelytės', 'Mga kataga'],
  'common': ['Vocabulaire courant', 'Common vocabulary', 'Vocabulario común', 'Gängiger Wortschatz', 'Vocabolario comune', 'Vocabulário comum', '基本語彙', '常用词汇', '기본 어휘', 'Dažna leksika', 'Karaniwang bokabularyo'],
};

/** Traduit un terme ; sans traduction, l'anglais puis la clé elle-même. */
export function term(key: string, locale: string): string {
  const row = ROWS[key];
  if (!row) return key.startsWith('@') ? key.slice(1) : key;
  const i = COLS.indexOf(locale);
  return (i >= 0 && row[i]) || row[1] || row[0];
}

/** Traduit les clés « @xxx » d'un texte, p. ex. « @pp: gemacht » dans les notes de verbe. */
export function translateNote(note: string, locale: string): string {
  return note.replace(/@\w+/g, (m) => term(m, locale));
}

/** Nom d'une langue dans la langue de l'interface (Intl.DisplayNames), sinon son nom français. */
export function languageName(code: string, locale: string, fallback: string): string {
  try {
    const dn = new Intl.DisplayNames([locale === 'tl' ? 'fil' : locale], { type: 'language' });
    const n = dn.of(code === 'tl' ? 'fil' : code);
    if (n && n.toLowerCase() !== code) return n.charAt(0).toLocaleUpperCase(locale) + n.slice(1);
  } catch { /* locale ou code non géré par le moteur */ }
  return fallback;
}

const BUILTIN = new Set(['en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'lt', 'tl']);
/** Nom à afficher pour une langue : traduit pour les langues intégrées, tel quel pour les autres. */
export function localName(lang: { code: string; name: string }, locale: string): string {
  return BUILTIN.has(lang.code) ? languageName(lang.code, locale, lang.name) : lang.name;
}
