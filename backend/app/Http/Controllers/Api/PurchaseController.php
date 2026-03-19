<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Purchase::with(['supplier', 'items.product', 'creator:id,name'])
                ->where('shop_id', $request->user()->shop_id)
                ->orderByDesc('created_at')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);

        $user = $request->user();
        $shopId = $user->shop_id;

        $purchase = DB::transaction(function () use ($data, $user, $shopId) {
            $total = 0;
            foreach ($data['items'] as $item) {
                $total += $item['qty'] * $item['unit_cost'];
            }

            $purchase = Purchase::create([
                'shop_id' => $shopId,
                'supplier_id' => $data['supplier_id'],
                'status' => 'draft',
                'total' => round($total, 2),
                'created_by' => $user->id,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $purchase->items()->create([
                    'product_id' => $item['product_id'],
                    'qty' => $item['qty'],
                    'unit_cost' => $item['unit_cost'],
                ]);
            }

            return $purchase->load(['supplier', 'items.product']);
        });

        return response()->json($purchase, 201);
    }

    public function show(Request $request, string $id)
    {
        $purchase = Purchase::with(['supplier', 'items.product', 'creator:id,name'])
            ->where('shop_id', $request->user()->shop_id)
            ->findOrFail($id);

        return response()->json($purchase);
    }

    public function receive(Request $request, string $id)
    {
        $user = $request->user();

        $purchase = DB::transaction(function () use ($id, $user) {
            $purchase = Purchase::with('items')
                ->where('shop_id', $user->shop_id)
                ->lockForUpdate()
                ->findOrFail($id);

            if ($purchase->status === 'received') {
                abort(422, 'Purchase already received.');
            }

            foreach ($purchase->items as $item) {
                $product = Product::where('shop_id', $user->shop_id)
                    ->lockForUpdate()
                    ->findOrFail($item->product_id);

                $product->increment('stock', $item->qty);

                StockMovement::create([
                    'shop_id' => $user->shop_id,
                    'product_id' => $product->id,
                    'branch_id' => $product->branch_id,
                    'type' => 'purchase_receive',
                    'qty' => $item->qty,
                    'reference_type' => Purchase::class,
                    'reference_id' => $purchase->id,
                    'user_id' => $user->id,
                    'note' => "Purchase #{$purchase->id} received",
                ]);
            }

            $purchase->update([
                'status' => 'received',
                'received_at' => now(),
            ]);

            return $purchase->fresh(['supplier', 'items.product']);
        });

        return response()->json($purchase);
    }
}
