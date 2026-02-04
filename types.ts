
export type Language = 'Français' | 'English' | 'Español' | 'Deutsch' | 'Italiano' | 'Português';

export type Identity = 
  | 'Homme' 
  | 'Femme' 
  | 'Non-binaire' 
  | 'Genderfluid' 
  | 'Agender' 
  | 'Bigender' 
  | 'Pangender' 
  | 'Queer' 
  | 'Questionnement'
  | 'Trans-homme'
  | 'Trans-femme'
  | 'Cis-homme'
  | 'Cis-femme'
  | 'Hétérosexuel'
  | 'Homosexuel'
  | 'Bisexuel'
  | 'Pansexuel'
  | 'Asexuel'
  | 'Demisexuel';

export interface UserProfile {
  identity: Identity;
  birthDate: string;
  name: string;
  language: Language;
}

export interface DailyChallenge {
  id: string;
  date: string;
  title: string;
  description: string;
  category: string; 
  difficulty: string; 
  reasoning: string;
  isAccepted?: boolean;
  isCompleted?: boolean;
  acceptedAt?: number; 
  completedAt?: number; 
}

export interface AppState {
  user: UserProfile | null;
  currentChallenge: DailyChallenge | null;
  history: DailyChallenge[];
}

export const UI_TRANSLATIONS: Record<Language, any> = {
  'Français': {
    appName: 'Courage',
    welcome: 'Salut',
    identity: 'Identité',
    birthDate: 'Naissance',
    language: 'Langue',
    start: 'Commencer',
    accept: "Relever le défi",
    done: "C'est fait",
    share: 'Partager',
    congrats: 'Victoire !',
    congratsSub: "Vous avez brisé une barrière aujourd'hui.",
    another: 'Un autre ?',
    history: 'Archives',
    level: 'Lvl',
    reset: 'Reset',
    onboardingSub: 'Prêt à sortir de la zone ?',
    generateFirst: 'Premier défi',
    loading: 'Analyse de vos limites...',
    timer: 'Timer',
    duration: 'Temps'
  },
  'English': {
    appName: 'Courage',
    welcome: 'Hey',
    identity: 'Identity',
    birthDate: 'Birth Date',
    language: 'Language',
    start: 'Start',
    accept: 'Accept',
    done: 'Done',
    share: 'Share',
    congrats: 'Victory!',
    congratsSub: 'You broke a barrier today.',
    another: 'Next?',
    history: 'Records',
    level: 'Lvl',
    reset: 'Reset',
    onboardingSub: 'Ready to escape?',
    generateFirst: 'First challenge',
    loading: 'Analyzing your limits...',
    timer: 'Timer',
    duration: 'Time'
  },
  'Español': {
    appName: 'Valor',
    welcome: 'Hola',
    identity: 'Identidad',
    birthDate: 'Nacimiento',
    language: 'Idioma',
    start: 'Empezar',
    accept: 'Aceptar',
    done: 'Hecho',
    share: 'Compartir',
    congrats: '¡Victoria!',
    congratsSub: 'Has roto una barrera hoy.',
    another: '¿Otro?',
    history: 'Archivos',
    level: 'Nvl',
    reset: 'Reiniciar',
    onboardingSub: '¿Listo?',
    generateFirst: 'Primer reto',
    loading: 'Analizando límites...',
    timer: 'Cronómetro',
    duration: 'Tiempo'
  },
  'Deutsch': {
    appName: 'Mut',
    welcome: 'Hey',
    identity: 'Identität',
    birthDate: 'Geburt',
    language: 'Sprache',
    start: 'Start',
    accept: 'Annehmen',
    done: 'Erledigt',
    share: 'Teilen',
    congrats: 'Sieg!',
    congratsSub: 'Du hast heute eine Grenze überschritten.',
    another: 'Nächste?',
    history: 'Rekorde',
    level: 'Lvl',
    reset: 'Reset',
    onboardingSub: 'Bereit?',
    generateFirst: 'Erste Mutprobe',
    loading: 'Grenzen werden analysiert...',
    timer: 'Timer',
    duration: 'Zeit'
  },
  'Italiano': {
    appName: 'Coraggio',
    welcome: 'Ehi',
    identity: 'Identità',
    birthDate: 'Nascita',
    language: 'Lingua',
    start: 'Inizia',
    accept: 'Accetta',
    done: 'Fatto',
    share: 'Condividi',
    congrats: 'Vittoria!',
    congratsSub: 'Hai superato un limite oggi.',
    another: 'Ancora?',
    history: 'Archivio',
    level: 'Lvl',
    reset: 'Resetta',
    onboardingSub: 'Pronto?',
    generateFirst: 'Prima sfida',
    loading: 'Analisi dei limiti...',
    timer: 'Timer',
    duration: 'Tempo'
  },
  'Português': {
    appName: 'Coragem',
    welcome: 'Olá',
    identity: 'Identidade',
    birthDate: 'Nascimento',
    language: 'Idioma',
    start: 'Começar',
    accept: 'Aceitar',
    done: 'Feito',
    share: 'Partilhar',
    congrats: 'Vitória!',
    congratsSub: 'Você quebrou uma barreira hoje.',
    another: 'Próximo?',
    history: 'Registos',
    level: 'Lvl',
    reset: 'Reset',
    onboardingSub: 'Pronto?',
    generateFirst: 'Primeiro desafio',
    loading: 'Analisando limites...',
    timer: 'Timer',
    duration: 'Tempo'
  }
};
