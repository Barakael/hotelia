<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OutletStock;
use App\Models\Product;
use App\Models\StockMovement;
use App\Support\Desk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $shopId = $user->shop_id;

        $query = Product::where('shop_id', $shopId);

        $sellingIds = Desk::sellingBranchIds($user);

        if ($sellingIds !== null) {
            $query->whereIn('branch_id', $sellingIds);
        } elseif ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('barcode')) {
            $product = (clone $query)->where('barcode', $request->barcode)->first();
            if (! $product) {
                return response()->json(['message' => 'Product not found.'], 404);
            }

            return response()->json($this->withSellableStock($product, $sellingIds));
        }

        $products = $query->orderBy('name')->get();
        if ($sellingIds !== null) {
            $products = $products->map(fn ($p) => $this->withSellableStock($p, $sellingIds));
        }

        return response()->json($products);
    }

    /** Bar / F&B tills sell issued outlet stock, not the store quantity. */
    private function withSellableStock(Product $product, ?array $sellingIds): Product
    {
        if ($sellingIds === null) {
            return $product;
        }

        $qty = (int) OutletStock::where('product_id', $product->id)
            ->where('branch_id', $product->branch_id)
            ->value('qty');
        $product->stock = $qty;

        return $product;
    }

    public function store(Request $request)
    {
        $shopId = $request->user()->shop_id;

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'barcode' => ['required', 'string', Rule::unique('products')->where('shop_id', $shopId)],
            'price' => 'required|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'category' => 'required|string|max:100',
            'image' => 'nullable|string',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'branch_id' => 'nullable|exists:branches,id',
            'is_sellable_transfer' => 'nullable|boolean',
        ]);

        $user = $request->user();
        // Outlet desks cannot create store master products / tools
        if (in_array($user->role, ['bar', 'fnb'], true)) {
            abort(403, 'Outlet desks receive stock from the store; they cannot create store products.');
        }

        $data['shop_id'] = $shopId;
        $data['is_sellable_transfer'] = (bool) ($data['is_sellable_transfer'] ?? false);
        $openingStock = (int) ($data['stock'] ?? 0);
        $data['stock'] = 0;

        $product = DB::transaction(function () use ($data, $openingStock, $request) {
            $product = Product::create($data);

            if ($openingStock > 0) {
                $product->update(['stock' => $openingStock]);
                StockMovement::create([
                    'shop_id' => $product->shop_id,
                    'product_id' => $product->id,
                    'branch_id' => $product->branch_id,
                    'type' => 'opening',
                    'qty' => $openingStock,
                    'user_id' => $request->user()->id,
                    'note' => 'Opening stock',
                ]);
            }

            return $product;
        });

        return response()->json($product, 201);
    }

    public function show(Request $request, string $id)
    {
        $product = Product::where('shop_id', $request->user()->shop_id)
            ->findOrFail($id);

        return response()->json($product);
    }

    public function update(Request $request, string $id)
    {
        $product = Product::where('shop_id', $request->user()->shop_id)
            ->findOrFail($id);

        $user = $request->user();
        if (in_array($user->role, ['bar', 'fnb'], true)) {
            // Outlet may only tweak price display fields on their catalog items
            $data = $request->validate([
                'price' => 'sometimes|numeric|min:0',
                'low_stock_threshold' => 'nullable|integer|min:0',
            ]);
        } else {
            $data = $request->validate([
                'name' => 'sometimes|string|max:255',
                'barcode' => ['sometimes', 'string', Rule::unique('products')->where('shop_id', $product->shop_id)->ignore($product->id)],
                'price' => 'sometimes|numeric|min:0',
                'category' => 'sometimes|string|max:100',
                'image' => 'nullable|string',
                'low_stock_threshold' => 'nullable|integer|min:0',
                'branch_id' => 'nullable|exists:branches,id',
                'is_sellable_transfer' => 'nullable|boolean',
            ]);
            if (array_key_exists('is_sellable_transfer', $data)) {
                $data['is_sellable_transfer'] = (bool) $data['is_sellable_transfer'];
            }
        }

        // Stock is NOT updated here — use stock movements / purchases
        $product->update($data);

        return response()->json($product);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        if (in_array($user->role, ['bar', 'fnb'], true)) {
            abort(403, 'Outlet desks cannot delete store products.');
        }

        $product = Product::where('shop_id', $user->shop_id)
            ->findOrFail($id);
        $product->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
