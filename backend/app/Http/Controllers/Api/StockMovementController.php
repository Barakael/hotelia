<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockMovementController extends Controller
{
    public function index(Request $request)
    {
        $query = StockMovement::with(['product:id,name,barcode', 'user:id,name', 'branch:id,name'])
            ->where('shop_id', $request->user()->shop_id)
            ->orderByDesc('created_at');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        return response()->json($query->limit(200)->get());
    }

    public function adjust(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'qty' => 'required|integer|not_in:0',
            'type' => 'required|in:adjustment,wastage,return,opening',
            'note' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        $movement = DB::transaction(function () use ($data, $user) {
            $product = Product::where('shop_id', $user->shop_id)
                ->lockForUpdate()
                ->findOrFail($data['product_id']);

            $qty = (int) $data['qty'];
            // wastage is always outbound negative
            if ($data['type'] === 'wastage' && $qty > 0) {
                $qty = -$qty;
            }

            $newStock = $product->stock + $qty;
            if ($newStock < 0) {
                abort(422, 'Insufficient stock for this adjustment.');
            }

            $product->update(['stock' => $newStock]);

            return StockMovement::create([
                'shop_id' => $user->shop_id,
                'product_id' => $product->id,
                'branch_id' => $product->branch_id,
                'type' => $data['type'],
                'qty' => $qty,
                'user_id' => $user->id,
                'note' => $data['note'] ?? null,
            ]);
        });

        return response()->json($movement->load(['product:id,name,barcode']), 201);
    }

    public function reconcile(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'counted_qty' => 'required|integer|min:0',
            'note' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        $movement = DB::transaction(function () use ($data, $user) {
            $product = Product::where('shop_id', $user->shop_id)
                ->lockForUpdate()
                ->findOrFail($data['product_id']);

            $diff = (int) $data['counted_qty'] - (int) $product->stock;
            if ($diff === 0) {
                abort(422, 'Count matches the book quantity. Nothing to post.');
            }

            $product->update(['stock' => (int) $data['counted_qty']]);

            return StockMovement::create([
                'shop_id' => $user->shop_id,
                'product_id' => $product->id,
                'branch_id' => null,
                'type' => 'adjustment',
                'qty' => $diff,
                'user_id' => $user->id,
                'note' => $data['note'] ?? 'Store reconciliation',
            ]);
        });

        return response()->json($movement->load(['product:id,name']), 201);
    }
}
