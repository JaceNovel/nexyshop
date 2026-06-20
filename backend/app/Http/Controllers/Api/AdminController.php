<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiLog;
use App\Models\BlogPost;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ResellerPartner;
use App\Models\Supplier;
use App\Models\Tournament;
use App\Models\TournamentMatch;
use App\Models\TournamentTeam;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Throwable;

class AdminController extends Controller
{
    public function analytics()
    {
        $paidStatuses = ['success', 'paid'];
        $now = now();
        $start = $now->copy()->subDays(30)->startOfDay();
        $previousStart = $now->copy()->subDays(60)->startOfDay();
        $previousEnd = $start->copy()->subSecond();

        $revenue = $this->safe(fn () => (float) Payment::whereIn('status', $paidStatuses)->sum('amount'), 0.0);
        $previousRevenue = $this->safe(fn () => (float) Payment::whereIn('status', $paidStatuses)
            ->whereBetween('created_at', [$previousStart, $previousEnd])
            ->sum('amount'), 0.0);
        $currentRevenue = $this->safe(fn () => (float) Payment::whereIn('status', $paidStatuses)
            ->where('created_at', '>=', $start)
            ->sum('amount'), 0.0);

        $orders = $this->safe(fn () => Order::count(), 0);
        $previousOrders = $this->safe(fn () => Order::whereBetween('created_at', [$previousStart, $previousEnd])->count(), 0);
        $currentOrders = $this->safe(fn () => Order::where('created_at', '>=', $start)->count(), 0);

        $users = $this->safe(fn () => User::count(), 0);
        $previousUsers = $this->safe(fn () => User::whereBetween('created_at', [$previousStart, $previousEnd])->count(), 0);
        $currentUsers = $this->safe(fn () => User::where('created_at', '>=', $start)->count(), 0);

        $hasLastLogin = $this->safe(fn () => Schema::hasColumn('users', 'last_login_at'), false);
        $activeUsers = $hasLastLogin ? $this->safe(fn () => User::where('last_login_at', '>=', $start)->count(), 0) : 0;
        $previousActiveUsers = $hasLastLogin ? $this->safe(fn () => User::whereBetween('last_login_at', [$previousStart, $previousEnd])->count(), 0) : 0;

        $tournaments = $this->safe(fn () => Tournament::count(), 0);
        $currentTournaments = $this->safe(fn () => Tournament::where('created_at', '>=', $start)->count(), 0);
        $previousTournaments = $this->safe(fn () => Tournament::whereBetween('created_at', [$previousStart, $previousEnd])->count(), 0);

        return [
            'summary' => [
                'users' => ['value' => $users, 'change' => $this->change($currentUsers, $previousUsers)],
                'active_users' => ['value' => $activeUsers, 'change' => $this->change($activeUsers, $previousActiveUsers)],
                'tournaments' => ['value' => $tournaments, 'change' => $this->change($currentTournaments, $previousTournaments)],
                'orders' => ['value' => $orders, 'change' => $this->change($currentOrders, $previousOrders)],
                'revenue' => ['value' => $revenue, 'change' => $this->change($currentRevenue, $previousRevenue)],
                'products' => ['value' => $this->safe(fn () => Product::where('active', true)->count(), 0), 'change' => null],
                'blog_posts' => ['value' => $this->safe(fn () => BlogPost::where('status', 'published')->count(), 0), 'change' => null],
                'active_tournaments' => ['value' => $this->safe(fn () => Tournament::whereIn('status', ['live', 'open'])->count(), 0), 'change' => null],
            ],
            'revenue_series' => $this->safe(fn () => $this->revenueSeries($start, $paidStatuses), []),
            'recent_activities' => $this->safe(fn () => $this->recentActivities(), []),
            'top_games' => $this->safe(fn () => $this->topGames(), []),
            'top_tournaments' => $this->safe(fn () => $this->topTournaments(), []),
            'payment_methods' => $this->safe(fn () => $this->paymentMethods($paidStatuses), []),
            'top_products' => $this->safe(fn () => $this->topProducts(), []),
        ];
    }

    private function safe(callable $callback, mixed $fallback): mixed
    {
        try {
            return $callback();
        } catch (Throwable $exception) {
            report($exception);
            return $fallback;
        }
    }

    public function logs()
    {
        return ApiLog::latest()->paginate(50);
    }

    public function section(Request $request, string $section)
    {
        $search = trim((string) $request->query('q', ''));
        $limit = min(max((int) $request->integer('limit', 100), 1), 250);

        return match ($section) {
            'users' => $this->usersSection($search, $limit),
            'players' => $this->playersSection($search, $limit),
            'roles' => $this->rolesSection(),
            'tournaments' => $this->tournamentsSection($search, $limit),
            'participations', 'registrations' => $this->participationsSection($search, $limit),
            'matches' => $this->matchesSection($search, $limit),
            'rankings' => $this->rankingsSection($search, $limit),
            'products' => $this->productsSection($search, $limit),
            'orders' => $this->ordersSection($search, $limit),
            'transactions', 'payments' => $this->paymentsSection($search, $limit),
            'resellers' => $this->resellersSection($search, $limit),
            'calendar' => $this->calendarSection($search, $limit),
            'news' => $this->newsSection($search, $limit),
            'integrations' => $this->integrationsSection($limit),
            'logs' => $this->logsSection($search, $limit),
            'pages', 'banners', 'settings', 'coupons' => $this->emptySection($section),
            default => abort(404),
        };
    }

    private function resellersSection(string $search, int $limit): array
    {
        $query = ResellerPartner::query()
            ->with('wallet')
            ->withCount('orders')
            ->latest();
        $this->search($query, $search, ['name', 'company_name', 'email', 'discord', 'status']);

        return $this->sectionPayload(
            ['ID', 'Partenaire', 'Email', 'Statut', 'Solde', 'Marge', 'Commandes', 'Creation'],
            $query->limit($limit)->get()->map(fn (ResellerPartner $partner) => [
                '#'.$partner->id,
                $partner->company_name ?: $partner->name,
                $partner->email,
                $partner->status,
                number_format((float) ($partner->wallet?->balance ?? 0), 2, ',', ' ').' '.($partner->wallet?->currency ?? 'USD'),
                $partner->margin_percent.'%',
                (string) $partner->orders_count,
                $this->date($partner->created_at),
            ])->all(),
            ['Tous', 'Actifs', 'Suspendus', 'Solde faible']
        );
    }

    private function usersSection(string $search, int $limit): array
    {
        $query = User::query()->latest();
        $this->search($query, $search, ['name', 'username', 'email', 'game', 'player_uid']);

        return $this->sectionPayload(
            ['ID', 'Utilisateur', 'Email', 'Jeu', 'Role', 'Derniere connexion', 'Inscription'],
            $query->limit($limit)->get()->map(fn (User $user) => [
                '#'.$user->id,
                $user->username ?: $user->name ?: 'Utilisateur',
                $user->email,
                $user->game ?: 'Non renseigne',
                $user->is_admin ? 'Administrateur' : 'Utilisateur',
                $this->date($user->last_login_at, true),
                $this->date($user->created_at),
            ])->all(),
            ['Tous', 'Administrateurs', 'Utilisateurs']
        );
    }

    private function playersSection(string $search, int $limit): array
    {
        $query = User::query()->where(function ($builder) {
            $builder->whereNotNull('player_uid')->orWhereNotNull('game');
        })->latest();
        $this->search($query, $search, ['name', 'username', 'game', 'player_uid', 'rank', 'guild']);

        return $this->sectionPayload(
            ['ID', 'Pseudo', 'Jeu principal', 'ID joueur', 'Rang', 'Guilde', 'Points', 'Victoires'],
            $query->limit($limit)->get()->map(fn (User $user) => [
                '#'.$user->id,
                $user->username ?: $user->name ?: 'Joueur',
                $user->game ?: 'Non renseigne',
                $user->player_uid ?: 'Non renseigne',
                $user->rank ?: 'Non renseigne',
                $user->guild ?: 'Aucune',
                (string) ((int) $user->points),
                (string) ((int) $user->wins),
            ])->all(),
            ['Tous les jeux', 'Free Fire', 'PUBG', 'Fortnite']
        );
    }

    private function rolesSection(): array
    {
        return $this->sectionPayload(
            ['Role', 'Membres', 'Acces'],
            [
                ['Administrateur', (string) User::where('is_admin', true)->count(), 'Administration'],
                ['Utilisateur', (string) User::where('is_admin', false)->count(), 'Site public'],
            ],
            ['Tous', 'Administration', 'Utilisateur']
        );
    }

    private function tournamentsSection(string $search, int $limit): array
    {
        $query = Tournament::query()->withCount(['teams', 'matches'])->latest('starts_at');
        $this->search($query, $search, ['title', 'mode', 'status']);

        return $this->sectionPayload(
            ['ID', 'Tournoi', 'Format', 'Equipes', 'Matchs', 'Prize pool', 'Date', 'Statut'],
            $query->limit($limit)->get()->map(fn (Tournament $item) => [
                '#'.$item->id, $item->title, $item->mode, (string) $item->teams_count,
                (string) $item->matches_count, (string) $item->prize_pool,
                $this->date($item->starts_at, true), $this->statusLabel($item->status),
            ])->all(),
            ['Tous', 'Ouverts', 'En cours', 'Termines', 'Annules']
        );
    }

    private function participationsSection(string $search, int $limit): array
    {
        $query = TournamentTeam::query()
            ->leftJoin('tournaments', 'tournament_teams.tournament_id', '=', 'tournaments.id')
            ->select('tournament_teams.*', 'tournaments.title as tournament_title')
            ->latest('tournament_teams.created_at');
        $this->search($query, $search, ['tournament_teams.name', 'tournament_teams.status', 'tournaments.title']);

        return $this->sectionPayload(
            ['ID', 'Joueur / equipe', 'Tournoi', 'Points', 'Kills', 'Inscription', 'Statut'],
            $query->limit($limit)->get()->map(fn ($item) => [
                '#'.$item->id, $item->name, $item->tournament_title ?: 'Tournoi supprime',
                (string) ((int) $item->points), (string) ((int) $item->kills),
                $this->date($item->created_at), $item->status,
            ])->all(),
            ['Toutes', 'Validees', 'En attente', 'Refusees']
        );
    }

    private function matchesSection(string $search, int $limit): array
    {
        $query = TournamentMatch::query()->with('tournament')->latest('starts_at');
        $this->search($query, $search, ['title', 'map', 'round', 'status']);

        return $this->sectionPayload(
            ['ID', 'Match', 'Tournoi', 'Carte', 'Round', 'Heure', 'Statut'],
            $query->limit($limit)->get()->map(fn (TournamentMatch $item) => [
                '#'.$item->id, $item->title, $item->tournament?->title ?: 'Sans tournoi',
                $item->map ?: 'Non renseignee', (string) $item->round,
                $this->date($item->starts_at, true), $item->status,
            ])->all(),
            ['Tous', 'Programmes', 'Termines', 'A valider']
        );
    }

    private function rankingsSection(string $search, int $limit): array
    {
        $query = TournamentTeam::query()
            ->leftJoin('tournaments', 'tournament_teams.tournament_id', '=', 'tournaments.id')
            ->select('tournament_teams.*', 'tournaments.title as tournament_title')
            ->orderByDesc('points')->orderByDesc('kills');
        $this->search($query, $search, ['tournament_teams.name', 'tournaments.title']);

        return $this->sectionPayload(
            ['Rang', 'Joueur / equipe', 'Tournoi', 'Points', 'Kills', 'Statut'],
            $query->limit($limit)->get()->values()->map(fn ($item, int $index) => [
                (string) ($index + 1), $item->name, $item->tournament_title ?: 'Sans tournoi',
                (string) ((int) $item->points), (string) ((int) $item->kills), $item->status,
            ])->all(),
            ['General', 'Par tournoi']
        );
    }

    private function productsSection(string $search, int $limit): array
    {
        $query = Product::query()->withCount('supplierProducts')->latest();
        $this->search($query, $search, ['name', 'game', 'sku', 'currency']);

        return $this->sectionPayload(
            ['ID', 'Produit', 'Jeu', 'SKU', 'Prix', 'Variantes', 'Statut'],
            $query->limit($limit)->get()->map(fn (Product $item) => [
                '#'.$item->id, $item->name, $item->game, $item->sku,
                number_format((float) $item->price, 2, ',', ' ').' '.$item->currency,
                (string) $item->supplier_products_count, $item->active ? 'Actif' : 'Inactif',
            ])->all(),
            ['Tous', 'Actifs', 'Inactifs']
        );
    }

    private function ordersSection(string $search, int $limit): array
    {
        $query = Order::query()
            ->leftJoin('users', 'orders.user_id', '=', 'users.id')
            ->leftJoin('products', 'orders.product_id', '=', 'products.id')
            ->select('orders.*', 'users.username', 'users.name as user_name', 'users.email', 'products.name as product_name')
            ->latest('orders.created_at');
        $this->search($query, $search, ['orders.nickname', 'orders.game_uid', 'orders.status', 'users.username', 'users.email', 'products.name']);

        return $this->sectionPayload(
            ['Commande', 'Client', 'Produit', 'Compte jeu', 'Montant', 'Date', 'Statut'],
            $query->limit($limit)->get()->map(fn ($item) => [
                '#'.$item->id, $item->username ?: $item->user_name ?: $item->email ?: 'Client',
                $item->product_name ?: 'Produit supprime', $item->nickname ?: $item->game_uid,
                number_format((float) $item->amount, 2, ',', ' ').' '.$item->currency,
                $this->date($item->created_at, true), $item->status,
            ])->all(),
            ['Toutes', 'En attente', 'Payees', 'Livrees', 'Echouees']
        );
    }

    private function paymentsSection(string $search, int $limit): array
    {
        $query = Payment::query()
            ->leftJoin('users', 'payments.user_id', '=', 'users.id')
            ->select('payments.*', 'users.username', 'users.name as user_name', 'users.email')
            ->latest('payments.created_at');
        $this->search($query, $search, ['payments.reference', 'payments.provider', 'payments.status', 'users.username', 'users.email']);

        return $this->sectionPayload(
            ['Reference', 'Client', 'Methode', 'Montant', 'Devise', 'Date', 'Statut'],
            $query->limit($limit)->get()->map(fn ($item) => [
                $item->reference, $item->username ?: $item->user_name ?: $item->email ?: 'Client',
                $item->provider, number_format((float) $item->amount, 2, ',', ' '),
                $item->currency, $this->date($item->created_at, true), $item->status,
            ])->all(),
            ['Toutes', 'Succes', 'En attente', 'Echecs']
        );
    }

    private function calendarSection(string $search, int $limit): array
    {
        $query = Tournament::query()->orderBy('starts_at');
        $this->search($query, $search, ['title', 'mode', 'status']);

        return $this->sectionPayload(
            ['Evenement', 'Type', 'Date', 'Format', 'Statut'],
            $query->limit($limit)->get()->map(fn (Tournament $item) => [
                $item->title, 'Tournoi', $this->date($item->starts_at, true), $item->mode, $this->statusLabel($item->status),
            ])->all(),
            ['Tous', 'Tournois']
        );
    }

    private function newsSection(string $search, int $limit): array
    {
        $query = BlogPost::query()->latest();
        $this->search($query, $search, ['title', 'slug', 'status', 'excerpt']);

        return $this->sectionPayload(
            ['ID', 'Titre', 'Slug', 'Publication', 'Blogger', 'Statut'],
            $query->limit($limit)->get()->map(fn (BlogPost $item) => [
                '#'.$item->id, $item->title, $item->slug,
                $this->date($item->published_at ?: $item->scheduled_at, true),
                $item->blogger_post_id ? 'Synchronise' : 'Non synchronise', $item->status,
            ])->all(),
            ['Toutes', 'Publiees', 'Brouillons', 'Echecs']
        );
    }

    private function integrationsSection(int $limit): array
    {
        $suppliers = Supplier::query()->latest()->limit($limit)->get()->map(fn (Supplier $item) => [
            $item->name, 'Fournisseur', $item->base_url ?: 'Non renseignee',
            (string) $item->priority, $item->active ? 'Connecte' : 'Inactif',
        ]);
        $services = ApiLog::query()->select('service')->distinct()->limit($limit)->get()->map(function ($item) {
            $last = ApiLog::where('service', $item->service)->latest()->first();
            return [
                $item->service, 'Service API', $last?->endpoint ?: 'Non renseigne',
                $last ? ((int) $last->duration_ms).' ms' : '-',
                $last && (int) $last->status_code < 400 ? 'Connecte' : 'Erreur',
            ];
        });

        return $this->sectionPayload(
            ['Service', 'Categorie', 'Endpoint', 'Priorite / latence', 'Statut'],
            $suppliers->merge($services)->values()->all(),
            ['Toutes', 'Fournisseurs', 'Services API']
        );
    }

    private function logsSection(string $search, int $limit): array
    {
        $query = ApiLog::query()->latest();
        $this->search($query, $search, ['service', 'direction', 'endpoint', 'status_code']);

        return $this->sectionPayload(
            ['Date', 'Service', 'Direction', 'Endpoint', 'HTTP', 'Duree', 'Statut'],
            $query->limit($limit)->get()->map(fn (ApiLog $item) => [
                $this->date($item->created_at, true), $item->service, $item->direction,
                $item->endpoint, (string) $item->status_code, ((int) $item->duration_ms).' ms',
                (int) $item->status_code < 400 ? 'Succes' : 'Erreur',
            ])->all(),
            ['Tous', 'Succes', 'Erreurs']
        );
    }

    private function emptySection(string $section): array
    {
        return $this->sectionPayload(
            ['Information', 'Etat'],
            [],
            ['Tous'],
            "Aucune donnee {$section} n'est encore enregistree dans la base de donnees."
        );
    }

    private function sectionPayload(array $columns, array $rows, array $filters, ?string $emptyMessage = null): array
    {
        return [
            'columns' => $columns,
            'rows' => $rows,
            'filters' => $filters,
            'total' => count($rows),
            'empty_message' => $emptyMessage,
        ];
    }

    private function search($query, string $search, array $columns): void
    {
        if ($search === '') {
            return;
        }

        $query->where(function ($builder) use ($search, $columns) {
            foreach ($columns as $index => $column) {
                $method = $index === 0 ? 'where' : 'orWhere';
                $builder->{$method}($column, 'like', "%{$search}%");
            }
        });
    }

    private function date($value, bool $withTime = false): string
    {
        if (! $value) {
            return 'Jamais';
        }

        $date = $value instanceof Carbon ? $value : Carbon::parse($value);
        return $withTime ? $date->format('d/m/Y H:i') : $date->format('d/m/Y');
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
