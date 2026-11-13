import { createContext, useContext } from 'react';

/** Toutes les chaînes de l'interface. Le français est la référence : les autres langues en dérivent. */
export const fr = {
  // Navigation
  'nav.home': 'Accueil',
  'nav.vocab': 'Vocabulaire',
  'nav.phrases': 'Phrases',
  'nav.conj': 'Conjugaison',
  'nav.lessons': 'Leçons',
  'nav.chat': 'Discussion',
  'nav.settings': 'Réglages',
  'nav.practice': 'Exercices',

  // Accueil
  'home.streak_one': 'jour de suite',
  'home.streak_many': 'jours de suite',
  'home.mastered': 'Mots maîtrisés',
  'home.lessonsDone': 'Leçons terminées',
  'home.continue': 'Continuer',
  'home.startLesson': 'Commencer la leçon',
  'home.reviewDue': '{n} mots à revoir',
  'home.allReviewed': 'Rien à revoir pour le moment',
  'home.noVoice': 'Aucune voix pour le {lang} sur ce téléphone.',
  'home.installVoice': 'Installer la voix',
  'home.installVoiceWeb': 'Installez-la dans les réglages de synthèse vocale.',
  'home.empty': "Cette langue n'a pas encore de contenu. Ouvrez les réglages et lancez la génération.",
  'home.vocabSub': '{n} mots',
  'home.phrasesSub': 'Exemples réels',
  'home.conjSub': '{n} verbes',
  'home.lessonsSub': '{n} leçons',
  'home.chatSub': 'Parler avec une IA',
  'home.practiceSub': 'Réviser ce que vous avez appris',

  // Vocabulaire
  'vocab.list': 'Liste',
  'vocab.cards': 'Cartes',
  'vocab.write': 'Écrire',
  'vocab.trace': 'Tracer',
  'vocab.search': 'Chercher un mot…',
  'vocab.empty': 'Aucun mot pour cette langue.',
  'vocab.noResult': 'Aucun résultat.',
  'vocab.more': 'Afficher plus ({n})',
  'vocab.know': 'Je sais',
  'vocab.dontKnow': 'À revoir',
  'vocab.show': 'Voir la réponse',
  'vocab.check': 'Vérifier',
  'vocab.next': 'Suivant',
  'vocab.correct': 'Correct',
  'vocab.wrong': 'La réponse était : {answer}',
  'vocab.done': 'Série terminée',
  'vocab.doneHint': 'Les mots reviendront au bon moment grâce à la répétition espacée.',
  'vocab.again': 'Recommencer',
  'vocab.clear': 'Effacer',
  'vocab.typeAnswer': 'Écrivez le mot',

  // Phrases
  'phrases.list': 'Liste',
  'phrases.quiz': 'Quiz',
  'phrases.search': 'Chercher parmi {n} phrases…',
  'phrases.empty': "Pas de phrases d'exemple pour cette langue.",
  'phrases.loading': 'Chargement…',
  'phrases.authors': 'auteurs',
  'phrases.sentenceNo': 'Phrase n°',
  'phrases.score': 'Score',
  'phrases.credit': 'Phrases de Tatoeba (CC BY 2.0 FR). Détails dans Réglages → Sources et licences.',

  // Conjugaison
  'conj.empty': 'Aucun verbe pour cette langue.',
  'conj.table': 'Tableau',
  'conj.quiz': 'Quiz',
  'conj.search': 'Chercher un verbe…',
  'conj.question': 'Conjuguez « {verb} » à {tense}, {person}',
  'conj.note': 'À noter',

  // Leçons
  'lessons.vocabTab': 'Mots',
  'lessons.lesson': 'Leçons',
  'lessons.grammar': 'Grammaire',
  'lessons.course': 'Cours',
  'lessons.empty': 'Aucune leçon pour cette langue.',
  'lessons.back': 'Retour',
  'lessons.phrases': 'Phrases à écouter',
  'lessons.quiz': 'Quiz',
  'lessons.markDone': 'Marquer comme terminée',
  'lessons.done': 'Terminée',
  'lessons.topicPlaceholder': 'Sujet souhaité (facultatif)',
  'lessons.generate': 'Nouvelle leçon avec l’IA',
  'lessons.generateGrammar': 'Nouveau point de grammaire avec l’IA',
  'lessons.wikibooksNote': 'Leçon tirée du Wikilivre « {page} » (CC BY-SA 4.0).',
  'lessons.sourceNote': 'Leçon tirée du guide de conversation Wikivoyage (CC BY-SA 4.0).',
  'lessons.partlyEnglish': 'Les phrases marquées EN n’ont pas de traduction française dans la source.',
  'lessons.translateWithAI': 'Traduire en français avec l’IA',

  // Exercices
  'practice.title': 'Exercices',
  'practice.intro': 'Les exercices portent sur les leçons que vous avez terminées et sur les mots que vous avez vus.',
  'practice.needLesson': 'Terminez au moins une leçon pour débloquer les exercices.',
  'practice.goLessons': 'Aller aux leçons',
  'practice.start': 'Commencer',
  'practice.mixed': 'Révision mixte',
  'practice.fromLesson': 'Leçon : {title}',
  'practice.result': 'Résultat : {ok} sur {n}',
  'practice.retry': 'Refaire',
  'practice.question': 'Question {i} sur {n}',

  // Discussion
  'chat.placeholder': 'Écrivez votre message…',
  'chat.send': 'Envoyer',
  'chat.scenario': 'Situation',
  'chat.newChat': 'Nouvelle conversation',
  'chat.needKey': 'Ajoutez une clé d’API dans les réglages pour discuter.',
  'chat.correction': 'Correction',
  'chat.listen': 'Écouter',
  'chat.thinking': 'L’IA répond…',
  'chat.offline': 'La discussion a besoin d’une connexion. Le reste de l’appli fonctionne hors ligne.',

  // Réglages
  'settings.title': 'Réglages',
  'settings.language': 'Langue étudiée',
  'settings.appLanguage': 'Langue de l’application',
  'settings.appLanguageHint': 'Toute l’interface est traduite dans cette langue.',
  'settings.autoDetect': 'Comme le téléphone',
  'settings.myLanguages': 'Mes langues',
  'settings.addLanguage': 'Ajouter une langue',
  'settings.choose': 'Choisir…',
  'settings.add': 'Ajouter',
  'settings.customName': 'Nom (ex. Wolof)',
  'settings.customCode': 'Code (ex. wo)',
  'settings.customHint': 'Le contenu d’une langue ajoutée est créé par l’IA.',
  'settings.remove': 'Supprimer',
  'settings.ai': 'Intelligence artificielle',
  'settings.provider': 'Fournisseur',
  'settings.apiKey': 'Clé d’API',
  'settings.apiKeyHint': 'La clé est enregistrée uniquement sur ce téléphone et envoyée seulement au fournisseur choisi. L’usage est facturé sur votre compte.',
  'settings.getKey': 'Obtenir une clé',
  'settings.model': 'Modèle',
  'settings.level': 'Mon niveau',
  'settings.autoUpdate': 'Ajouter de nouveaux mots chaque jour à l’ouverture',
  'settings.generate': 'Générer du contenu en {lang}',
  'settings.generateCourse': 'Générer le cours complet en {lang}',
  'settings.generating': 'Génération en cours…',
  'settings.step': 'Étape {i} sur {n} : {label}',
  'settings.stop': 'Arrêter',
  'settings.courseHint': 'Le cours complet ajoute environ 300 mots, 12 verbes, 6 leçons et 6 points de grammaire. Gardez l’écran allumé. Une fois créé, tout fonctionne hors ligne.',
  'settings.voice': 'Voix',
  'settings.speed': 'Vitesse',
  'settings.testVoice': 'Tester la voix',
  'settings.voiceInstalled': 'voix installée sur ce téléphone',
  'settings.voiceMissing': 'voix manquante',
  'settings.installVoices': 'Installer les voix manquantes',
  'settings.missingVoices': 'Voix manquantes : {list}.',
  'settings.data': 'Mes données',
  'settings.dataHint': 'Tout est enregistré sur ce téléphone. Exportez une sauvegarde pour changer d’appareil.',
  'settings.export': 'Exporter',
  'settings.import': 'Importer',
  'settings.reset': 'Tout effacer',
  'settings.resetConfirm': 'Effacer toutes vos données ? Cette action est définitive.',
  'settings.about': 'À propos des données',
  'settings.aboutHint': 'Mots, phrases et définitions intégrés : Tatoeba, JMdict, CC-CEDICT, Wiktionnaire, Wikivoyage.',
  'settings.sources': 'Sources et licences',
  'settings.offline': 'Hors ligne : tout le contenu est déjà sur le téléphone.',

  // Sources
  'sources.title': 'Sources et licences',
  'sources.intro': 'Les mots, phrases et cours intégrés viennent de projets libres. Les fichiers de données de l’appli sont des œuvres dérivées diffusées sous licence CC BY-SA 4.0.',
  'sources.licence': 'Licence',
  'sources.byLanguage': 'Contenu par langue',
  'sources.generatedOn': 'Données générées le {date}.',
  'sources.words': 'mots',
  'sources.sentences': 'phrases',
  'sources.verbs': 'verbes',
  'sources.lessons': 'leçons',
  'sources.englishNote': 'Les définitions marquées EN sont en anglais, faute d’entrée française. Ces contenus viennent de contributeurs bénévoles et n’ont pas tous été relus.',
  'sources.contentLang': 'Les définitions, traductions et leçons intégrées sont en français : elles viennent de sources françaises. Changer la langue de l’application traduit l’interface, pas ce contenu. L’IA peut traduire une leçon à la demande.',
  'sources.handwritten': 'Contenu écrit à la main',
  'sources.handwrittenNote': 'Les mots de départ, conjugaisons, leçons et points de grammaire livrés avec l’appli ont été rédigés par une IA, sans relecture par des locuteurs natifs. C’est en particulier le cas du lituanien et du tagalog : à prendre avec prudence et à confronter à une source fiable.',
  'sources.authorsOf': 'Auteurs des phrases ({n})',
  'sources.showList': 'Afficher la liste',

  'vocab.generate': 'Nouveaux mots avec l’IA',
  'conj.generate': 'Nouveaux verbes avec l’IA',
  'gen.needKey': 'Ajoutez une clé d’API dans les réglages pour utiliser l’IA.',

  // Commun
  'common.back': 'Retour',
  'common.close': 'Fermer',
  'common.cancel': 'Annuler',
  'common.confirm': 'Confirmer',
  'common.loading': 'Chargement…',
  'common.error': 'Une erreur est survenue.',
  'common.retry': 'Réessayer',
  'common.yes': 'Oui',
  'common.no': 'Non',
  'common.of': 'sur',
  'common.english': 'EN',
  'common.englishTip': 'Définition en anglais, faute de source française',

  // Contenus générés
  'quiz.meaning': 'Que signifie « {term} » ?',
  'quiz.say': 'Comment dit-on « {text} » ?',
  'quiz.fill': 'Complète la phrase :',
  'lessons.theme': 'Thème',
  'lessons.rules': 'Règles',
  'content.fallback': 'Ce contenu n’existe pas encore dans votre langue : il est affiché en {lang}.',
  'lessons.path': 'Parcours',
  'lessons.mine': 'Mes leçons',
  'lessons.continue': 'Continuer',
  'lessons.next': 'Leçon suivante',
  'lessons.pathIntro': '{n} leçons, des bases au niveau avancé : chaque niveau alterne règles de grammaire, situations de la vie courante et vocabulaire.',
};

export type Key = keyof typeof fr;
export type Dict = Record<string, string>;

/** Langues dans lesquelles l'interface existe. */
export const UI_LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'lt', label: 'Lietuvių', flag: '🇱🇹' },
  { code: 'tl', label: 'Tagalog', flag: '🇵🇭' },
];

/** Traductions de l'interface vérifiées par un locuteur : aucune pour l'instant, le français mis à part. */
export const UNREVIEWED = new Set(['lt', 'tl', 'ja', 'zh', 'ko', 'it', 'pt', 'de', 'es', 'en']);

const locales = import.meta.glob<Dict>('./locales/*.ts', { import: 'strings' });
const cache = new Map<string, Promise<Dict>>();

export function loadLocale(code: string): Promise<Dict> {
  if (code === 'fr') return Promise.resolve(fr as Dict);
  const loader = locales[`./locales/${code}.ts`];
  if (!loader) return Promise.resolve(fr as Dict);
  let p = cache.get(code);
  if (!p) {
    p = loader().then((d) => ({ ...(fr as Dict), ...d })).catch(() => fr as Dict);
    cache.set(code, p);
  }
  return p;
}

/** Langue de l'interface déduite du téléphone, repli sur le français. */
export function detectLocale(): string {
  const want = (navigator.languages ?? [navigator.language ?? 'fr']).map((l) => l.toLowerCase());
  for (const w of want) {
    const base = w.split('-')[0];
    if (base === 'fil' || base === 'tl') return 'tl';
    if (UI_LANGUAGES.some((l) => l.code === base)) return base;
  }
  return 'fr';
}

export type T = (key: Key | string, vars?: Record<string, string | number>) => string;

export const I18nCtx = createContext<{ t: T; locale: string }>({
  t: (k) => (fr as Dict)[k] ?? String(k),
  locale: 'fr',
});

export function useT(): { t: T; locale: string } {
  return useContext(I18nCtx);
}

/** Remplace les {jetons} d'un modèle par les valeurs fournies. */
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
