<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\FolioPayment;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ServiceBooking;
use App\Models\Shop;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // ── Super admin: platform-wide managerial dashboard ───────────────────
        if ($user->role === 'super_admin') {
            $today = today();

            $totalShops        = Shop::count();
            $totalUsers        = User::count();
            $todaySales        = Sale::whereDate('created_at', $today)->get();
            $todayTotal        = $todaySales->sum('total');
            $todayTransactions = $todaySales->count();

            // MRR: sum of active subscription plan prices
            $activeSubscriptions = Subscription::where('status', 'active')
                ->with('plan')
                ->get();
            $mrr = $activeSubscriptions->sum(fn ($s) => $s->plan?->price ?? 0);
            $activeSubCount = $activeSubscriptions->count();

            // Overdue payments count
            $overdueCount = SubscriptionPayment::where('status', 'pending')
                ->where('due_date', '<', today())
                ->count();

            // Top 5 products system-wide by quantity sold
            $topProducts = SaleItem::select('product_id', DB::raw('SUM(quantity) as total_sold'), DB::raw('SUM(unit_price * quantity) as total_revenue'))
                ->with('product:id,name,category')
                ->groupBy('product_id')
                ->orderByDesc('total_sold')
                ->limit(5)
                ->get()
                ->map(fn ($item) => [
                    'product_id'    => $item->product_id,
                    'name'          => $item->product?->name ?? 'Unknown',
                    'category'      => $item->product?->category ?? '—',
                    'total_sold'    => (int) $item->total_sold,
                    'total_revenue' => (float) $item->total_revenue,
                ]);

            // Last 7 days system-wide
            $weeklySales = Sale::select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('SUM(total) as total'),
                    DB::raw('COUNT(*) as transactions')
                )
                ->where('created_at', '>=', now()->subDays(6)->startOfDay())
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('date')
                ->get();

            // Recent activity
            $recentActivity = ActivityLog::with('user:id,name,role')
                ->orderByDesc('created_at')
                ->limit(8)
                ->get();

            return response()->json([
                'role'                => 'super_admin',
                'total_shops'         => $totalShops,
                'total_users'         => $totalUsers,
                'today_total'         => $todayTotal,
                'today_transactions'  => $todayTransactions,
                'mrr'                 => $mrr,
                'active_subscriptions'=> $activeSubCount,
                'overdue_payments'    => $overdueCount,
                'top_products'        => $topProducts,
                'weekly_sales'        => $weeklySales,
                'recent_activity'     => $recentActivity,
            ]);
        }

        // ── Owner / cashier: store-scoped dashboard ───────────────────────────
        $shopId = $user->shop_id;
        $today  = today();

        $salesQuery = Sale::whereHas('cashier', fn ($q) => $q->where('shop_id', $shopId));

        $todaySales        = (clone $salesQuery)->whereDate('created_at', $today)->get();
        $todayTotal        = $todaySales->sum('total');
        $todayTransactions = $todaySales->count();

        $productQuery = Product::where('shop_id', $shopId);

        $lowStock = (clone $productQuery)
            ->whereColumn('stock', '<=', 'low_stock_threshold')
            ->orderBy('stock')
            ->get();

        $categoryStock = (clone $productQuery)
            ->select('category', DB::raw('SUM(stock) as total_stock'))
            ->groupBy('category')
            ->get();

        $weeklySales = (clone $salesQuery)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total) as total'),
                DB::raw('COUNT(*) as transactions')
            )
            ->where('created_at', '>=', now()->subDays(6)->startOfDay())
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        // Top 5 products for this shop
        $saleIds = (clone $salesQuery)->pluck('id');
        $topProducts = SaleItem::select('product_id', DB::raw('SUM(quantity) as total_sold'), DB::raw('SUM(unit_price * quantity) as total_revenue'))
            ->with('product:id,name,category')
            ->whereIn('sale_id', $saleIds)
            ->groupBy('product_id')
            ->orderByDesc('total_sold')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'product_id'    => $item->product_id,
                'name'          => $item->product?->name ?? 'Unknown',
                'category'      => $item->product?->category ?? '—',
                'total_sold'    => (int) $item->total_sold,
                'total_revenue' => (float) $item->total_revenue,
            ]);

        $occupancyTonight = Room::where('shop_id', $shopId)->where('status', 'occupied')->count();
        $totalRooms = Room::where('shop_id', $shopId)->count();

        $roomRevenue = FolioPayment::whereHas('folio', fn ($q) => $q->where('shop_id', $shopId))
            ->whereDate('created_at', $today)
            ->sum('amount');

        $serviceRevenue = ServiceBooking::where('shop_id', $shopId)
            ->where('status', 'settled')
            ->whereDate('created_at', $today)
            ->sum('amount');

        $outletSales = Sale::where('shop_id', $shopId)
            ->whereDate('created_at', $today)
            ->whereNotNull('branch_id')
            ->select('branch_id', DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as transactions'))
            ->groupBy('branch_id')
            ->get()
            ->map(function ($row) {
                $branch = Branch::find($row->branch_id);

                return [
                    'branch_id' => $row->branch_id,
                    'name' => $branch?->name ?? 'Outlet',
                    'outlet_type' => $branch?->outlet_type,
                    'total' => (float) $row->total,
                    'transactions' => (int) $row->transactions,
                ];
            });

        $checkedIn = Reservation::where('shop_id', $shopId)->where('status', 'checked_in')->count();

        return response()->json([
            'role' => $user->role,
            'today_total' => $todayTotal,
            'today_transactions' => $todayTransactions,
            'total_products' => (clone $productQuery)->count(),
            'low_stock_count' => $lowStock->count(),
            'low_stock_items' => $lowStock,
            'category_stock' => $categoryStock,
            'weekly_sales' => $weeklySales,
            'top_products' => $topProducts,
            'occupancy_tonight' => $occupancyTonight,
            'total_rooms' => $totalRooms,
            'checked_in_guests' => $checkedIn,
            'room_revenue_today' => (float) $roomRevenue,
            'service_revenue_today' => (float) $serviceRevenue,
            'outlet_sales_today' => $outletSales,
        ]);
    }
}
