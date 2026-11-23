# ⚔️ Neon Clash

Jeu de combat 2D (un contre un) jouable au doigt sur Android, au clavier sur
ordinateur. Quatre champions : **Mika**, **Ray**, **Zen**, **Kira**.

## Le jeu
- **Combat solo** contre l'IA (3 niveaux de difficulté), **duel Wi-Fi** entre
  deux appareils du même réseau, et un mode **entraînement** (jauge pleine,
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
| ◀ ▶ | A / D | ← / → | Avancer · reculer (reculer = garde) |
| ▲ | W | ↑ | Saut |
| ▼ | S | ↓ | S'accroupir |
| ATK | J ou Espace | 1 | Attaque (3 fois = enchaînement) |
| SP | K | 2 | Technique spéciale (change selon la direction) |
| ULT | L | 3 | Super attaque (jauge à 100 %) |

Les quatre touches de direction sont séparées : on peut tenir une diagonale
(saut en avant) en posant le doigt entre deux touches.

## Duel sur le même Wi-Fi
Un joueur choisit **Héberger**, l'autre **Rejoindre** : l'hôte annonce la partie
sur le réseau local (NSD/mDNS) et l'invité la voit apparaître. Si la découverte
est bloquée par la box, l'hôte affiche son adresse IP et l'invité peut la saisir
à la main.

Les deux appareils se parlent en **TCP direct**, sans serveur : le plugin
Android `android/app/src/main/java/com/neonclash/game/LanPlayPlugin.java` ouvre
le socket et publie le service. L'hôte fait autorité — l'invité envoie l'état de
ses touches, l'hôte simule et renvoie un instantané complet, si bien que les
deux écrans ne peuvent pas diverger.

Pour tester au navigateur (où le plugin n'existe pas), un relais de
développement tient lieu de lien :
```bash
node tools/lan-relay.cjs     # ws://localhost:8778
```

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
des mêmes fiches.

Les **effets des techniques spéciales** viennent eux aussi des fiches : la
section « EFFECTS » de chaque planche est découpée en mode halo (l'opacité suit
l'intensité, pour garder le dégradé) et dessinée en additif par-dessus le
combat — boule de feu du renard, pilier, sceau, croissants d'énergie. Le reste
des effets est dessiné par le code (`src/vfx.ts`) : éclairs fractals, ondes de
choc, particules, rémanences.

## Son
Aucune banque de musique libre n'étant accessible depuis l'atelier de
construction, toute la bande-son est **jouée par synthèse** (`src/music.ts`) :
un séquenceur Web Audio avec batterie, basse, nappes et lead, un morceau par
écran, une tonalité par arène, un thème plus tendu quand un combattant est au
bord du K.O., et un accord d'emphase à chaque technique spéciale. Les bruitages
(`src/core.ts`) sont construits en couches : claquement, corps grave, queue
bruitée. Résultat : zéro fichier audio dans l'APK et aucune licence à gérer.

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
