<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class BpmReportController extends Controller
{
    /**
     * GET /api/bpm/overview
     *
     * Single comprehensive endpoint for the BPM system.
     * Returns shops, subscriptions, revenue totals, weekly breakdown
     * (current month), and monthly breakdown (current year).
     */
    public function overview(): JsonResponse
    {
        $now        = now();
        $weekStart  = $now->copy()->startOfWeek(Carbon::MONDAY);
        $monthStart = $now->copy()->startOfMonth();
        $lastMonthStart = $now->copy()->subMonth()->startOfMonth();
        $lastMonthEnd   = $now->copy()->subMonth()->endOfMonth();
        $yearStart  = $now->copy()->startOfYear();

        // ── Shops ─────────────────────────────────────────────────────────────
        $recentShops = Shop::select('id', 'name', 'email', 'currency', 'created_at')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($s) => [
                'shop_id'    => $s->id,
                'name'       => $s->name,
                'email'      => $s->email,
                'currency'   => $s->currency,
                'created_at' => $s->created_at,
            ]);

        // ── Subscription payments ─────────────────────────────────────────────
        $recentPayments = SubscriptionPayment::with('shop:id,name,currency')
            ->where('status', 'paid')
            ->orderByDesc('paid_at')
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'payment_id'     => $p->id,
                'shop'           => $p->shop?->name,
                'amount'         => (float) $p->amount,
                'payment_method' => $p->payment_method,
                'paid_at'        => $p->paid_at,
            ]);

        // ── Monthly revenue — all months of current year ──────────────────────
        $yearPayments = SubscriptionPayment::where('status', 'paid')
            ->where('paid_at', '>=', $yearStart)
            ->get(['amount', 'paid_at'])
            ->groupBy(fn ($p) => Carbon::parse($p->paid_at)->format('Y-m'));

        $yearShops = Shop::where('created_at', '>=', $yearStart)
            ->get(['created_at'])
            ->groupBy(fn ($s) => Carbon::parse($s->created_at)->format('Y-m'));

        $monthlyRevenue = [];
        for ($m = 1; $m <= 12; $m++) {
            $key   = $now->copy()->month($m)->format('Y-m');
            $label = Carbon::createFromFormat('Y-m', $key)->format('M Y');
            $group = $yearPayments->get($key, collect());
            $monthlyRevenue[] = [
                'month'              => $label,
                'period'             => $key,
                'revenue'            => (float) $group->sum('amount'),
                'paid_subscriptions' => $group->count(),
                'new_shops'          => $yearShops->get($key, collect())->count(),
            ];
        }

        // ── Weekly revenue — weeks of current month ───────────────────────────
        $weeklyRevenue = [];
        $weekCursor    = $monthStart->copy()->startOfWeek(Carbon::MONDAY);
        $weekNum       = 1;

        while ($weekCursor->lte($now->copy()->endOfMonth())) {
            $weekEnd = $weekCursor->copy()->endOfWeek(Carbon::SUNDAY);

            $revenue = SubscriptionPayment::where('status', 'paid')
                ->whereBetween('paid_at', [$weekCursor, $weekEnd])
                ->sum('amount');

            $newShops = Shop::whereBetween('created_at', [$weekCursor, $weekEnd])->count();

            $weeklyRevenue[] = [
                'week'       => 'Week ' . $weekNum,
                'period'     => $weekCursor->toDateString() . ' to ' . $weekEnd->toDateString(),
                'revenue'    => (float) $revenue,
                'new_shops'  => $newShops,
            ];

            $weekCursor->addWeek();
            $weekNum++;
        }

        return response()->json([
            'status'  => 'success',
            'data'    => [
                'shops' => [
                    'total'           => Shop::count(),
                    'this_week'       => Shop::where('created_at', '>=', $weekStart)->count(),
                    'this_month'      => Shop::where('created_at', '>=', $monthStart)->count(),
                    'last_month'      => Shop::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->count(),
                    'recent'          => $recentShops,
                ],
                'subscriptions' => [
                    'active_total'    => Subscription::where('status', 'active')->count(),
                    'this_week'       => SubscriptionPayment::where('status', 'paid')->where('paid_at', '>=', $weekStart)->count(),
                    'this_month'      => SubscriptionPayment::where('status', 'paid')->where('paid_at', '>=', $monthStart)->count(),
                    'last_month'      => SubscriptionPayment::where('status', 'paid')->whereBetween('paid_at', [$lastMonthStart, $lastMonthEnd])->count(),
                    'pending_overdue' => SubscriptionPayment::where('status', 'pending')->where('due_date', '<', today())->count(),
                    'recent_payments' => $recentPayments,
                ],
                'revenue' => [
                    'currency'    => 'TZS',
                    'total'       => (float) SubscriptionPayment::where('status', 'paid')->sum('amount'),
                    'this_week'   => (float) SubscriptionPayment::where('status', 'paid')->where('paid_at', '>=', $weekStart)->sum('amount'),
                    'this_month'  => (float) SubscriptionPayment::where('status', 'paid')->where('paid_at', '>=', $monthStart)->sum('amount'),
                    'last_month'  => (float) SubscriptionPayment::where('status', 'paid')->whereBetween('paid_at', [$lastMonthStart, $lastMonthEnd])->sum('amount'),
                ],
                'weekly_revenue'  => $weeklyRevenue,
                'monthly_revenue' => $monthlyRevenue,
            ],
            'message' => 'BPM overview retrieved successfully.',
        ]);
    }

    /**
     * GET /api/bpm/report/weekly?weeks=12
     *
     * Weekly breakdown for the last N ISO weeks (default 12, max 52).
     * Each period shows: new shops registered, paid subscription payments,
     * and total subscription revenue collected.
     */
    public function weekly(Request $request): JsonResponse
    {
        $weeks = min((int) $request->input('weeks', 12), 52);
        $from  = now()->subWeeks($weeks - 1)->startOfIsoWeek();

        // New shops per ISO week  (%x = ISO year, %v = ISO week 01-53)
        $shopRows = Shop::select(
                DB::raw("DATE_FORMAT(created_at, '%x-%v') AS period"),
                DB::raw('COUNT(*) AS new_shops')
            )
            ->where('created_at', '>=', $from)
            ->groupBy('period')
            ->orderBy('period')
            ->pluck('new_shops', 'period');

        // Paid subscription payments per ISO week
        $paymentRows = SubscriptionPayment::select(
                DB::raw("DATE_FORMAT(paid_at, '%x-%v') AS period"),
                DB::raw('COUNT(*) AS paid_count'),
                DB::raw('SUM(amount) AS revenue')
            )
            ->where('status', 'paid')
            ->where('paid_at', '>=', $from)
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->keyBy('period');

        // Build a contiguous list of all ISO week periods
        $periods = [];
        $cursor  = $from->copy();

        while ($cursor->lte(now())) {
            // PHP 'o' = ISO year, 'W' = ISO week number (01-53), matches MySQL %x-%v
            $key = $cursor->format('o-W');

            $periods[] = [
                'period'               => $key,
                'new_shops'            => (int)   ($shopRows[$key]              ?? 0),
                'paid_subscriptions'   => (int)   ($paymentRows[$key]?->paid_count ?? 0),
                'subscription_revenue' => (float) ($paymentRows[$key]?->revenue    ?? 0),
            ];

            $cursor->addWeek();
        }

        return response()->json([
            'period_type' => 'weekly',
            'periods'     => $periods,
        ]);
    }

    /**
     * GET /api/bpm/report/monthly?months=12
     *
     * Monthly breakdown for the last N months (default 12, max 24).
     * Each period shows: new shops registered, paid subscription payments,
     * and total subscription revenue collected.
     */
    public function monthly(Request $request): JsonResponse
    {
        $months = min((int) $request->input('months', 12), 24);
        $from   = now()->subMonths($months - 1)->startOfMonth();

        // New shops per calendar month
        $shopRows = Shop::select(
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') AS period"),
                DB::raw('COUNT(*) AS new_shops')
            )
            ->where('created_at', '>=', $from)
            ->groupBy('period')
            ->orderBy('period')
            ->pluck('new_shops', 'period');

        // Paid subscription payments per calendar month
        $paymentRows = SubscriptionPayment::select(
                DB::raw("DATE_FORMAT(paid_at, '%Y-%m') AS period"),
                DB::raw('COUNT(*) AS paid_count'),
                DB::raw('SUM(amount) AS revenue')
            )
            ->where('status', 'paid')
            ->where('paid_at', '>=', $from)
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->keyBy('period');

        // Build a contiguous list of all calendar month periods
        $periods = [];
        $cursor  = $from->copy();

        while ($cursor->lte(now())) {
            $key = $cursor->format('Y-m');

            $periods[] = [
                'period'               => $key,
                'new_shops'            => (int)   ($shopRows[$key]              ?? 0),
                'paid_subscriptions'   => (int)   ($paymentRows[$key]?->paid_count ?? 0),
                'subscription_revenue' => (float) ($paymentRows[$key]?->revenue    ?? 0),
            ];

            $cursor->addMonth();
        }

        return response()->json([
            'period_type' => 'monthly',
            'periods'     => $periods,
        ]);
    }
}
