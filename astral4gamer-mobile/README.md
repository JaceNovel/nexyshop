# Astral4Gamer – application mobile (Flutter)

Application client Astral4Gamer (recharges de jeux, cartes cadeaux, A4G Gifts, wallet).
Reconstruction fidèle de la version 1.1.48 (même identifiant `com.astral4gamer.mobile`, même design, même API).

- Version : **1.1.49 (build 2067)**, à augmenter dans `pubspec.yaml` (`version: x.y.z+build`) à chaque envoi aux stores.
- API : `https://api.astral4gamer.com/api` (voir `design-ref/API.md`).
- Design de référence : captures de l'app 1.1.48 dans `design-ref/`.

## Prérequis

- Flutter 3.44 (stable), Dart 3.x
- Android : Android SDK 36, Java 17
- iOS : macOS + Xcode 16+, CocoaPods, compte Apple Developer

```bash
flutter pub get
flutter run                     # appareil connecté
```

## Android (Google Play – fichier .aab)

1. Créer (ou reprendre) la clé d'envoi :
   `keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`
2. Créer `android/key.properties` (ne jamais le publier) :
   ```
   storePassword=...
   keyPassword=...
   keyAlias=upload
   storeFile=/chemin/upload-keystore.jks
   ```
3. Dans `android/app/build.gradle.kts`, déclarer `signingConfigs.release` à partir de `key.properties` et l'utiliser pour `buildTypes.release` (voir la doc Flutter « Build and release an Android app »).
4. `flutter build appbundle --release` → `build/app/outputs/bundle/release/app-release.aab`

> Si l'application existe déjà sur Google Play avec une autre clé, utiliser la clé d'origine
> ou demander une réinitialisation de la clé d'envoi dans la Play Console (Play App Signing).

## iOS (App Store – fichier .ipa)

1. Firebase (notifications) : dans la console Firebase du projet **astral4gamer-c6b10**, ajouter l'app iOS
   `com.astral4gamer.mobile`, télécharger `GoogleService-Info.plist`, puis renseigner `ios` dans
   `lib/firebase_options.dart` (apiKey, appId, messagingSenderId `479702914791`, projectId, iosBundleId).
   Activer la capacité « Push Notifications » et la clé APNs dans Firebase.
2. Ouvrir `ios/Runner.xcworkspace`, choisir l'équipe Apple (Signing & Capabilities).
3. `flutter build ipa --release` → `build/ios/ipa/*.ipa`, à envoyer avec Transporter ou Xcode.

## Points d'attention pour la revue

- Compte de démonstration : voir la fiche store fournie séparément.
- Liens : confidentialité `https://www.astral4gamer.com/confidentialite`,
  suppression de compte `https://www.astral4gamer.com/suppression-compte`, support `https://www.astral4gamer.com/contact`.
- Les achats (crédits de jeux tiers, cartes cadeaux) sont payés hors des systèmes du store
  (Mobile Money, carte via Stripe, crypto, wallet).
- Liens profonds : schéma `astral4gamer://` (auth, payment, wallet, gifts) et `https://astral4gamer.com/g/…`.

## Structure

```
lib/main.dart                     démarrage (Firebase, état, notifications)
lib/src/app.dart                  thème, langues, liens profonds
lib/src/services/                 API, état (session, panier, devise), notifications, mise à jour
lib/src/screens/                  écrans (accueil, catalogue, produit, panier, paiement, crypto,
                                  wallet, A4G Gifts, compte, commandes, suivi, VIP, notifications…)
lib/src/widgets/                  composants (cartes, en-tête, formulaire de connexion…)
assets/images/                    images d'origine de l'app 1.1.48
```
