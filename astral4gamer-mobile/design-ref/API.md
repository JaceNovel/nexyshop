# Astral4Gamer mobile API reference

Source: production Laravel backend `/home/astral4gamer-app/backend` (routes/api.php + routes/payment-routing.php), read 2026-11-21. Live values (config, enums, samples) taken from prod read-only.

## 0. Conventions

- Base URL: `https://api.astral4gamer.com/api`
- Auth: `Authorization: Bearer <sanctum token>` (token = `"<id>|<40 chars>"`). Tokens never expire (`sanctum.expiration = null`). Send `Accept: application/json` always (otherwise auth failures redirect instead of 401).
- Errors:
  - 401 `{"message":"Unauthenticated."}`
  - 422 validation: `{"message":"The email field must be a valid email address. (and 2 more errors)","errors":{"email":["..."],"code":["..."]}}`
  - `abort()` errors (403/404/409/422/423/503): `{"message":"<French text>"}` only.
  - 429 throttling.
- Throttles: `api` 240/min (reads, per user or IP); `lookup` 40/min per IP + 10/min per uid; `uid` 12/min per IP; `auth-session` 120/min per IP.
- Player lookups (`player/verify`, `freefire/profile`) are protected by `protect.player.lookup`: allowed if Bearer token valid, OR request has **no `Origin` header and User-Agent matches exactly `^Dart/\d+\.\d+ \(dart:io\)$`** (default dart:io UA). Otherwise 403 `{"code":"lookup_access_denied","message":"...","verified":false}`. Do not override the UA in Dio/http.
- Money typing (important for JSON parsing):
  - Hand-built payloads (products, `GET orders`, tracking, wallet, gifts, options) return **numbers** (int or float, e.g. `650`, `0.02`).
  - Raw Eloquent models (`POST orders` order, `payment` objects, `order` in wallet pay) return `decimal(12,2)` columns as **strings** (`"650.00"`) when read from DB, numbers when just assigned. Parse `amount` as `num | String`.
- IDs: ints in most places; strings in `GET orders/{id}/tracking` (`id`, `productId`), wallet transactions, notifications (`id`), VIP history.
- Dates: ISO-8601. Model timestamps `"2026-11-21T16:11:49.000000Z"`; hand-built ones `"2026-11-21T16:11:49+00:00"`.
- Order public reference: `"A4G-" + zero-pad(order.id, 6)` e.g. id 17941 -> `A4G-017941`. Computed only; not a DB column; not accepted as a route key (routes take numeric id).

## 1. Currency / FX

- Canonical public currency is **XOF** (FCFA, 0 decimals). Every product/variation sold through the live supplier is priced in XOF. Wallets are XOF (USD wallets are locked: 423).
- Fixed backend rates (config, not an endpoint): `USD->XOF = 610`, `EUR->XOF = 660`. Used for wallet debit, gift goals, VIP spend.
- **No FX endpoint for EUR display exists.** For an EUR display toggle compute client-side `eur = xof / 660` (same rate backend uses for EUR top-ups). Payment always charges XOF (or provider local currency via quote).
- Mobile Money quotes use `open.er-api.com` USD rates with XOF/XAF/EUR pinned to the config rates.
- Inconsistencies: `GET products/categories[].min_price` is **USD** supplier-based retail (e.g. `0.02`), no currency key. Legacy orders may be `USD` (4517 of 18230). VIP `spend` is USD.
- `GET /api/crypto/quote?amount=&currency=&crypto_currency=` (public) exists for crypto quotes only.

## 2. Auth

### POST auth/mobile/session — public (throttle auth-session)
Body: `email` required|email|max:255; `password` required|string|max:255.
200:
```json
{"token":"123|abc...","user":{"id":123,"name":"jean","email":"jean@x.com","avatar_url":null}}
```
422 `{"message":"Aucun compte ne correspond à cette adresse e-mail."}` / `"Identifiants incorrects."` / migrated Clerk user with wrong password: reset code e-mailed + `"Mot de passe invalide. Un code de réinitialisation vient d’être envoyé..."` (then use password/reset).

### POST auth/mobile/register — public
Body: `email` required|email|max:255; `password` required|min:8|max:255|confirmed (send `password_confirmation`); `country` required|size:2 (ISO alpha-2, stored uppercased); `game` required|in:`free_fire,pubg,fortnite,other`; `player_uid` nullable|max:80|required_unless:game,other; `free_fire_region` nullable|max:16 (validated but **not stored**).
200: same shape as session. `name` = email local part. 422 `{"message":"Un compte existe déjà avec cette adresse e-mail."}`.

### POST auth/reviewer/session — public
Body: `email`, `password`. Only works for the configured Google Play review account. 200 same shape (token name `google-play-review`). 422 `"Identifiants incorrects."`.

### POST auth/password/request — public
Body: `email` required|email. Always 200 `{"message":"Si cette adresse existe, un code de réinitialisation a été envoyé."}`. 6-digit code, 15 min, 5 attempts.

### POST auth/password/reset — public
Body: `email` required|email; `code` required|digits:6; `password` required|min:8|confirmed (+`password_confirmation`).
200: session shape (`token`,`user`) — logs the user in; **all previous tokens revoked**. 422 `"Code invalide ou expiré."`.

### POST auth/platform-links/consume — auth
Links a WhatsApp/Telegram/Discord bot identity to the account. Body: `token` required|string|max:200.
200:
```json
{"linked":true,"account":{"provider":"whatsapp","provider_username":"...","verified_at":"..."},"redirect_url":"https://wa.me/...|null"}
```

### GET auth/google/redirect?client=mobile — public (browser)
Open in external browser / Custom Tab. Query: `client=mobile`, optional `redirect_url`. 302 to Google consent; Google -> `GET /api/auth/google/callback` -> 302 to deep link:
- success: `astral4gamer://auth?token=<sanctum>&name=<name>&email=<email>&avatar=<url>` (URL-encoded query)
- failure: `astral4gamer://auth?error=<message>`
Scheme `astral4gamer`, host `auth`. State cached server-side (Laravel cache).

### Current user (no `GET /api/user` route exists)
Closest endpoints:
- `GET user/google-profile` — auth. Returns the full User model:
```json
{"connected":true,
 "user":{"id":123,"name":"jean","username":null,"email":"jean@x.com","google_id":null,"clerk_id":null,
  "google_avatar_url":null,"avatar_url":null,"country":"TG","public_profile":false,"game":"free_fire",
  "player_uid":"7073551273","rank":null,"points":0,"guild":null,"wins":0,"tournaments_won":0,"kd_ratio":null,
  "badges":null,"google_connected_at":null,"steam_id":null,"steam_persona_name":null,"steam_avatar_url":null,
  "steam_connected_at":null,"last_login_at":"...","admin_access_blocked_until":null,"admin_access_suspended_at":null,
  "email_verified_at":null,"is_admin":false,"purchases_blocked":false,"purchase_block_reason":null,
  "created_at":"...","updated_at":"...",
  "google_accounts":[{"id":1,"user_id":123,"provider":"google","google_id":"...","email":"...","name":"...","avatar_url":"...","access_token":"<DECRYPTED>","refresh_token":"<DECRYPTED>","token_expires_at":"...","scopes":["..."],"created_at":"...","updated_at":"..."}]},
 "google":{"email":"...","name":"...","avatar_url":"...","token_expires_at":"...","scopes":["..."]}|null}
```
  (`google_accounts` is serialized because the relation is eager-loaded; it leaks Google OAuth tokens — see notes.)
- `GET user/purchase-access` — auth. `{"user_id":123,"purchases_blocked":false,"reason":null}` (`reason` is always null: code reads non-existent attribute `purchases_block_reason`).
- Login/register responses only carry `{id,name,email,avatar_url}`.

## 3. Catalog

### Product object (serializeProduct)
```json
{"id":297,"name":"Free Fire (MENA)","name_fr":null,"name_en":null,"names":null,
 "game":"Free Fire","sku":"Astral4gamer-topup-free_fire_mena","public_reference":"Astral4gamer-topup-free_fire_mena",
 "price":650,"regular_price":650,"currency":"XOF",
 "image_url":"https://reseller.fazercards.com/api/v2/media/game-key-covers/....png",
 "description":"Region: MENA\\nAutomatic Free Fire top-up....","description_fr":null,"description_en":null,"descriptions":null,
 "delivery":"automatic","requires_uid":true,
 "required_fields":[{"key":"player_id","type":"text","label":"Player ID"}],
 "amounts":["100 + 10 Diamonds","210 + 21 Diamonds","..."],
 "variations":[
  {"id":15796,"variation_id":"s2t:eyJraW5kIjoic2hvcDJ0b3B1cCIsIml0ZW1faWQiOjI4LCJjYXRlZ29yeV9pZCI6NH0",
   "name":"100 + 10 Diamonds","price":650,"regular_price":650,"first_purchase_discount":null,
   "currency":"XOF","available":true,"stock_status":"available"}],
 "category":"Free Fire","type":"top-up",
 "price_range":{"min":650,"max":32815},"regular_price_range":{"min":650,"max":32815},
 "permalink":null,"supplier":"Astral4gamer",
 "variation_id":"s2t:...","promotion":null,"first_purchase_discount":null}
```
- `price`: lowest display price (after promo + first-purchase discount when authenticated via `user/products`). `regular_price`: lowest before discounts.
- `type` values (active products): `top-up`, `gift-card`, `game-key`, `manual-service`, `tournament_registration`, `astral_esport_challenge`.
- `required_fields[]`: `{key,type:"text",label}`; keys seen: `player_id`, `user_id`, `server_id`, `server`, `region`... Send values in `supplier_fields` of the order; missing keys fall back to `game_uid`.
- `requires_uid`: false for gift cards / game keys / vouchers / "Free Fire Global".
- Variation `id`: int (supplier_products.id) for supplier offers; string `"manual-<productId>-<index>"` for manual offers (manual ones also carry `name_fr`,`name_en`,`names`,`astral_base_price`,`nexy_benefit_credit_xof`). **Use `variation_id` (string, prefixes `fzr:` FazerCards, `s2t:` Shop2TopUp, or manual code) when ordering.** `stock_status`: `available|out_of_stock`.
- Product-level `variation_id` = default variation.
- `promotion`: `null | {"active":true,"discount_percent":10.0,"starts_at":...,"expires_at":...,"label":"Promotion 24h"}`.
- `first_purchase_discount` (product or variation): `null | {"active":true,"type":"first_purchase","discount_percent":5,"label":"Offre premier achat","original_price":650,"discounted_price":617,"minimum_profit":0.01}`. Only computed with a user id (i.e. `user/products/{id}`); never on public endpoints. Free Fire MENA/Global fixed-XOF variations never get it.
- Free Fire MENA fixed XOF prices (by diamonds): 110→650, 231→1310, 310→1970, 583→3265, 1188→6520, 2420→13050, 5600→32815; Booyah Pass 2500; Weekly membership 1650.

### GET products — public
Query: `q` (search name/game/sku/category/type/description/variation), `game` (LIKE), `category` (exact metadata category/type or game LIKE), `per_page` 1..240 (default 24), `page`.
200: Laravel LengthAwarePaginator:
```json
{"current_page":1,"data":[<Product>],"first_page_url":"https://api.astral4gamer.com/api/products?page=1","from":1,
 "last_page":1,"last_page_url":"...","links":[{"url":null,"label":"&laquo; Previous","active":false},{"url":"...","label":"1","active":true}],
 "next_page_url":null,"path":"https://api.astral4gamer.com/api/products","per_page":24,"prev_page_url":null,"to":1,"total":1}
```
Ordered newest first.

### GET products/categories — public
200: plain array (19 items at time of reading), sorted by name:
```json
[{"slug":"amazon","name":"Amazon","game":"Amazon","type":"gift-card","image_url":"https://...webp","products_count":17,"min_price":0.02}]
```
`min_price` is USD (see §1). Filter products with `GET products?category=<name>`.

### GET products/{product} — public
`{product}` = numeric id, or `sku`, or `metadata.permalink`. 404 if inactive.
200: `{"data":<Product>,"recommended":[<Product> x ≤6 same game]}`.

### GET user/products/{product} — auth
Same as above, with first-purchase discount applied for the user (eligible if no order in `paid|completed|delivered` and no pending order that already used the discount).

### GET products/{product}/reviews — public (optional)
`{"summary":{"average":4.5,"total":10,"distribution":{"5":8,"4":1,"3":1,"2":0,"1":0},"can_review":false},"data":[{"id":"1","productId":"","userId":"5","userName":"...","avatarUrl":"...","rating":5,"comment":"...","proofUrl":null,"verifiedPurchase":true,"status":"approved","createdAt":"...","adminReply":null}]}`

## 4. Player verification

### POST player/verify — public (lookup-protected, see §0)
Body: `game` required|max:80 (free text; matched by keyword: "free fire", "fortnite", "genshin", "pubg" (not mobile)); `uid` required|max:64; `region` nullable|max:8; `variation_id` nullable|max:255; `fields` nullable object of strings (e.g. `{"server_id":"123"}`).
200:
```json
{"uid":"7073551273","region":"me","nickname":"ADR...","level":65,"avatar":null,"verified":true,"source":"freefire_lookup"}
```
`source`: `freefire_lookup|fortnite_api|pubg_api|genshin...|fazercards|format_validation`. For generic games without validation it returns `{"uid":"...","nickname":"<uid>","verified":true,"source":"fazercards"}` (no real check). Free Fire `avatar` is always null (bug: reads `avatar_url`). Default FF region = `sg` (config).
422: `{"message":"...","verified":false}`. 503 `{"message":"Service de vérification joueur indisponible."}`.

### POST freefire/profile — public (lookup-protected)
Body: `uid` required|max:32; `region` required|max:8 (`me|mena|sg|ind|br|eu|cis|sac|na|id|th|vn|tw|bd|pk|us|my`).
200 (cached):
```json
{"uid":"...","region":"me","nickname":"...","level":65,"likes":1234,"exp":...,"title":...,
 "last_login_at":"...","last_login_timestamp":"1732200000","created_at":"...","created_timestamp":"...",
 "br_rank_points":...,"cs_rank_points":...,"match_points_br":...,"match_points_cs":...,"season_id":...,"bp_badges":...,
 "equipped_outfit":[...],"equipped_skills":[...],
 "rank":{"br":...,"cs":...,"season":...},
 "guild":{"GuildID":...,"GuildName":"...","GuildLevel":...,"GuildMember":...,"GuildCapacity":...,"...raw":"..."}|null,
 "stats":{...raw provider stats...}|null,"outfit_url":"https://...|null","banner_url":"https://...|null",
 "account":{...raw provider payload...},"usage":{"validation":null,"account":null,"visuals":null}}
```
Fields are passed through from an upstream provider; types vary. 422 `{"message":"..."}`.

## 5. Orders

### Order status enums
- `orders.status` (DB): `pending_payment`, `payment_processing` (transient during wallet debit), `paid`, `completed`, `delivered`, `supplier_failed`, `failed`, `cancelled`, `refunded`.
- Normalized `status` (in `GET orders` / tracking): `payment_pending`, `manual_processing` (paid + manual), `supplier_submitted` (paid, auto), `delivered` (delivered|completed), `failed` (failed|supplier_failed, or pending_payment with last payment failed/currency_mismatch/price_changed/duplicate_reversed/superseded), `cancelled`, `refunded`, `verification` (anything else, e.g. payment_processing).
- `metadata.fulfillment_status`: `awaiting_payment`, `awaiting_delivery`, `pending_supplier`, `processing`, `created`, `pending`, `delivered`, `failed`, `refunded`, `supplier_mismatch`, `gift_contribution_confirmed`, null.
- `supplierStatus` (supplier_orders.status): `created`, `pending`, `processing`, `delivered`, `completed`, `failed`.
- `refund.status`: `pending_choice`, `processing`, `refunded`, `failed`, `cancelled`, (`reversed`). `refund.method`: `wallet|original`.

### POST orders — auth
Body: `product_id` required|exists; `variation_id` nullable|string|max:255 (product variation `variation_id`; omitted -> default automated variation); `game_uid` required|max:64 (use the player id; for gift cards send any non-empty value, e.g. "-"); `nickname` required|max:120; `quantity` nullable|int 1..99 (top-ups forced to 1, else 422); `supplier_fields` nullable object of strings ≤500 (keys from `required_fields`).
Server re-verifies player for Genshin/PUBG/Mobile Legends/Shop2TopUp/Free Fire products (422 on failure).
201: raw Order model (all metadata exposed):
```json
{"product_id":297,"game_uid":"7073551273","nickname":"ADR","user_id":123,"amount":650,"currency":"XOF","status":"pending_payment",
 "metadata":{"variation_id":"s2t:...","variation_name":"100 + 10 Diamonds","supplier":"shop2topup","quantity":1,
  "supplier_cost":...,"base_unit_price":...,"regular_unit_price":650,"margin_amount":...,"nexy_benefit_credit_xof":0,
  "display_unit_price":650,"display_currency":"XOF","promotion":null,"first_purchase_discount":null,
  "manual_fulfillment":false,"maintenance_manual_fulfillment":false,"fulfillment_status":null,
  "required_fields":[...],"supplier_fields":{"player_id":"7073551273"},"player_verification":{...}|null},
 "updated_at":"2026-11-21T16:05:00.000000Z","created_at":"2026-11-21T16:05:00.000000Z","id":18248}
```
Errors: 403 purchases blocked; 409 product/variant unavailable; 422 variant mismatch / player invalid; 503 storefront stockout.
Then call `GET payments/orders/{id}/options` and `POST payments/initiate` or `POST payments/wallet`.

### POST orders/guest — public
Same body. Only allowed when maintenance-manual Free Fire MENA mode is on (currently off -> 403 `"Commande invitee indisponible pour ce produit."`). 201 `{"order":<Order>,"next_step":"payment_provider_to_integrate"}`. Pay via `POST payments/guest/initiate` (card only). Not needed for the app.

### GET orders — auth
Returns only orders that have ≥1 payment row or are manual; gift contributions excluded. No pagination (all orders), newest first.
```json
{"data":[{"id":18248,"reference":"A4G-018248","productName":"Free Fire (MENA)","amount":650.0,"currency":"XOF",
  "status":"delivered","orderStatus":"completed","paymentStatus":"success","fulfillmentStatus":"delivered",
  "supplierStatus":"delivered","createdAt":"2026-11-21T16:05:00.000000Z","updatedAt":"...",
  "deliveryCodes":[{"label":"code","value":"XXXX-YYYY"}],
  "refund":null}]}
```
`refund`: `null | {"status":"pending_choice","method":"wallet|original|null","provider":"stripe|null","amount":650.0,"currency":"XOF","requested_at":"...","deadline_at":"...","refunded_at":null,"fallback_to_wallet":false}`.
No product image / variation in this payload (only `productName`).

### GET orders/{order}/tracking — auth (owner or admin, else 403)
```json
{"id":"18248","reference":"A4G-018248","productId":"297","productName":"Free Fire (MENA)","productType":"top-up",
 "purpose":null,"requiresUid":true,"amount":650.0,"currency":"XOF","paymentMethod":"Mobile Money (FedaPay)",
 "refund":null,"status":"delivered","orderStatus":"completed","paymentStatus":"success","fulfillmentStatus":"delivered",
 "supplierStatus":"delivered","supplierReference":"...","paymentUpdatedAt":"...","supplierUpdatedAt":"...","updatedAt":"...",
 "estimatedDelivery":"1-15 min","deliveryCodes":[{"label":"...","value":"..."}],"events":[]}
```
`paymentMethod` labels: `Carte bancaire`, `Mobile Money (KkiaPay)`, `Mobile Money (pawaPay)`, `Mobile Money (FedaPay)`, `Wallet Astral`, `Cashback`, `Crypto (USDT)`, `Mobile Money (Moneroo)`, `Mobile Money (Global PAY)`, `—`. `purpose`: `metadata.type` (e.g. `a4g_gift_contribution`). `events` always `[]`.

### GET orders/{order}/delivery — public route (owner check if order has user)
Query: `payment_reference` (or `paymentId`) required — must match a payment of this order (else 404). If the order belongs to a user, Bearer of that user required (403). 
```json
{"order":{"id":18248,"status":"completed","fulfillment_status":"delivered","product_id":297,"product_type":"top-up","requires_uid":true,"amount":"650.00","currency":"XOF"},
 "supplier_order":{"external_id":"...","status":"delivered"}|null,
 "delivery_codes":[{"label":"code","value":"..."}]}
```

## 6. Payments

### Payment status enum (payments.status)
`initiated`, `pending`, `success`, `failed`, `cancelled`, `price_changed`, `currency_mismatch`, `duplicate_reversed`, `superseded`, `invalidated_payment_received`, (`refunded`). Success set = `success|paid|completed|invalidated_payment_received`.
Providers: active `stripe`, `fedapay`, `kkiapay`, `pawapay`, `wallet`, `cashback`, `kucoin_crypto`; legacy read-only `moneroo`, `globalpay`.
**Current prod routing: Mobile Money primary = FedaPay (hosted page)**, not KkiaPay widget.

### Payment object (raw model, appears in several responses)
```json
{"id":18099,"user_id":123,"order_id":18248,"provider":"fedapay","reference":"114330254","amount":"650.00","currency":"XOF","status":"initiated",
 "payload":{...provider checkout data, "metadata":{...},"charged_amount":650,"charged_currency":"XOF"},
 "created_at":"...","updated_at":"..."}
```

### GET payments/orders/{order}/options — auth (owner; order must be pending_payment)
Query: `language=fr|en`. May reprice Free Fire MENA orders to fixed XOF first.
```json
{"order":{"id":18248,"amount":650.0,"currency":"XOF"},
 "card":{"id":"stripe:card","name":"Visa / Mastercard","provider":"stripe"},
 "mobile_money":{"countries":[
   {"code":"BJ","alpha3":"BEN","name":"Bénin","flag_url":"https://flagcdn.com/w80/bj.png","phone_prefix":"",
    "provider":"fedapay","selection_reason":"only_provider|missing_fees|cheaper|tie",
    "options":[{"id":"fedapay:momo","name":"Mobile Money (FedaPay)","logo_url":null,"source":"fedapay",
      "amount":650,"currency":"XOF","minimum":null,"maximum":null,"quote":"<base64url>.<hmac>"}]}],
  "default_country":"TG"|null}}
```
pawaPay options look like `{"id":"pawapay:MTN_MOMO_CMR","name":"MTN","logo_url":"https://...","source":"pawapay","amount":1060.0,"currency":"XAF","minimum":100,"maximum":1000000,"quote":"..."}` with `phone_prefix` like `"237"` on the country. Quotes expire after 10 min. FedaPay countries: BJ, TG, CI, NE, SN, BF, ML.

### GET payments/orders/{order}/funding-options — auth (owner, pending_payment)
```json
{"currency":"XOF","required_amount":650.0,
 "wallet":{"balance":1000.0,"can_pay":true,"shortfall":0.0},
 "cashback":{"balance":0.0,"can_pay":false}}
```
Legacy non-XOF wallet: `{"currency":"XOF","required_amount":...,"wallet":{"balance":0.0,"can_pay":false},"cashback":{...},"wallet_locked_for_reconciliation":true}`. Cashback disabled in prod.

### POST payments/initiate — auth
Body:
- `order_id` required|exists
- `provider` required|in:`router,stripe,kkiapay,moneroo,globalpay` — **use `router`** (`kkiapay` currently routes to FedaPay; `moneroo|globalpay` legacy, auto-upgraded or 422)
- `customer.email` required|email; `customer.first_name` required|max:120; `customer.last_name` required|max:120; `customer.phone` nullable|max:40 (required & must start with country prefix for pawaPay); `customer.country` nullable|size:2 (required with a quote); `customer.language` nullable|in:fr,en
- `methods` array, **required non-empty**: `["card"]` or `["mobile_money"]`
- `payment_option` nullable (option `id`, e.g. `fedapay:momo`, `pawapay:MTN_MOMO_CMR`, or `stripe:card`)
- `payment_quote` nullable (the option `quote`)
- `mobile` nullable|boolean — **send `true`** so the return redirect is the app deep link.
Without option/quote, mobile money goes to FedaPay hosted page (country chosen there).
200:
```json
{"payment":<Payment>,"checkout_url":"https://checkout.stripe.com/... | https://process.fedapay.com/... | pawaPay page","kkiapay":null}
```
If provider resolves to KkiaPay (not current prod), `checkout_url` is null and `kkiapay` = widget config `{"key","sandbox","amount","currency":"XOF","reason","name","email","phone","data":"KKP-...","partnerId":"KKP-...","paymentmethod":"momo","countries":["TG"]}`.
**App flow:** open `checkout_url` in browser/Custom Tab. Provider returns to `https://api.astral4gamer.com/api/payments/return?order_id=<id>&mobile=1&provider=<p>&paymentId=<ref>[&paymentStatus=cancelled]`, which re-verifies with the provider and 302s to:
`astral4gamer://payment?paymentId=<reference>&paymentStatus=<payments.status>&order_id=<id>`
Then poll `GET orders/{id}/tracking`.
Errors: 403 purchases blocked / foreign order; 422 `"Commande deja traitee."`, `"Choisissez votre mode de paiement avant de continuer."`, quote errors (`"La cotation a expire..."`), pawaPay phone mismatch; 422 `"Un paiement est deja en cours pour cette commande."` (an initiated/pending/success payment < 30 min old exists — retrying checkout within 30 min is blocked); 503 method disabled/not configured.

### GET payments/status?paymentId=&order_id= — public
```json
{"payment":{"id":1,"reference":"...","status":"success","amount":"650.00","currency":"XOF"},
 "order":{"id":18248,"status":"paid","fulfillment_status":null,"refund_status":null}|null}
```
### POST payments/{payment}/verify — auth (owner). `{"payment":<Payment>}` after re-check with provider (422 if provider not verifiable).

### POST payments/wallet — auth (direct wallet debit)
Body: `order_id` required|int|exists; `source` nullable|in:`wallet`.
201:
```json
{"payment":<Payment provider "wallet", reference "wallet-<orderId>-<rand>", status "success">,"order":<Order raw model, status "paid"/"completed">}
```
Debit = order amount converted to XOF and rounded **up** to whole franc. Errors: 422 `"Solde wallet insuffisant."`, `"Wallet introuvable."`, `"Commande deja traitee."`; 423 USD-locked wallet.

### POST payments/wallet-intents — auth (two-step confirm, used by web)
Body: `order_id` required; `source` nullable|in:wallet; `channel` nullable|in:`web,mobile,astral_bot`.
201:
```json
{"intent":{"id":4410,"token":"<64 chars>","order_id":18248,"amount":650.0,"currency":"XOF","funding_source":"wallet","status":"created","expires_at":"..."},
 "confirm_url":"https://www.astral4gamer.com/payment/confirm/<token>?intent=4410","requires_passkey":false}
```
409 if an unexpired intent exists `{"message":"...","intent_id":..,"expires_at":".."}`.
Confirm: `POST payments/wallet-intents/{token}/confirm` (auth) -> `{"payment":<Payment>,"intent":<raw intent>,"order":<Order>}` (+`"already_confirmed":true` on replay). Intent status: `created`, `confirming`, `paid`, `expired`. For the app, `POST payments/wallet` is simpler.

### GET payments/wallet/topup-options — auth
Query: `amount` required|numeric|min:1 (min 100 XOF, 1 EUR); `currency` nullable|in:`XOF,EUR` (default wallet currency XOF); `language` fr|en.
`{"amount":5000.0,"currency":"XOF","mobile_money":{"countries":[...same as order options...],"default_country":"TG"|null}}`. 503 if top-up disabled.

### POST payments/wallet/topup — auth
Body: `amount` required|numeric|min:1; `currency` nullable|in:XOF,EUR; `customer.*` as initiate (email, first_name, last_name required); `methods` required `["card"]|["mobile_money"]`; `mobile` boolean (send true); `payment_option`, `payment_quote` (from topup-options).
201:
```json
{"payment":{"user_id":123,"provider":"fedapay","reference":"114330300","amount":5000.0,"currency":"XOF","status":"initiated","payload":{...},"id":..,"created_at":"..","updated_at":".."},
 "checkout_url":"https://...","kkiapay":null}
```
Return deep link: `astral4gamer://wallet?paymentId=<reference>&paymentStatus=<status>&order_id=` . EUR amount credited to XOF wallet at 660.

### GET payments/wallet/topups/{reference} — auth (own top-up only, else 404)
`{"reference":"114330300","status":"success","wallet_balance":6000.0,"wallet_currency":"XOF"}` (re-verifies with provider when not final).

### POST payments/crypto/intents — auth
Body: `purpose` required|in:`checkout,wallet_topup`; `order_id` required_if checkout; `amount` required_if wallet_topup|min:1; `currency` nullable|in:XOF,USD,EUR; `crypto_currency` nullable|in:`USDT,BTC,ETH`; `network` nullable|max:40; `customer` nullable object.
201 / `GET payments/crypto/intents/{intent}` (auth, owner; `{intent}` = numeric id) 200:
```json
{"data":{"id":179,"reference":"A4G-KC-...","purpose":"checkout","status":"pending","fiat_amount":650.0,"fiat_currency":"XOF",
 "crypto_currency":"USDT","network":"TRC20","expected_crypto_amount":1.07,"received_crypto_amount":0.0,
 "deposit_address":"T...","deposit_memo":null,"expires_at":"...","paid_at":null,
 "payment":{"id":1,"reference":"A4G-CRYPTO-...","status":"initiated"}|null}}
```
Intent status: `pending`, `confirmed` (all 179 prod rows are `pending`).

### Refunds (failed delivery)
`GET payments/orders/{order}/refund-options`, `POST payments/orders/{order}/refund` (auth) — exist; triggered when `refund.status = pending_choice` (notification type `refund_choice_required`). Not detailed here.

## 7. Wallet / VIP

### GET user/wallet — auth (creates an XOF wallet row if missing)
```json
{"userId":"123","balance":6000.0,"currency":"XOF",
 "transactions":[{"id":"9876","type":"deposit","amount":5000.0,"currency":"XOF","reason":"Recharge wallet ...","createdAt":"2026-11-21 16:05:42"}]}
```
Last 100. `amount` signed (debits negative). `createdAt` is raw DB string `"YYYY-MM-DD HH:MM:SS"` (no TZ, server UTC). Types: `purchase`, `deposit`, `supplier_refund`, `supplier_refund_reversal`, `gift_refund`, `cashback`, `cashback_purchase`, `cashback_disabled`, `cashback_expired`, `cashback_refund_reversal`, `cashback_adjustment`, `cashback_currency_correction`, `wallet_cashback_reversal`, `currency_conversion`, `promotion_failure_credit`, `bonus`, `admin_correction`, `admin_debit`, `duplicate_payment_reversal`.

### GET user/vip — auth
```json
{"currentLevel":"Bronze","orders":3,"spend":12.5,"spendCurrency":"USD",
 "levels":[
  {"name":"Bronze","minOrders":1,"minSpend":0.0,"cashbackPercent":0,"discountPercent":0.0,"perks":["Cashback de depart","Badge profil"]},
  {"name":"Silver","minOrders":8,"minSpend":75.0,"cashbackPercent":0,"discountPercent":1.0,"perks":["Promotions privees","Cashback ameliore"]},
  {"name":"Gold","minOrders":20,"minSpend":220.0,"cashbackPercent":0,"discountPercent":2.0,"perks":["Support prioritaire","Acces ventes flash"]},
  {"name":"Diamond","minOrders":45,"minSpend":650.0,"cashbackPercent":0,"discountPercent":3.0,"perks":["Coupons exclusifs","Priorite livraison"]},
  {"name":"Elite","minOrders":100,"minSpend":1500.0,"cashbackPercent":0,"discountPercent":5.0,"perks":["Gestionnaire prioritaire","Offres VIP"]}],
 "cashbackBalance":0,"cashbackCurrency":"XOF","cashbackHistory":[],"badges":[]}
```
Level = highest with `orders >= minOrders && spend >= minSpend` (spend in USD; DB cashback % 0.25/0.5/0.75/1/1.5 but returned 0 because cashback is disabled). With cashback on, history items: `{"id":"1","type":"cashback","reference":"A4G-018248|CB-000001","amount":1.6,"currency":"XOF","createdAt":"..."}`. `discountPercent` is informational (not applied in pricing code).

## 8. Notifications

### GET user/notifications — auth
Last 50, newest first, no pagination.
```json
{"unread_count":2,
 "items":[{"id":"95116","type":"order_delivered","title":"Commande livrée","description":"...",
   "href":"astral4gamer://payment?order_id=18246","date":"2026-11-21T15:45:05+00:00","read":false,
   "data":{"status":"delivered","order_id":18246}}]}
```
- `href` deep links: `astral4gamer://payment?order_id=<id>`, `astral4gamer://gifts?slug=<slug>`, `astral4gamer://wallet...`; may be null or a web path.
- `data` examples: orders `{"status","order_id"}`; payment_success `{"status":"success","order_id","payment_id","invoice":{"amount","product","currency","game_uid","nickname","order_id","customer_email","payment_provider","payment_reference"}}`; gifts `{"gift_campaign_id","gift_slug","status","gift_contribution_id"?}`.
- Includes all channels (`mail`, `push`, `whatsapp`) for the user.
- `type` values seen: `payment_success`, `payment_failed`, `payment_cancelled`, `order_processing`, `order_delivered`, `order_failed`, `order_refunded`, `order_delivery_code`, `manual_order_delivered`, `manual_order_failed`, `supplier_order_refunded`, `refund_choice_required`, `redeem_code_available`, `cashback_expiry_warning`, `cashback_expired`, `gift_created`, `gift_funded`, `gift_refunded`, `gift_cancelled`, `gift_expiry_reminder`, `gift_contribution_received`, `gift_contribution_confirmed`, `gift_favorite_new_request`, `gift_delivery_preparing`, `gift_delivery_started`, `announcement`, `tournament`, `tournament_registration`, `tournament_registration_payment`, `tournament_creation`, `astral_esport_challenge_payment`.

### POST user/notifications/{id}/read — auth
`{id}` numeric. 200 `{"read":true}`; 404 if not owner. No "mark all read" endpoint.

### GET notifications/feed — public
Global feed (official bell notices, tournaments, blog, streams, replays), max 12.
```json
{"unread_count":9,"items":[{"id":"replay-5","type":"video","title":"...","description":"...","href":"/replays/<slug>","date":"2026-10-06T10:07:45+00:00"}]}
```
`id` prefixes `notification-|tournament-|blog-|stream-|replay-`; `type`: official type, `tournament`, `blog`, `announcement`, `stream`, `video`. `href` = web paths (relative to https://www.astral4gamer.com). `unread_count` = item count (no read tracking).

### POST user/notification-devices — auth
Body: `installation_id` required|uuid; `platform` required|in:`android,ios`; `push_provider` nullable|in:`local,fcm` (default local; FCM pushes only go to `fcm`); `push_token` nullable|max:4096; `notifications_enabled` required|boolean; `app_version` nullable|max:32; `build_number` nullable|int|min:1.
Upsert by installation_id. 200 `{"registered":true}`.
FCM message: `notification{title,body}`; `data` (all strings): `notification_id`, `type`, `url`, plus flattened notification data (`order_id`, `status`, `gift_slug`...; nested values JSON-encoded). Android channel ids: `astral_gifts` (type `gift_*`), `astral_updates` (type contains `update`), else `astral_orders`.

## 9. Account

### POST user/account-deletion — auth
Body: `confirmation` required|accepted (`true`/`"yes"`/`1`); `reason` nullable|max:500.
202 (created) / 200 (already pending):
```json
{"id":12,"status":"pending","message":"Demande de suppression enregistrée. ...","deletion_url":"https://astral4gamer.com/suppression-compte"}
```
Does not delete immediately; does not revoke the token.

### GET user/google-profile — see §2.

## 10. Gifts (A4G Gifts crowdfunding)

### Gift status enum
`active` (accepting contributions, 24 h), `funded` (goal reached, still before expiry), `delivery_pending`, `delivering` (delivery order created), `delivered`, `cancelled` (owner cancelled -> contributions refunded to wallets), `refunded` (expired unfunded -> refunded). Contribution status: `paid`, `refunded`.

### Gift object
```json
{"id":112,"slug":"momtopoppm-NA8T9","status":"active","message":"Fadil",
 "goal_amount":1442.0,"funded_amount":0.0,"currency":"XOF","supporters_count":0,
 "progress_percent":0,"remaining_amount":1442.0,
 "starts_at":"2026-11-21T16:11:49+00:00","expires_at":"2026-11-22T16:11:49+00:00",
 "owner":{"id":2608,"name":"<nickname or username or name>","avatar_url":"https://api.astral4gamer.com/storage/gifts/profiles/<uuid>.jpg","country":"NE"},
 "product":{"id":488,"name":"Garena Free Fire (Global)","variation_name":"2 USD (210 + 21 Diamonds)","game":"Free Fire"}}
```
`progress_percent` float 0..100 (1 decimal). `goal_amount` = variation price converted to the requester's wallet currency (XOF) **+10 %**, rounded up. Mine-only extra: `"supporters":[{"name":"...","avatar_url":"...|null","label":"Soutien ultime|Soutien précieux|Soutien fidèle"}]` (non-anonymous paid contributors ranked by total). No per-contribution amounts, no `game_uid`.

### GET gifts — public
`{"data":[<Gift>]}` — status active|funded and not expired, newest 50.
### GET gifts/{gift} — public
`{gift}` = **slug**. `{"data":<Gift>}`. 404 unless status in active|funded|delivery_pending|delivering|delivered.
### GET user/gifts — auth
`{"data":[<Gift + supporters>]}` all own campaigns, any status.
### POST gifts — auth (throttle uid)
Body: `product_id` required|int|exists; `game_uid` required|max:64; `nickname` required|max:120; `message` nullable|max:200; `variation_id` nullable|max:255; `variation_name` nullable|max:160 (ignored, server derives); `supplier_fields` nullable object; `profile_photo` nullable data-URL string `data:image/(jpeg|png|webp);base64,...` (≤750 KB decoded).
201 `{"data":<Gift>}`. Expires in 24 h.
### PATCH gifts/{gift} — auth owner (active|funded). Body `message`, `profile_photo`. 200 `{"data":<Gift>}`.
### POST gifts/{gift}/cancel — auth owner
200 `{"data":<Gift status "cancelled">}`; 409 `"La livraison a déjà commencé : contacte le support."`.
### POST gifts/{gift}/contributions/wallet — auth
Body: `amount` required|numeric|min:0.01; `currency` required|size:3 (**must equal gift currency**); `idempotency_key` nullable|max:100 (UUID generated if absent — send one); `anonymous` nullable|bool; `message` nullable|max:160.
201:
```json
{"data":{"contribution_id":55,"wallet_debit":{"amount":500.0,"currency":"XOF"},"campaign":<Gift>}}
```
Errors: 422 own gift / currency mismatch / `"Solde wallet hors cashback insuffisant. Montant nécessaire : 500 XOF."`; 409 not active/expired. Overpayment beyond goal is kept as "Astral surplus".
### POST gifts/{gift}/contributions/checkout — auth
Same body. Creates a contribution Order (`metadata.type = a4g_gift_contribution`), idempotent per key.
201 (new) / 200 (existing): `{"order":{"id":18300,"amount":500.0,"currency":"XOF","status":"pending_payment"}}`. Then pay with `POST payments/initiate` (or wallet). Contribution orders are hidden from `GET orders`.
### POST /DELETE gifts/{gift}/favorite — auth
Follows the gift **owner** (not the gift). `{"favorited":true}` / `{"favorited":false}`. No endpoint lists favorites or tells whether a gift is favorited.

## 11. Promotions — Free Fire 110 diamonds

### GET promotions/free-fire-110 — auth
```json
{"enabled":false,"reward_diamonds":110,"limit":20,"delivered_count":34,"remaining":0,
 "message":"Cette campagne est terminée.",
 "claim":{"id":1,"status":"processing|delivered","player_uid":"...","nickname":"...","region":"me","order_id":123,"failure_reason":null,
   "message":"Crédit en cours de traitement. Cette page se met à jour automatiquement."}|null}
```
(`claim` is null when the user's claim failed.) Claim statuses: `processing`, `delivered`, `failed`.
### POST promotions/free-fire-110/redeem — auth (throttle uid)
Body: `code` required regex `^\d{8}$`; `player_uid` required regex `^\d{6,20}$`.
202: same shape as GET. 422 `{"message":"Code promotionnel invalide ou déjà utilisé." | "Ce compte, cet ID Free Fire ou cette connexion a déjà utilisé cette offre." | "Les 20 crédits disponibles ont déjà été réservés." | region unsupported}`. Supported regions: br, cis/ru, eu, sac/latam, me/mena. Campaign currently exhausted (enabled=false).
(Similar: `GET promotions/ma-chance`, `POST promotions/ma-chance/redeem`.)

## 12. App update / status

- Update manifest: **`https://api.astral4gamer.com/downloads/mobile-version.json`** (file `backend/public/downloads/mobile-version.json`). `https://www.astral4gamer.com/mobile-version.json` and `www.../downloads/mobile-version.json` return 404.
```json
{"version":"1.1.50","build":2068,"minimum_build":2068,
 "apk_url":"https://api.astral4gamer.com/downloads/astral4gamer.apk","store_url":"",
 "play_store_url":"https://play.google.com/store/apps/details?id=com.astral4gamer.mobile",
 "notes":["Mode maintenance temporaire activé pour l’application.","..."]}
```
Force update when installed build < `minimum_build`.
- Maintenance: `GET /api/app/status` (public) -> `{"maintenance":false,"message":"Astral4Gamer revient bientôt."}`.
- `GET /api/health` -> `{"status":"ok","service":"nexy-api"}`.

## 13. Deep links summary (scheme `astral4gamer`)

| Link | Source |
|---|---|
| `astral4gamer://auth?token=&name=&email=&avatar=` / `?error=` | Google OAuth (client=mobile) |
| `astral4gamer://payment?paymentId=&paymentStatus=&order_id=` | payment return (`mobile=1`) |
| `astral4gamer://wallet?paymentId=&paymentStatus=&order_id=` | wallet top-up return |
| `astral4gamer://payment?order_id=<id>` | notification href (order) |
| `astral4gamer://gifts?slug=<slug>` | notification href (gift) |

## 14. Caveats found in backend code

- `GET user/google-profile` serializes `google_accounts` with **decrypted Google access/refresh tokens** (model has no `$hidden`). Don't log/cache this response; backend should hide them.
- `POST orders` returns full order metadata including `supplier_cost` and `margin_amount`.
- `GET user/purchase-access.reason` is always null (attribute name typo).
- `auth/mobile/register` accepts `free_fire_region` but discards it.
- `player/verify` Free Fire `avatar` always null; generic games return `verified:true` without a real lookup.
- `products/categories.min_price` is USD while all product prices are XOF.
