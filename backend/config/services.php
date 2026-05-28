<?php

return [
    'webhook' => [
        'secret' => env('WEBHOOK_SECRET', 'change-me'),
    ],
    'suppliers' => [
        'item4gamer' => [
            'key' => env('ITEM4GAMER_KEY'),
            'base_url' => env('ITEM4GAMER_BASE_URL', 'https://item4gamer.com/wp-json/reseller/v1'),
            'endpoints' => [
                'categories' => env('ITEM4GAMER_CATEGORIES_ENDPOINT', '/categories'),
                'products' => env('ITEM4GAMER_PRODUCTS_ENDPOINT', '/products'),
                'variations' => env('ITEM4GAMER_VARIATIONS_ENDPOINT', '/products/{product_id}/variations'),
                'add_order' => '/order/add-order',
                'get_order' => '/order/get-order',
                'balance' => '/get-balance',
            ],
        ],
        'seagm' => ['key' => env('SEAGM_KEY')],
        'unipin' => ['key' => env('UNIPIN_KEY')],
    ],
    'payments' => [
        'cinetpay' => ['key' => env('CINETPAY_KEY')],
        'fedapay' => ['key' => env('FEDAPAY_KEY')],
        'paydunya' => ['key' => env('PAYDUNYA_KEY')],
        'moneroo' => [
            'secret_key' => env('MONEROO_SECRET_KEY'),
            'public_key' => env('MONEROO_PUBLIC_KEY'),
            'webhook_secret' => env('MONEROO_WEBHOOK_SECRET'),
            'base_url' => env('MONEROO_BASE_URL', 'https://api.moneroo.io'),
            'return_url' => env('MONEROO_RETURN_URL', env('APP_BACKEND_URL', env('APP_URL', 'http://localhost:8000')).'/api/payments/moneroo/return'),
            'frontend_return_url' => env('MONEROO_FRONTEND_RETURN_URL', env('APP_FRONTEND_URL', env('FRONTEND_URL', 'http://localhost:3000')).'/checkout/return'),
        ],
    ],
    'youtube' => [
        'key' => env('YOUTUBE_API_KEY'),
        'client_id' => env('YOUTUBE_CLIENT_ID'),
        'client_secret' => env('YOUTUBE_CLIENT_SECRET'),
        'redirect_uri' => env('YOUTUBE_REDIRECT_URI'),
        'frontend_url' => env('APP_FRONTEND_URL', env('FRONTEND_URL', 'http://localhost:3000')),
    ],
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri' => env('GOOGLE_REDIRECT_URI', env('APP_BACKEND_URL', env('APP_URL', 'http://localhost:8000')).'/api/auth/google/callback'),
        'frontend_url' => env('APP_FRONTEND_URL', env('FRONTEND_URL', 'http://localhost:3000')),
        'people_scopes' => array_values(array_filter(explode(' ', env('GOOGLE_PEOPLE_SCOPES', 'openid email profile https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email')))),
    ],
    'blogger' => [
        'blog_id' => env('BLOGGER_BLOG_ID'),
        'labels' => ['Free Fire', 'Tournoi', 'Esport', 'NEXY', 'ASTRAL4GAMER'],
    ],
    'openai' => [
        'key' => env('OPENAI_API_KEY'),
    ],
    'obs' => [
        'websocket_url' => env('OBS_WEBSOCKET_URL'),
        'password' => env('OBS_WEBSOCKET_PASSWORD'),
    ],
];
