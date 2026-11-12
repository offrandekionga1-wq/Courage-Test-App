// Icônes dessinées au trait, à la place des émojis : même graisse partout, elles prennent la
// couleur du texte et restent nettes à toutes les tailles.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: P) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" {...rest}
    >{children}</svg>
  );
}

export const IconHome = (p: P) => (
  <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" /><path d="M9.5 21v-6h5v6" /></Svg>
);
export const IconVocab = (p: P) => (
  <Svg {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" /><path d="M6.5 8.5h2M6.5 11.5h2M15.5 8.5h2M15.5 11.5h2" /></Svg>
);
export const IconPhrases = (p: P) => (
  <Svg {...p}><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4Z" /><path d="M8 8.5h8M8 11.5h5" /></Svg>
);
export const IconConj = (p: P) => (
  <Svg {...p}><path d="M20 11a8 8 0 1 0-.6 3" /><path d="M20 5v6h-6" /></Svg>
);
export const IconLessons = (p: P) => (
  <Svg {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5Z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" /><path d="M8 8h8" /></Svg>
);
export const IconChat = (p: P) => (
  <Svg {...p}><path d="M7.5 17H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /><path d="M10 11a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1.5L14 21v-3h-2a2 2 0 0 1-2-2Z" /></Svg>
);
export const IconPractice = (p: P) => (
  <Svg {...p}><path d="M6.5 4.5h11l-1 6a4.5 4.5 0 0 1-9 0Z" /><path d="M6.5 6H4.5a2.5 2.5 0 0 0 2.6 2.5M17.5 6h2a2.5 2.5 0 0 1-2.6 2.5" /><path d="M9.5 20h5M12 15v5" /></Svg>
);
export const IconSettings = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.3 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.6 1v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-2.6-1l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1-2.6h-.2a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1-2.6l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 2.6-1v-.2a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 2.6 1l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1 2.6h.2a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9Z" /></Svg>
);
export const IconSpeaker = (p: P) => (
  <Svg {...p}><path d="M4 9.5h3L11.5 6v12L7 14.5H4Z" /><path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" /></Svg>
);
export const IconMic = (p: P) => (
  <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></Svg>
);
export const IconCheck = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7" /></Svg>;
export const IconClose = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IconBack = (p: P) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>;
export const IconNext = (p: P) => <Svg {...p}><path d="m9 5 7 7-7 7" /></Svg>;
export const IconPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Svg>;
export const IconFlame = (p: P) => (
  <Svg {...p}><path d="M12 3s4.5 3.8 4.5 8a4.5 4.5 0 0 1-9 0c0-1.3.4-2.4 1-3.3" /><path d="M12 21a5 5 0 0 0 5-5c0-1.4-.6-2.6-1.4-3.6" /><path d="M12 21a5 5 0 0 1-5-5c0-1.4.6-2.6 1.4-3.6" /></Svg>
);
export const IconTrash = (p: P) => (
  <Svg {...p}><path d="M4.5 6.5h15M9.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5" /><path d="M6.5 6.5 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.5" /></Svg>
);
export const IconDownload = (p: P) => <Svg {...p}><path d="M12 4v11m0 0 4-4m-4 4-4-4" /><path d="M5 19h14" /></Svg>;
export const IconUpload = (p: P) => <Svg {...p}><path d="M12 16V5m0 0 4 4m-4-4L8 9" /><path d="M5 19h14" /></Svg>;
export const IconBook = (p: P) => (
  <Svg {...p}><path d="M12 7.5C10.5 6 8.5 5.5 4.5 5.5V18c4 0 6 .5 7.5 2 1.5-1.5 3.5-2 7.5-2V5.5c-4 0-6 .5-7.5 2Z" /><path d="M12 7.5V20" /></Svg>
);
export const IconGlobe = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5S14.2 18.2 12 20.5c-2.2-2.3-3.4-5.3-3.4-8.5S9.8 5.8 12 3.5Z" /></Svg>
);
export const IconSpark = (p: P) => (
  <Svg {...p}><path d="M12 4.5 13.6 9 18 10.5 13.6 12 12 16.5 10.4 12 6 10.5 10.4 9Z" /><path d="M18 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" /></Svg>
);
export const IconInfo = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.4" /></Svg>;
export const IconWarn = (p: P) => (
  <Svg {...p}><path d="M12 4.5 21 19.5H3Z" /><path d="M12 10v4M12 16.8v.4" /></Svg>
);
export const IconPen = (p: P) => (
  <Svg {...p}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" /><path d="m14.5 7.5 2 2" /></Svg>
);
export const IconCards = (p: P) => (
  <Svg {...p}><rect x="3.5" y="7" width="12" height="13" rx="2" /><path d="M7.5 4h10a2 2 0 0 1 2 2v10" /></Svg>
);

/** Icône de la barre de navigation, choisie par le nom de l'onglet. */
export const TAB_ICONS = {
  home: IconHome, vocab: IconVocab, phrases: IconPhrases, conj: IconConj,
  lessons: IconLessons, chat: IconChat, practice: IconPractice, settings: IconSettings,
} as const;
