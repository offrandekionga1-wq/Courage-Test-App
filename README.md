# Avatar Live

Application VTuber pour Android : la caméra du téléphone suit ton visage et ton corps, et un avatar 3D reproduit tes mouvements en direct. Tout fonctionne hors ligne, sur le téléphone.

> Cette branche (`claude/avatar-live`) est indépendante du reste du dépôt : elle ne partage aucun fichier avec les autres projets.

## Installer l'application

1. Ouvre la page **Releases** du dépôt et télécharge `AvatarLive.apk` (version « Avatar Live (dernière version) »).
2. Ouvre le fichier sur ton téléphone et autorise l'installation depuis cette source.
3. Au premier lancement, autorise la caméra.

L'APK est recompilé automatiquement à chaque modification de cette branche (onglet **Actions**).

## Ce que fait l'application

- **Visage** : rotation de la tête, regard, clignement de chaque œil séparément, bouche, sourire, sourcils.
- **Corps** : épaules, torse, bras et mains ; jambes, pieds et accroupissement dès que le corps entier est dans l'image.
- **Cadrage automatique** : buste de près, corps entier quand tu recules.
- **Avatars** : import de `.vrm` et de `.glb` avec squelette humanoïde (Mixamo, Ready Player Me…). Les modèles « perfect sync » (52 formes ARKit) sont pilotés directement.
- **Fonds** : couleur unie (dont vert d'incrustation), dégradés, photos, vidéos en boucle, ou caméra réelle.
- **Mode live** : interface masquée, écran maintenu allumé.
- Lip-sync au micro, calibration de la position neutre, effet miroir, caméra arrière.

Non suivi pour l'instant : les doigts.

## Développer

```bash
npm install
npm run build        # construit www/ (télécharge une fois les modèles MediaPipe dans models/)
npm run android      # build + synchronisation + APK debug (Android SDK et Java 21 requis)
```

- `src/app.js` — tracking (MediaPipe Face + Pose), animation des avatars, interface
- `src/index.html` — page et styles
- `scripts/build.mjs` — bundle (esbuild) et copie des ressources embarquées
- `android/` — projet Capacitor

Technologies : MediaPipe Tasks Vision, three.js, @pixiv/three-vrm, Capacitor.
