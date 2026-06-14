@php
    $actionUrl = $messageRecord->action_url;
    $actionLabel = $messageRecord->action_label ?: 'Voir sur Astral4Gamer';
    $schemaType = match ($messageRecord->type) {
        'payment_success', 'order_paid', 'order_delivered' => 'Order',
        'tournament_open', 'tournament_validated' => 'Event',
        default => 'EmailMessage',
    };
@endphp
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @if($actionUrl)
        <script type="application/ld+json">
        {
          "@context": "http://schema.org",
          "@type": "EmailMessage",
          "potentialAction": {
            "@type": "ViewAction",
            "target": "{{ $actionUrl }}",
            "name": "{{ $actionLabel }}"
          },
          "description": "{{ $messageRecord->preview }}"
        }
        </script>
    @endif
    @if($schemaType === 'Order')
        <script type="application/ld+json">
        {
          "@context": "http://schema.org",
          "@type": "Order",
          "merchant": { "@type": "Organization", "name": "Astral4Gamer" },
          "orderNumber": "{{ $messageRecord->data['order_id'] ?? $messageRecord->id }}",
          "orderStatus": "https://schema.org/OrderProcessing",
          "url": "{{ $actionUrl ?: config('app.url') }}"
        }
        </script>
    @endif
    @if(($messageRecord->data['discount_code'] ?? null) || ($messageRecord->data['image_url'] ?? null))
        <script type="application/ld+json">
        [
          @if($messageRecord->data['discount_code'] ?? null)
          {
            "@context": "http://schema.org/",
            "@type": "DiscountOffer",
            "description": "{{ $messageRecord->subject }}",
            "discountCode": "{{ $messageRecord->data['discount_code'] }}",
            "availabilityStarts": "{{ now()->toIso8601String() }}",
            "availabilityEnds": "{{ now()->addDays(7)->toIso8601String() }}"
          }@if($messageRecord->data['image_url'] ?? null),@endif
          @endif
          @if($messageRecord->data['image_url'] ?? null)
          {
            "@context": "http://schema.org/",
            "@type": "PromotionCard",
            "image": "{{ $messageRecord->data['image_url'] }}",
            "url": "{{ $actionUrl ?: config('app.url') }}",
            "headline": "{{ $messageRecord->subject }}"
          }
          @endif
        ]
        </script>
    @endif
    <style>
        body { margin: 0; background: #f5f6f8; color: #111827; font-family: Arial, sans-serif; }
        .wrap { max-width: 620px; margin: 0 auto; padding: 28px 16px; }
        .card { background: #ffffff; border: 1px solid #eceff3; border-radius: 10px; overflow: hidden; }
        .top { background: #e52b2f; color: #ffffff; padding: 18px 22px; font-weight: 900; letter-spacing: .04em; }
        .body { padding: 24px 22px; }
        h1 { margin: 0 0 12px; font-size: 22px; line-height: 1.25; }
        p { margin: 0 0 16px; color: #4b5563; line-height: 1.65; }
        .btn { display: inline-block; background: #111827; color: #ffffff !important; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 800; }
        .foot { padding: 18px 22px; color: #8a94a6; font-size: 12px; border-top: 1px solid #eceff3; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <div class="top">ASTRAL4GAMER</div>
            <div class="body">
                <h1>{{ $messageRecord->subject }}</h1>
                <p>{{ $messageRecord->preview }}</p>
                @if($actionUrl)
                    <a class="btn" href="{{ $actionUrl }}">{{ $actionLabel }}</a>
                @endif
            </div>
            <div class="foot">
                Tu reçois ce message parce que tu as un compte Astral4Gamer ou une activité récente sur la plateforme.
            </div>
        </div>
    </div>
</body>
</html>
