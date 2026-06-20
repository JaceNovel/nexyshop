# Bot Discord Astral4Gamer

Bot Discord pour la recherche publique Astral4Gamer.

Important: le bot ne contacte jamais directement les API Free Fire, PUBG ou Fortnite. Toutes les recherches passent par le backend Laravel via `ASTRAL_API_BASE_URL`.

## Commandes

- Dans `DISCORD_SEARCH_CHANNEL_ID`, les membres peuvent ecrire directement `521710963`, `ff 521710963 sg`, `pubg steam Pseudo`, ou `fortnite ID`.
- Les membres peuvent aussi écrire exactement `recharge codm` pour recevoir en privé un assistant CODM avec choix du serveur, liste des packs/prix et lien d'achat du site.
- Le bot peut aussi publier une annonce CODM dans l'accueil avec image, prix dynamiques et bouton qui ouvre l'assistant privé.
- `/profil jeu identifiant region plateforme` - recherche slash optionnelle, gardee en secours.
- `/quota` - affiche le quota Discord restant.
- `/site` - donne le lien vers la recherche officielle du site.
- `/aide` - explique aux membres comment utiliser le bot.

## Modules par salon

Le bot peut aussi repondre sans commande slash dans des salons dedies. Renseigne les IDs dans `.env`:

- `DISCORD_TOURNAMENT_CHANNEL_ID` - annonces tournois, reactions, liens inscription/resultats.
- `DISCORD_SHOP_CHANNEL_ID` - boutique, suivi commande, support achat.
- `DISCORD_LIVE_CHANNEL_ID` - live, replays, videos.
- `DISCORD_SUPPORT_CHANNEL_ID` - tickets par fils publics.
- `DISCORD_COMMUNITY_CHANNEL_ID` - roles, regles, giveaways, evenements.
- `DISCORD_PARTNER_CHANNEL_ID` - demandes partenaires/sponsors.
- `DISCORD_CODM_CHANNEL_ID` - optionnel, limite le déclencheur `recharge codm` à un salon précis.
- `DISCORD_CODM_ANNOUNCEMENT_CHANNEL_ID` - optionnel, salon où publier l'annonce CODM au démarrage. Par défaut: `DISCORD_WELCOME_CHANNEL_ID`.
- `DISCORD_CODM_ARROW_EMOJI` - optionnel, supporte un emoji flèche custom, y compris animé, par exemple `<a:blue_arrow:123456789012345678>`.
- `ASTRAL_CODM_ANNOUNCEMENT_IMAGE_URL` - optionnel, image/affiche de l'annonce CODM. Sinon le bot utilise l'image du produit CODM renvoyée par l'API.
- `ASTRAL_CODM_ANNOUNCEMENT_IMAGE_PATH` - optionnel, chemin local vers l'affiche CODM à joindre directement au message Discord. Prioritaire sur l'URL distante.

Pour que les membres puissent ecrire directement sans `/`, active **Message Content Intent** dans le Discord Developer Portal, puis relance le bot.

Permissions recommandees:

- Voir les salons
- Envoyer des messages
- Integrer des liens
- Ajouter des reactions
- Creer des fils publics
- Envoyer des messages dans les fils
- Gerer les messages, uniquement si `DISCORD_TOURNAMENT_READONLY=true`

Pour éviter que les membres ne devinent pas les commandes slash, renseigne `DISCORD_WELCOME_CHANNEL_ID` avec l'ID d'un salon public. Au démarrage, le bot y publiera une fois un panneau d'aide à épingler.

## Limites

- 20 recherches par utilisateur par 24h par défaut.
- Cache local bot de 72h par identifiant.
- Le backend garde aussi son cache API côté Laravel.

## Démarrage

```bash
cd discord-bot
npm install
cp .env.example .env
npm run register
npm run dev
```

Avant `npm run register`, crée l'application Discord, ajoute le bot, puis remplis:

- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID` pour enregistrer les commandes sur un serveur de test.

Quand la communauté Discord sera créée, invite le bot avec les permissions `applications.commands` et `bot`.
