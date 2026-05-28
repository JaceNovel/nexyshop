# Deploiement NEXY

## Frontend Vercel

- Root: `frontend`
- Build: `npm run build`
- Env:
  - `NEXT_PUBLIC_API_URL=https://api.nexy.gg`
  - `NEXT_PUBLIC_SOCKET_URL=wss://api.nexy.gg`

## Backend Hostinger VPS

- PHP 8.2+, MySQL 8, Redis, Supervisor, Nginx.
- Domaine API: `api.nexy.gg`.
- Workers: `php artisan queue:work redis --tries=3 --backoff=5`.
- Scheduler cron:

```cron
* * * * * cd /var/www/nexy/backend && php artisan schedule:run >> /dev/null 2>&1
```

## Securite production

- Sanctum stateful domains limites a `nexy.gg`.
- Webhooks signes par `X-NEXY-SIGNATURE`.
- Rate limits separes pour API, UID et chat.
- Secrets fournisseurs uniquement dans `.env` backend.
- Logs API audites dans `api_logs`.
- Redis pour cache, queues, sessions et anti-spam.
