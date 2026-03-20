<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Models\SubscriptionPayment;
use Illuminate\Http\Request;

class SubscriptionPaymentController extends Controller
{
    /**
     * GET /api/subscription-payments
     * super_admin → all payments with shop+subscription
     * owner       → payments for their shop only
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = SubscriptionPayment::with(['shop', 'subscription.plan'])
            ->orderByDesc('due_date');

        if ($user->role !== 'super_admin') {
            $shop = Shop::where('owner_id', $user->id)->first();
            if (!$shop) {
                return response()->json([]);
            }
            $query->where('shop_id', $shop->id);
        }

        return response()->json($query->get()->map(fn($p) => $this->formatPayment($p)));
    }

    /**
     * PUT /api/subscription-payments/{id}/mark-paid  (super_admin)
     * Mark a payment as paid
     */
    public function markPaid(Request $request, int $id)
    {
        $data = $request->validate([
            'payment_method' => 'nullable|string|max:50',
            'reference'      => 'nullable|string|max:100',
            'notes'          => 'nullable|string|max:500',
        ]);

        $payment = SubscriptionPayment::findOrFail($id);
        $payment->update([
            'status'         => 'paid',
            'paid_at'        => now(),
            'payment_method' => $data['payment_method'] ?? $payment->payment_method,
            'reference'      => $data['reference']      ?? $payment->reference,
            'notes'          => $data['notes']           ?? $payment->notes,
        ]);

        // Advance next_due_at on the subscription
        $sub = $payment->subscription;
        if ($sub) {
            $sub->update([
                'status'      => 'active',
                'next_due_at' => $sub->next_due_at->addMonth(),
            ]);

            // Create next invoice automatically
            SubscriptionPayment::create([
                'subscription_id' => $sub->id,
                'shop_id'         => $payment->shop_id,
                'amount'          => $sub->plan->price ?? $payment->amount,
                'status'          => 'pending',
                'due_date'        => $sub->next_due_at,
            ]);
        }

        return response()->json($this->formatPayment($payment->fresh(['shop', 'subscription.plan'])));
    }

    private function formatPayment(SubscriptionPayment $p): array
    {
        return [
            'id'             => $p->id,
            'shop_id'        => $p->shop_id,
            'shop_name'      => $p->shop->name ?? '—',
            'plan_name'      => $p->subscription?->plan?->name ?? '—',
            'amount'         => $p->amount,
            'status'         => $p->status,
            'payment_method' => $p->payment_method,
            'reference'      => $p->reference,
            'due_date'       => $p->due_date?->toDateString(),
            'paid_at'        => $p->paid_at?->toDateTimeString(),
            'notes'          => $p->notes,
        ];
    }
}
