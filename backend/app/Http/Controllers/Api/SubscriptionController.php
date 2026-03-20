<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SubscriptionController extends Controller
{
    /**
     * GET /api/subscriptions
     * super_admin → all subscriptions with shop + plan
     * owner       → their shop's subscription
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'super_admin') {
            $subs = Subscription::with(['shop', 'plan'])
                ->orderByDesc('created_at')
                ->get()
                ->map(fn($s) => $this->formatSub($s));

            return response()->json($subs);
        }

        // owner — their shop
        $shop = Shop::where('owner_id', $user->id)->first();
        if (!$shop) {
            return response()->json(null);
        }

        $sub = Subscription::with(['shop', 'plan'])
            ->where('shop_id', $shop->id)
            ->latest()
            ->first();

        // Use raw response to avoid Symfony's null→ArrayObject→{} serialization bug
        if (!$sub) {
            return response('null', 200)->header('Content-Type', 'application/json');
        }
        return response()->json($this->formatSub($sub));
    }

    /**
     * POST /api/subscriptions  (super_admin only)
     * Assign/change a plan for a shop
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'shop_id'  => 'required|exists:shops,id',
            'plan_id'  => 'required|exists:plans,id',
            'starts_at'=> 'nullable|date',
        ]);

        $starts = isset($data['starts_at']) ? Carbon::parse($data['starts_at']) : now();
        $nextDue = $starts->copy()->addMonth();

        // Cancel any existing active sub for this shop
        Subscription::where('shop_id', $data['shop_id'])
            ->whereNull('cancelled_at')
            ->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        $sub = Subscription::create([
            'shop_id'    => $data['shop_id'],
            'plan_id'    => $data['plan_id'],
            'status'     => 'active',
            'starts_at'  => $starts,
            'next_due_at'=> $nextDue,
        ]);

        // Auto-create first payment invoice
        $plan = $sub->plan;
        SubscriptionPayment::create([
            'subscription_id' => $sub->id,
            'shop_id'         => $data['shop_id'],
            'amount'          => $plan->price,
            'status'          => 'pending',
            'due_date'        => $starts,
        ]);

        return response()->json($sub->load(['shop', 'plan']), 201);
    }

    private function formatSub(Subscription $s): array
    {
        return [
            'id'          => $s->id,
            'shop_id'     => $s->shop_id,
            'shop_name'   => $s->shop->name ?? '—',
            'plan_id'     => $s->plan_id,
            'plan_name'   => $s->plan->name ?? '—',
            'plan_price'  => $s->plan->price ?? 0,
            'status'      => $s->status,
            'starts_at'   => $s->starts_at?->toDateString(),
            'next_due_at' => $s->next_due_at?->toDateString(),
            'days_until_due' => $s->next_due_at ? now()->diffInDays($s->next_due_at, false) : null,
        ];
    }
}
