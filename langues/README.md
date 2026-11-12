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

## Lancer

```bash
cd langues
npm install
npm run dev      # développement, http://localhost:3000
npm run build    # version à publier dans dist/
```

Pour l'installer sur un téléphone, publiez le dossier `dist/` sur un hébergement HTTPS (GitHub Pages, Netlify…), ouvrez l'adresse dans Chrome ou Safari, puis « Ajouter à l'écran d'accueil ».

## Organisation

- `src/data/` : contenu intégré de chaque langue
- `src/store.tsx` : état, sauvegarde locale, répétition espacée
- `src/claude.ts` : appels à l'API Claude
- `src/tts.ts` : voix et dictée
- `src/screens/` : les écrans
