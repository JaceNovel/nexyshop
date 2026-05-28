# Plateforme vidéo NEXY

## Variables `.env`

```env
YOUTUBE_API_KEY=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://localhost:8000/api/admin/youtube/callback
OPENAI_API_KEY=
OBS_WEBSOCKET_URL=
OBS_WEBSOCKET_PASSWORD=
APP_FRONTEND_URL=http://localhost:3000
APP_BACKEND_URL=http://localhost:8000
MONEROO_PUBLIC_KEY=
MONEROO_SECRET_KEY=
MONEROO_WEBHOOK_SECRET=
MONEROO_BASE_URL=https://api.moneroo.io
MONEROO_RETURN_URL=http://localhost:8000/api/payments/moneroo/return
MONEROO_FRONTEND_RETURN_URL=http://localhost:3000/checkout/return
```

## Installation locale

```bash
cd backend
php artisan migrate --seed
php artisan queue:work
```

```bash
cd frontend
npm run dev
```

## Routes utiles

- `GET /api/replays`
- `GET /api/replays/{slug}`
- `GET /api/highlights`
- `GET /api/streams/current`
- `GET /api/admin/youtube/redirect`
- `POST /api/admin/youtube/lives`
- `POST /api/admin/replays/{replay}/analyze`
- `POST /api/admin/replay-moments/{moment}/highlight`
- `POST /api/admin/streams/{stream}/markers`
- `GET /api/admin/obs/status`

Les routes admin restent protegees par Sanctum et `can:admin`. Les secrets YouTube, OpenAI et OBS restent uniquement cote Laravel.
