# API NEXY

Base URL: `https://api.nexy.gg/api`

- `GET /health`
- `GET /home`
- `GET /products`
- `POST /admin/suppliers/item4gamer/sync`
- `GET /admin/suppliers/item4gamer/balance`
- `GET /admin/suppliers/item4gamer/orders?order_id=72466`
- `POST /player/verify`
- `POST /orders`
- `POST /payments/moneroo/initiate`
- `POST /payments/webhook/moneroo`
- `GET /tournaments`
- `POST /tournaments/{id}/register`
- `GET /lives/current`
- `GET /leaderboards`
- `POST /guilds`
- `POST /missions/{id}/claim`
- `GET /admin/analytics`

Les integrations fournisseurs sont abstraites via `SupplierGateway`: Item4Gamer, SEAGM et UniPin peuvent etre remplaces sans toucher aux controleurs.

## Item4Gamer

Ajouter dans `.env` backend:

```env
ITEM4GAMER_KEY=ta_cle_api
ITEM4GAMER_BASE_URL=https://item4gamer.com/wp-json/reseller/v1
```

Puis synchroniser les vrais produits:

```bash
php artisan nexy:sync-item4gamer
```

Si Item4Gamer retourne `403 IP address not allowed`, demander au support Item4Gamer d'autoriser l'adresse IP publique du serveur backend. Pour la production Hostinger, l'IP autorisee doit etre `46.202.189.252`.

Important: la synchronisation Item4Gamer doit etre lancee depuis le VPS Hostinger autorise, pas depuis l'environnement de preview local.

La commande desactive les anciens produits demo et importe les produits/variations Item4Gamer. Si les endpoints catalogue exacts fournis par Item4Gamer sont differents, ajuster:

```env
ITEM4GAMER_CATEGORIES_ENDPOINT=/...
ITEM4GAMER_PRODUCTS_ENDPOINT=/...
ITEM4GAMER_VARIATIONS_ENDPOINT=/...
```
