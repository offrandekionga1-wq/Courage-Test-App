# Polyglotte

Application mobile (PWA) pour apprendre les langues, en français.

- **Langues de départ** : anglais, japonais, lituanien, chinois, tagalog. D'autres s'ajoutent dans les réglages.
- **Vocabulaire** : liste par thème, cartes à répétition espacée, exercice d'écriture, tracé au doigt pour les écritures non latines.
- **Conjugaison** : tableaux et quiz. Pour le chinois et le tagalog, qui ne conjuguent pas selon la personne, ce sont les aspects et les constructions.
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

- Intégré : 99 mots, 4 verbes, 3 leçons et 4 points de grammaire par langue de départ.
- Généré par Claude : réglages, **Générer le cours complet** (environ 300 mots, 12 verbes, 6 leçons, 6 points de grammaire). Chaque étape est sauvegardée aussitôt.

## Développer

```bash
cd langues
npm install
npm run dev                         # http://localhost:3000
npm run build                       # version web dans dist/
npx cap sync android                # copie dist/ dans le projet Android
```

## Organisation

- `src/data/` : contenu intégré (`grammar.ts` pour la grammaire, `extra.ts` pour le second lot de mots)
- `src/store.tsx` : état, sauvegarde locale, répétition espacée
- `src/claude.ts` : appels à l'API Claude
- `src/tts.ts` : voix et dictée (natif Android ou navigateur)
- `src/screens/` : les écrans
- `android/` : projet Android généré par Capacitor
