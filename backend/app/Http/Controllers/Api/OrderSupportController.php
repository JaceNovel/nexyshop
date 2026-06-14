<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Discord\DiscordNotificationService;
use Illuminate\Http\Request;

class OrderSupportController extends Controller
{
    public function store(Request $request, DiscordNotificationService $discord)
    {
        $data = $request->validate([
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
            'order_reference' => ['nullable', 'string', 'max:120'],
            'name' => ['nullable', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:160'],
            'message' => ['required', 'string', 'min:5', 'max:1200'],
        ]);

        $order = null;

        if (! empty($data['order_id'])) {
            $query = Order::query()->whereKey($data['order_id']);

            if ($request->user()) {
                $query->where(function ($builder) use ($request) {
                    $builder->where('user_id', $request->user()->id)
                        ->orWhereNull('user_id');
                });
            }

            $order = $query->first();
        }

        $discord->orderSupportRequest($data, $request->user(), $order);

        return response()->json([
            'message' => 'Demande support envoyee. Notre equipe revient vers toi rapidement.',
        ], 201);
    }
}
