# Polyglotte

Application mobile (PWA) pour apprendre les langues, en français.

- **Langues intégrées** : anglais, japonais, lituanien, chinois, tagalog, espagnol, allemand, italien, portugais. D'autres s'ajoutent dans les réglages.
- **Vocabulaire** : liste par thème, cartes à répétition espacée, exercice d'écriture, tracé au doigt pour les écritures non latines.
- **Conjugaison** : tableaux et quiz. Pour le chinois et le tagalog, qui ne conjuguent pas selon la personne, ce sont les aspects et les constructions.
- **Phrases** : plus d'un millier de phrases réelles par langue (Tatoeba) avec traduction française, écoute et quiz.
- **Leçons** : explications, phrases à écouter, quiz.
- **Discussion** : conversation simulée avec Claude, lue à voix haute, avec traduction et correction de vos phrases.
- **Voix** : synthèse vocale du téléphone, dictée au micro quand le navigateur la propose.
- **Données** : tout est enregistré sur le téléphone (`localStorage`), avec export et import d'une sauvegarde. L'appli fonctionne hors ligne, sauf Claude.

## Claude

La discussion et la génération de nouveau contenu (mots, verbes, leçons, contenu complet d'une langue ajoutée) utilisent l'API Claude avec votre clé, saisie dans les réglages. La clé reste sur le téléphone. L'option « mise à jour automatique » ajoute de nouveaux mots une fois par jour à l'ouverture.

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

L'appli utilise le moteur de synthèse vocale d'Android. Une appli ne peut pas installer seule une voix : si la voix d'une langue manque, Polyglotte le détecte (accueil et réglages) et ouvre l'écran d'installation du téléphone, où il suffit de télécharger la voix.

## Contenu

- Intégré, écrit à la main : 99 mots, 4 verbes, 3 leçons et 4 points de grammaire par langue. **Ce contenu a été rédigé par Claude et n'a pas été relu par des locuteurs natifs**, notamment pour le lituanien et le tagalog : à vérifier avant de s'y fier.
- Intégré, issu de sources libres : jusqu'à 2 000 mots avec définition (français quand c'est possible, sinon anglais, marqué [EN]) et 1 200 à 1 900 phrases d'exemple par langue. Le lituanien et le tagalog ont peu de phrases traduites en français (171 et 854) et surtout des définitions anglaises, faute de sources françaises.
- Licences et crédits : `CREDITS.md`, `credits/` (auteurs Tatoeba) et, dans l'appli, Réglages → Sources et licences.
- Généré par Claude : réglages, **Générer le cours complet** (environ 300 mots, 12 verbes, 6 leçons, 6 points de grammaire). Chaque étape est sauvegardée aussitôt.

## Régénérer les données libres

Les fichiers `src/dict/*.json` sont produits par un script (Python 3, bibliothèque standard) :

```bash
cd langues
python3 -I scripts/build-data.py fetch    # télécharge ~3 Go de sources dans scripts/.cache (ignoré par git)
python3 -I scripts/build-data.py build    # écrit src/dict/*.json, CREDITS.md, credits/*.txt
```

Sources : Tatoeba (CC BY 2.0 FR), JMdict (CC BY-SA 4.0), CC-CEDICT (CC BY-SA 4.0), Wiktionnaire et Wiktionary via kaikki.org (CC BY-SA 4.0), FrequencyWords (CC BY-SA 4.0). Les phrases sans auteur sont écartées. Chaque langue est un fragment JavaScript chargé à la demande et embarqué dans l'application (aucun réseau requis, dans l'APK comme en PWA après le premier chargement).

## Développer

```bash
cd langues
npm install
npm run dev                         # http://localhost:3000
npm run build                       # version web dans dist/
npx cap sync android                # copie dist/ dans le projet Android
```

## Organisation

- `src/data/` : contenu écrit à la main (`grammar.ts` pour la grammaire, `extra.ts` pour le second lot de mots, `more.ts` pour l'espagnol, l'allemand, l'italien et le portugais)
- `src/dict/` : dictionnaires et phrases générés par `scripts/build-data.py` (un JSON par langue)
- `scripts/` : script de génération des données
- `src/store.tsx` : état, sauvegarde locale, répétition espacée
- `src/claude.ts` : appels à l'API Claude
- `src/tts.ts` : voix et dictée (natif Android ou navigateur)
- `src/screens/` : les écrans
- `android/` : projet Android généré par Capacitor
