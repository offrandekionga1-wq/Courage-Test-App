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
Les fiches de personnages fournies servent de référence : les portraits et les
vignettes du HUD en sont extraits (`public/art/`). Toutes les images manquantes
— poses de combat, animations, effets — sont **dessinées par le code** :
squelette articulé interpolé entre poses clés (`src/art.ts`), animation
secondaire des cheveux et des pans de manteau, et une bibliothèque d'effets
additifs (`src/vfx.ts`) : arcs de lame, cercles runiques, éclairs fractals,
ondes de choc, piliers d'énergie, dômes, sceaux de renard, failles du vide.
Les sons sont synthétisés par la Web Audio API : aucun fichier audio.

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
