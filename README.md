# NEXY

Plateforme gaming/esport full stack: boutique, diamants, tournois Free Fire, live, guildes, missions, récompenses, wallet, admin et analytics.

## Structure

- `frontend/` - Next.js 15 App Router, TypeScript, TailwindCSS, Zustand, TanStack Query, Socket.IO client, PWA.
- `backend/` - Laravel 11 API REST, Sanctum, MySQL, Redis, queues, scheduler, services fournisseurs/paiements.
- `socket-server/` - serveur Socket.IO pour chat live, classements et notifications temps réel.
- `docs/` - notes déploiement et sécurité.

## Démarrage local

```bash
cd frontend
npm install
npm run dev
```

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

```bash
cd socket-server
npm install
npm run dev
```

## Domaines production

- Frontend: Vercel
- API: `https://api.nexy.gg`
- WebSocket: `wss://api.nexy.gg`
