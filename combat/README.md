# ⚔️ Neon Clash

Jeu de combat 2D (un contre un) jouable au doigt sur Android, au clavier sur
ordinateur. Quatre champions : **Mika**, **Ray**, **Zen**, **Kira**.

## Le jeu
- **Combat solo** contre l'IA (3 niveaux de difficulté), **2 joueurs** sur le
  même appareil ou au clavier, et un mode **entraînement** (jauge pleine,
  adversaire passif).
- Match en 2 manches gagnantes, 90 secondes par manche, K.O. au ralenti.
- Chaque personnage possède : un enchaînement de 3 coups, un uppercut, un coup
  lourd, une attaque aérienne, **4 techniques spéciales** et un **super** qui
  consomme la jauge pleine.
- Animations tirées des fiches de personnage : repos, course, saut, chute,
  réception et sept poses d'attaque par combattant.

## Commandes
| Tactile | Clavier (J1) | Clavier (J2) | Action |
|---|---|---|---|
| Stick | A / D | ← / → | Avancer · reculer (reculer = garde) |
| Stick ↑ | W | ↑ | Saut |
| Stick ↓ | S | ↓ | S'accroupir |
| ATK | J ou Espace | 1 | Attaque (3 fois = enchaînement) |
| SP | K | 2 | Technique spéciale (change selon la direction) |
| ULT | L | 3 | Super attaque (jauge à 100 %) |

Les techniques spéciales dépendent de la direction tenue : neutre = projectile,
avant = charge, haut = anti-aérien, arrière = barrière défensive.

## Fabrication des visuels

Les combattants à l'écran **sont les sprites des fiches de personnage**, pas des
dessins refaits : `tools/cut_sprites.py` découpe chaque rangée des planches
(repos, déplacement, saut, chute, attaques), détoure les silhouettes et écrit un
atlas `public/art/<perso>-sprites.webp` plus ses métadonnées JSON.

Le détourage ne peut pas se faire au simple seuil : sur trois fiches le fond est
noir **et** les vêtements aussi. Le script part donc des pixels clairs ou
colorés, les épaissit pour refermer le contour, ne conserve que la plus grosse
composante connexe (les figures voisines et les bandeaux de la planche
disparaissent), rebouche les petits creux, puis ramène le bord. La fiche de Kira
est sur fond blanc : là, le personnage est entièrement « encre » et la
silhouette est prise telle quelle.

Deux repères sont calculés par image : l'abscisse d'appui (centre des pieds, et
non de la boîte, pour que les poses dont l'effet déborde d'un côté restent
alignées) et l'ordonnée des pieds (les vignettes ajoutent une ombre sous le
personnage, qui le ferait flotter). Chaque rangée des planches étant dessinée à
une échelle différente, un facteur par groupe ramène toutes les poses à la
taille de la pose debout.

Portraits des cartes, de l'écran VS et de la victoire, vignettes du HUD : extraits
des mêmes fiches. Les effets, eux, sont dessinés par le code (`src/vfx.ts`) :
arcs de lame, cercles runiques, éclairs fractals, ondes de choc, piliers
d'énergie, dômes, sceaux de renard, failles du vide, particules additives. Les
sons sont synthétisés par la Web Audio API : aucun fichier audio.

### Re-découper les sprites
Les planches sources ne sont pas versionnées (≈ 10 Mo). Indiquez leur dossier
dans `tools/sheets.json` (clé `dir`), puis :
```bash
python3 tools/cut_sprites.py tools/sheets.json /tmp/controle public/art
```
`/tmp/controle` reçoit une planche de contrôle indexée par personnage, pratique
pour ajuster les rectangles de bandes, les comptes d'images et la liste `drop`.

## Développement
```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # vérification TypeScript + bundle dans dist/
```

## APK Android
Le projet natif (`android/`) est généré par Capacitor et versionné.
L'APK est construit par GitHub Actions — workflow
`.github/workflows/combat-apk.yml` : il se déclenche à chaque poussée touchant
`combat/`, et dépose l'APK dans l'artefact `neon-clash-apk`.

Localement (avec le SDK Android installé) :
```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```
