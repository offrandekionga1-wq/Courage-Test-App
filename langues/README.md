# Polyglotte

Application mobile pour apprendre les langues, qui fonctionne **entièrement hors ligne** une fois installée.

- **Langues intégrées** : anglais, espagnol, allemand, italien, portugais, japonais, chinois, lituanien, tagalog. D'autres s'ajoutent dans les réglages.
- **Langue de l'interface** : française par défaut, et traduisible dans les dix langues ci-dessus. Détectée d'après le téléphone au premier lancement, modifiable dans les réglages.
- **Vocabulaire** : jusqu'à 25 000 mots par langue, classés par fréquence, avec définition, phrase d'exemple, cartes à répétition espacée, exercice d'écriture et tracé au doigt pour les écritures non latines.
- **Phrases** : jusqu'à 40 000 phrases réelles par langue avec leur traduction, consultables, écoutables et jouables en quiz.
- **Conjugaison** : jusqu'à 3 000 verbes par langue avec leurs tableaux complets, plus un quiz.
- **Leçons** : une progression complète, du niveau A1 au niveau C1 — leçons de vocabulaire par thème et par niveau, cours par situation (saluer, se déplacer, manger, urgences…) et cours de grammaire.
- **Japonais** : les furigana s'affichent au-dessus des kanji dans toutes les phrases d'exemple.
- **Exercices** : des questions construites à partir des leçons que vous avez terminées et des mots déjà vus.
- **Discussion** : conversation simulée avec l'IA de votre choix, lue à voix haute, avec traduction et correction.
- **Voix** : synthèse vocale du téléphone, dictée au micro quand l'appareil la propose.
- **Données** : tout est enregistré sur le téléphone (`localStorage`), avec export et import d'une sauvegarde.

## Ce qui marche sans réseau, et ce qui n'en a pas besoin

Tout le contenu (mots, phrases, conjugaisons, leçons, exercices, voix) est embarqué dans l'application : **aucune connexion n'est nécessaire**. Seules la discussion avec l'IA et la génération de contenu supplémentaire passent par le réseau.

## Intelligence artificielle

La discussion et la génération de contenu acceptent plusieurs fournisseurs, au choix dans les réglages : **Claude (Anthropic), Gemini (Google), ChatGPT (OpenAI), Mistral, DeepSeek, Groq et OpenRouter**. Vous entrez la clé d'API du fournisseur que vous utilisez ; elle reste sur le téléphone et n'est envoyée qu'à ce fournisseur. L'usage est facturé sur votre compte chez lui. Une clé par fournisseur est conservée, pour pouvoir changer sans la ressaisir.

## Installer sur un téléphone Android

L'APK est compilé par GitHub (workflow `.github/workflows/android.yml`) à chaque envoi de code :

1. Sur GitHub, onglet **Actions**, ouvrez la dernière exécution « Polyglotte APK ».
2. Téléchargez l'artefact **polyglotte-apk** (un zip contenant `app-debug.apk`).
3. Copiez l'APK sur le téléphone, ouvrez-le et autorisez l'installation depuis cette source.

Pour pouvoir installer les mises à jour par-dessus la version précédente, l'APK doit toujours être signé par la même clé. Créez-la une fois :

```bash
keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey \
  -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
base64 -w0 debug.keystore   # à coller dans un secret GitHub nommé DEBUG_KEYSTORE_BASE64
```

Sans ce secret, chaque APK a une signature différente et il faut désinstaller l'ancienne version avant d'installer la nouvelle (vous perdez alors les données locales : pensez à exporter une sauvegarde).

## Voix

L'appli utilise le moteur de synthèse vocale d'Android. **Une application ne peut pas installer une voix elle-même** : Android ne le permet pas. Polyglotte détecte les voix manquantes, le signale au premier lancement et sur l'accueil, et ouvre l'écran d'installation du téléphone, où il suffit de télécharger la voix voulue.

## Contenu

### Issu de sources libres

| Langue | Mots | Phrases | Verbes conjugués | Leçons de vocabulaire | Situations | Grammaire |
|---|---|---|---|---|---|---|
| Anglais | 25 000 | 40 000 | 549 | 1043 | 11 | 81 |
| Espagnol | 13 700 | 40 000 | 3 000 | 592 | 14 | 8 |
| Allemand | 24 157 | 40 000 | 3 000 | 1029 | 15 | 51 |
| Italien | 19 702 | 40 000 | 3 000 | 847 | 13 | 6 |
| Portugais | 11 986 | 40 000 | 3 000 | 525 | 14 | 10 |
| Lituanien | 4 102 | 7 779 | — | 196 | 14 | — |
| Tagalog | 4 438 | 36 613 | 1 830 | 212 | 14 | — |
| Japonais | 25 000 | 40 000 | 3 000 | 1038 | 14 | 103 |
| Chinois | 25 000 | 40 000 | — | 1042 | 13 | 10 |

Soit **6915 leçons** au total. Chiffres détaillés et à jour dans `CREDITS.md` et dans l'appli (Réglages → Sources et licences).

### Limites à connaître

- **Le contenu intégré est en français.** Changer la langue de l'application traduit l'interface, pas les définitions ni les traductions. L'IA peut traduire une leçon à la demande.
- **Définitions en anglais** là où le Wiktionnaire français n'a pas d'entrée : massif pour le lituanien et le tagalog, et pour une partie du chinois et du japonais. Elles sont marquées « EN » dans l'appli.
- **Traductions anglaises des phrases** : quand Tatoeba n'a pas de traduction française, l'anglaise est utilisée et signalée. C'est le cas de la plupart des phrases en lituanien et en tagalog, et d'une bonne partie ailleurs. Sans ce repli, le lituanien n'aurait que 171 phrases au lieu de 7 779.
- **Lituanien** : pas de conjugaison, car l'export du Wiktionary marque ses formes personnelles comme non reconnues ; les mettre dans l'appli aurait risqué d'enseigner des formes fausses.
- **Titres des leçons de vocabulaire** : le thème vient des catégories du Wiktionnaire. Les mots les plus fréquents en ont rarement une, d'où beaucoup de leçons « Noms courants », « Verbes courants ». Les thèmes précis (la cuisine, le corps, la musique…) apparaissent surtout à partir de B1.
- **Chinois** : pas de conjugaison, la langue n'en a pas ; les constructions correspondantes sont dans les leçons.
- **Contenu écrit à la main non relu** : les mots de départ, conjugaisons, leçons et points de grammaire livrés avec l'appli ont été rédigés par une IA, **sans relecture par un locuteur natif**. C'est en particulier le cas du lituanien et du tagalog. Même réserve pour les traductions de l'interface dans les langues autres que le français.
- **Qualité des définitions** : elles viennent de contributeurs bénévoles et ne sont pas relues une à une ; certaines sont surprenantes ou trop générales.

### Généré à la demande

Réglages, **Générer le cours complet** : environ 300 mots, 12 verbes, 6 leçons et 6 points de grammaire, en 27 requêtes au fournisseur d'IA choisi. Chaque étape est sauvegardée aussitôt et fonctionne ensuite hors ligne.

## Régénérer les données libres

Les fichiers `src/dict/*.json` sont produits par des scripts Python (bibliothèque standard uniquement) :

```bash
cd langues
python3 -I scripts/fetch-conjugations.py     # tables de conjugaison (gros fichiers traités en flux)
python3 -I scripts/build-data.py fetch       # sources Tatoeba, JMdict, CC-CEDICT, Wiktionnaire, fréquences
python3 -I scripts/build-data.py build       # écrit src/dict/*.json, CREDITS.md, credits/*.txt
python3 -I scripts/build-courses.py          # leçons par situation, guides Wikivoyage
python3 -I scripts/build-lessons.py          # progression A1 → C1, par thème et par niveau
python3 -I scripts/build-grammar.py          # cours de grammaire des Wikilivres
```

`CACHE_DIR` choisit où sont stockées les sources téléchargées (défaut : `scripts/.cache`, ignoré par git). `build-data.py build fr es` ne reconstruit que les langues indiquées.

Sources : Tatoeba (CC BY 2.0 FR), Wikivoyage et Wikilivres (CC BY-SA 4.0), JMdict (CC BY-SA 4.0), CC-CEDICT (CC BY-SA 4.0), Wiktionnaire et Wiktionary via kaikki.org (CC BY-SA 4.0), FrequencyWords (CC BY-SA 4.0). Les phrases sans auteur sont écartées, faute de pouvoir citer leur source. Chaque langue forme un fragment chargé à la demande, embarqué dans l'application.

## Développer

```bash
cd langues
npm install
npm run dev                         # http://localhost:3000
npm run build                       # version web dans dist/
npx cap sync android                # copie dist/ dans le projet Android
```

## Organisation

- `src/data/` : contenu écrit à la main (`grammar.ts`, `extra.ts`, `more.ts` pour espagnol, allemand, italien, portugais)
- `src/dict/` : dictionnaires, phrases, conjugaisons et cours générés par les scripts (un JSON par langue)
- `src/locales/` : traductions de l'interface, une par langue
- `src/i18n.ts` : chaînes de référence (français) et chargement des traductions
- `src/ai.ts` : couche commune aux fournisseurs d'IA ; `src/generate.ts` : conversation et génération de contenu
- `src/dict.ts`, `src/course.ts` : chargement paresseux du contenu embarqué
- `src/store.tsx` : état, sauvegarde locale, répétition espacée
- `src/icons.tsx`, `src/styles.css` : icônes dessinées et feuille de styles
- `src/screens/` : les écrans
- `scripts/` : génération des données
- `android/` : projet Android généré par Capacitor
