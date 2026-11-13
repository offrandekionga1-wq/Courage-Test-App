/**
 * Langue d'explication : la langue de l'interface est supposée être celle de l'apprenant, et les
 * définitions, traductions et titres sont fournis dans cette langue. Quand la paire (langue
 * étudiée, langue de l'apprenant) n'existe pas, on se rabat sur l'anglais puis le français, et
 * l'écran le signale.
 */
export const EXPLAIN_LANGS = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];

/** Langues d'explication à essayer, de la préférée à la dernière ressource. */
export function explainChain(locale: string, studied: string): string[] {
  const all = [locale, 'en', 'fr'];
  return all.filter((x, i) => all.indexOf(x) === i && x !== studied && EXPLAIN_LANGS.includes(x));
}

/** Premier fichier existant de la chaîne : [langue d'explication retenue, clé du fichier]. */
export function resolveFile(
  files: Record<string, unknown>,
  studied: string,
  locale: string,
  path: (studied: string, explain: string) => string,
): [explain: string, key: string] | null {
  for (const x of explainChain(locale, studied)) {
    const key = path(studied, x);
    if (key in files) return [x, key];
  }
  return null;
}
