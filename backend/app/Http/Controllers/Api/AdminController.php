<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiLog;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Tournament;

class AdminController extends Controller
{
    public function analytics()
    {
        return [
            'revenue' => Payment::where('status', 'paid')->sum('amount'),
            'orders' => Order::count(),
            'active_tournaments' => Tournament::whereIn('status', ['live', 'open'])->count(),
            'top_products' => Order::selectRaw('product_id, count(*) as sales')->groupBy('product_id')->orderByDesc('sales')->limit(10)->get(),
        ];
    }

    public function logs()
    {
        return ApiLog::latest()->paginate(50);
    }
}
