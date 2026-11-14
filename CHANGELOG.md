# Versions d'Avatar Live

Le numéro de version est affiché en bas de l'onglet « Écran » des réglages, et dans le nom du fichier APK.

## v1.3.0

- Corrigé : en superposition, forcer l'orientation de l'avatar faisait aussi tourner l'image de la caméra. Le visage n'était plus reconnu : bouche figée, tête immobile, corps incohérent. L'image suit maintenant uniquement la position réelle du téléphone.
- Si aucun visage droit n'est trouvé, l'appli essaie seule les autres sens de l'image, puis garde celui qui fonctionne.
- Lip-sync : l'ouverture, l'étirement et l'arrondi de la bouche sont mesurés directement sur les lèvres, en plus des scores de MediaPipe. La bouche réagit aussi quand on parle doucement, et un sourire ne déclenche plus le son « i ».
- Clignements : les paupières sont mesurées directement, pour une fermeture franche.
- Corps : une pose qui n'appartient pas au visage suivi (autre personne, fausse détection) est ignorée.
- Fenêtre flottante sans fond : le bas de l'avatar se fond au lieu d'être coupé net.

## v1.2.1

- Fenêtre flottante : l'avatar n'est plus coupé. Elle cadre toujours l'avatar au centre, et un modèle sans squelette (buste, tête) est montré en entier, dans l'appli aussi.
- Orientation de l'avatar (Auto / Vertical / Horizontal) : c'est l'avatar qui se tourne, pas l'application. En Auto, il reste droit quelle que soit la position du téléphone, et la caméra continue de te suivre téléphone couché.
- Le réglage « Orientation de l'écran » de l'application est retiré.

## v1.2.0

- Fond « Aucun » : plus rien derrière l'avatar.
- Superposition : l'avatar reste affiché dans une fenêtre flottante par-dessus les autres applis et les jeux (format vertical, horizontal ou carré, taille réglable, déplaçable).
- Orientation de l'écran réglable : auto, vertical ou horizontal.
- Bras caché : un poignet situé derrière le torse, ou annoncé visible de près sans qu'aucune main n'y soit détectée, n'est plus suivi ; l'avant-bras retombe naturellement.
- Numéros de version : dans l'appli, dans le nom de l'APK et sur la page Releases.

## v1.1.0

- Suivi des doigts des deux mains et orientation complète de la paume.
- Mains et bras stabilisés (filtre One Euro, membres hors champ ramenés au repos).
- Clignements à amplitude adaptative, yeux synchronisés hors clin d'œil.
- Lip-sync par visèmes A / I / U / E / O, renforcé par le micro.

## v1.0.0

- Première version Android : suivi du visage et du corps entier, cadrage automatique.
- Import d'avatars .vrm et .glb, fonds photo et vidéo en boucle.
- Tout le tracking est embarqué dans l'application.
