<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiLog;
use App\Models\BlogPost;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Support\Carbon;

class AdminController extends Controller
{
    public function analytics()
    {
        $paidStatuses = ['success', 'paid'];
        $now = now();
        $start = $now->copy()->subDays(30)->startOfDay();
        $previousStart = $now->copy()->subDays(60)->startOfDay();
        $previousEnd = $start->copy()->subSecond();

        $revenue = (float) Payment::whereIn('status', $paidStatuses)->sum('amount');
        $previousRevenue = (float) Payment::whereIn('status', $paidStatuses)
            ->whereBetween('created_at', [$previousStart, $previousEnd])
            ->sum('amount');
        $currentRevenue = (float) Payment::whereIn('status', $paidStatuses)
            ->where('created_at', '>=', $start)
            ->sum('amount');

        $orders = Order::count();
        $previousOrders = Order::whereBetween('created_at', [$previousStart, $previousEnd])->count();
        $currentOrders = Order::where('created_at', '>=', $start)->count();

        $users = User::count();
        $previousUsers = User::whereBetween('created_at', [$previousStart, $previousEnd])->count();
        $currentUsers = User::where('created_at', '>=', $start)->count();

        $activeUsers = User::where('last_login_at', '>=', $start)->count();
        $previousActiveUsers = User::whereBetween('last_login_at', [$previousStart, $previousEnd])->count();

        $tournaments = Tournament::count();
        $currentTournaments = Tournament::where('created_at', '>=', $start)->count();
        $previousTournaments = Tournament::whereBetween('created_at', [$previousStart, $previousEnd])->count();

        return [
            'summary' => [
                'users' => ['value' => $users, 'change' => $this->change($currentUsers, $previousUsers)],
                'active_users' => ['value' => $activeUsers, 'change' => $this->change($activeUsers, $previousActiveUsers)],
                'tournaments' => ['value' => $tournaments, 'change' => $this->change($currentTournaments, $previousTournaments)],
                'orders' => ['value' => $orders, 'change' => $this->change($currentOrders, $previousOrders)],
                'revenue' => ['value' => $revenue, 'change' => $this->change($currentRevenue, $previousRevenue)],
                'products' => ['value' => Product::where('active', true)->count(), 'change' => null],
                'blog_posts' => ['value' => BlogPost::where('status', 'published')->count(), 'change' => null],
                'active_tournaments' => ['value' => Tournament::whereIn('status', ['live', 'open'])->count(), 'change' => null],
            ],
            'revenue_series' => $this->revenueSeries($start, $paidStatuses),
            'recent_activities' => $this->recentActivities(),
            'top_games' => $this->topGames(),
            'top_tournaments' => $this->topTournaments(),
            'payment_methods' => $this->paymentMethods($paidStatuses),
            'top_products' => $this->topProducts(),
        ];
    }

    public function logs()
    {
        return ApiLog::latest()->paginate(50);
    }

    private function change(float|int $current, float|int $previous): ?float
    {
        if ((float) $previous === 0.0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function revenueSeries(Carbon $start, array $paidStatuses): array
    {
        $rows = Payment::query()
            ->selectRaw('DATE(created_at) as day, SUM(amount) as total')
            ->whereIn('status', $paidStatuses)
            ->where('created_at', '>=', $start)
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('total', 'day');

        return collect(range(0, 30))->map(function (int $index) use ($start, $rows) {
            $day = $start->copy()->addDays($index)->toDateString();

            return [
                'date' => $day,
                'label' => Carbon::parse($day)->translatedFormat('d M'),
                'value' => round((float) ($rows[$day] ?? 0), 2),
            ];
        })->values()->all();
    }

    private function recentActivities(): array
    {
        $orders = Order::query()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Order $order) => [
                'type' => 'order',
                'title' => 'Nouvelle commande',
                'body' => '#'.$order->id.' - '.number_format((float) $order->amount, 0, ',', ' ').' '.$order->currency,
                'created_at' => $order->created_at,
            ]);

        $tournaments = Tournament::query()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Tournament $tournament) => [
                'type' => 'tournament',
                'title' => 'Tournoi '.$this->statusLabel($tournament->status),
                'body' => $tournament->title,
                'created_at' => $tournament->created_at,
            ]);

        $users = User::query()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (User $user) => [
                'type' => 'user',
                'title' => 'Utilisateur inscrit',
                'body' => $user->username ?: $user->name ?: $user->email,
                'created_at' => $user->created_at,
            ]);

        return $orders
            ->merge($tournaments)
            ->merge($users)
            ->sortByDesc('created_at')
            ->take(8)
            ->values()
            ->map(fn (array $item) => [
                ...$item,
                'created_at' => optional($item['created_at'])->toISOString(),
            ])
            ->all();
    }

    private function topGames(): array
    {
        return Order::query()
            ->join('products', 'orders.product_id', '=', 'products.id')
            ->selectRaw('products.game as name, COUNT(*) as value')
            ->groupBy('products.game')
            ->orderByDesc('value')
            ->limit(5)
            ->get()
            ->map(fn ($row) => ['name' => $row->name ?: 'Autres', 'value' => (int) $row->value])
            ->all();
    }

    private function topTournaments(): array
    {
        return Tournament::query()
            ->withCount('teams')
            ->latest('starts_at')
            ->limit(6)
            ->get()
            ->map(fn (Tournament $tournament) => [
                'title' => $tournament->title,
                'participants' => (int) $tournament->teams_count,
                'status' => $this->statusLabel($tournament->status),
            ])
            ->all();
    }

    private function paymentMethods(array $paidStatuses): array
    {
        return Payment::query()
            ->selectRaw('provider as name, COUNT(*) as value')
            ->whereIn('status', $paidStatuses)
            ->groupBy('provider')
            ->orderByDesc('value')
            ->limit(5)
            ->get()
            ->map(fn ($row) => ['name' => ucfirst((string) $row->name), 'value' => (int) $row->value])
            ->all();
    }

    private function topProducts(): array
    {
        return Order::query()
            ->leftJoin('products', 'orders.product_id', '=', 'products.id')
            ->selectRaw('orders.product_id, COALESCE(products.name, CONCAT("Produit #", orders.product_id)) as name, COUNT(*) as sales, SUM(orders.amount) as revenue')
            ->groupBy('orders.product_id', 'products.name')
            ->orderByDesc('sales')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'product_id' => (int) $row->product_id,
                'name' => $row->name,
                'sales' => (int) $row->sales,
                'revenue' => round((float) $row->revenue, 2),
            ])
            ->all();
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'live' => 'en cours',
            'open' => 'ouvert',
            'completed' => 'termine',
            'cancelled' => 'annule',
            default => $status,
        };
    }
}
