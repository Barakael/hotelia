<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Shop;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminReportsController extends Controller
{
    /**
     * GET /api/admin/reports
     * Returns system-wide and per-shop analytics for super_admin.
     */
    public function index(Request $request)
    {
        // ── System-wide totals ────────────────────────────────────────────────
        $totalShops        = Shop::count();
        $totalUsers        = User::count();
        $totalRevenue      = Sale::sum('total');
        $totalTransactions = Sale::count();

        // ── Per-shop breakdown ────────────────────────────────────────────────
        $shopBreakdown = Shop::select('shops.id', 'shops.name', 'shops.currency')
            ->withCount(['cashiers as cashier_count'])
            ->get()
            ->map(function ($shop) {
                $salesData = Sale::whereHas(
                    'cashier',
                    fn ($q) => $q->where('shop_id', $shop->id)
                )
                ->selectRaw('SUM(total) as revenue, COUNT(*) as transactions')
                ->first();

                return [
                    'id'            => $shop->id,
                    'name'          => $shop->name,
                    'currency'      => $shop->currency,
                    'cashier_count' => $shop->cashier_count,
                    'revenue'       => (float) ($salesData->revenue ?? 0),
                    'transactions'  => (int)   ($salesData->transactions ?? 0),
                ];
            });

        // ── Daily revenue last 30 days (system-wide) ─────────────────────────
        $dailyRevenue = Sale::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total) as total'),
                DB::raw('COUNT(*) as transactions')
            )
            ->where('created_at', '>=', now()->subDays(29)->startOfDay())
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        // ── Top shop ──────────────────────────────────────────────────────────
        $topShop = $shopBreakdown->sortByDesc('revenue')->first();

        // ── Top 10 products system-wide ───────────────────────────────────────
        $topProducts = SaleItem::select(
                'product_id',
                DB::raw('SUM(quantity) as total_sold'),
                DB::raw('SUM(unit_price * quantity) as total_revenue')
            )
            ->with('product:id,name,category')
            ->groupBy('product_id')
            ->orderByDesc('total_sold')
            ->limit(10)
            ->get()
            ->map(fn ($item) => [
                'product_id'    => $item->product_id,
                'name'          => $item->product?->name ?? 'Unknown',
                'category'      => $item->product?->category ?? '—',
                'total_sold'    => (int) $item->total_sold,
                'total_revenue' => (float) $item->total_revenue,
            ]);

        // ── Subscription summary ──────────────────────────────────────────────
        $activeSubscriptions = Subscription::where('status', 'active')->with('plan')->get();
        $mrr = $activeSubscriptions->sum(fn ($s) => $s->plan?->price ?? 0);

        $paymentStats = SubscriptionPayment::select('status', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total'))
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return response()->json([
            'summary' => [
                'total_shops'         => $totalShops,
                'total_users'         => $totalUsers,
                'total_revenue'       => (float) $totalRevenue,
                'total_transactions'  => $totalTransactions,
                'mrr'                 => $mrr,
                'active_subscriptions'=> $activeSubscriptions->count(),
                'overdue_payments'    => SubscriptionPayment::where('status', 'pending')->where('due_date', '<', today())->count(),
            ],
            'shop_breakdown'     => $shopBreakdown->values(),
            'daily_revenue'      => $dailyRevenue,
            'top_shop'           => $topShop,
            'top_products'       => $topProducts,
            'payment_stats'      => $paymentStats,
        ]);
    }
}
