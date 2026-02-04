# ⚡ Test de Courage

Une application interactive et audacieuse qui génère des défis quotidiens pour vous sortir de votre zone de confort. Propulsée par l'IA Gemini 2.0.

## 🚀 Fonctionnalités
- **Défis Personnalisés** : Générés selon votre profil (âge, identité, langue).
- **IA Créative** : Des défis imprévisibles, absurdes ou sociaux, limités à 10 mots.
- **Minuteur Temps Réel** : Suivi de la durée du défi, fonctionnant même en arrière-plan.
- **PWA & Mobile Ready** : Installable sur téléphone via Capacitor.
- **Multilingue** : Supporte FR, EN, ES, DE, IT, PT.

## 🛠 Installation
1. Clonez le dépôt.
2. Installez les dépendances : `npm install`.
3. Ajoutez votre clé API Google Gemini dans les variables d'environnement.

## 📱 Transformer en App Mobile (.aab)
Ce projet utilise **Capacitor**. Pour générer un fichier Android :
1. `npm install @capacitor/android`
2. `npx cap add android`
3. `npx cap sync`
4. Utilisez un service comme **Cloud Build** (EAS ou Ionic Appflow) si vous n'avez pas Android Studio installé.

## 📄 Licence
MIT
