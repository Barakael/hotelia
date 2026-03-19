<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Folio;
use App\Models\FolioCharge;
use App\Models\OutletStock;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Shop;
use App\Models\StockMovement;
use App\Support\Desk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $query = Sale::with(['items', 'cashier:id,name', 'shop', 'branch:id,name,outlet_type'])
            ->orderByDesc('created_at');

        $user = $request->user();
        if ($user->role !== 'super_admin' && $user->shop_id) {
            $query->where('shop_id', $user->shop_id);
        }

        $sellingIds = \App\Support\Desk::sellingBranchIds($user);
        if ($sellingIds !== null) {
            $query->whereIn('branch_id', $sellingIds);
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        } else {
            $query->where('created_at', '>=', now()->subDays(30));
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'payment_method' => 'required|in:cash,card,mobile,room',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:64',
            'customer_address' => 'nullable|string|max:255',
            'customer_id_type' => 'nullable|string|max:64',
            'customer_id' => 'nullable|string|max:128',
            'amount_tendered' => 'nullable|numeric|min:0',
            'folio_id' => 'nullable|exists:folios,id',
            'room_id' => 'nullable|exists:rooms,id',
        ]);

        if ($request->payment_method === 'room' && ! $request->folio_id) {
            abort(422, 'folio_id is required for charge-to-room.');
        }

        $sale = DB::transaction(function () use ($request) {
            $user = $request->user();
            if (! $user->shop_id) {
                abort(422, 'User is not assigned to a shop.');
            }

            /** @var Shop $shop */
            $shop = Shop::where('id', $user->shop_id)->lockForUpdate()->firstOrFail();

            $folio = null;
            if ($request->payment_method === 'room') {
                $folio = Folio::where('shop_id', $shop->id)
                    ->where('status', 'open')
                    ->lockForUpdate()
                    ->findOrFail($request->folio_id);
            }

            $subtotal = 0;
            $saleItems = [];

            foreach ($request->items as $item) {
                /** @var Product $product */
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);

                if ($product->shop_id !== $shop->id) {
                    abort(422, "Product [{$product->name}] does not belong to this shop.");
                }

                $allowed = Desk::sellingBranchIds($user);
                if ($allowed !== null && ! in_array($product->branch_id, $allowed, true)) {
                    abort(422, "{$product->name} is not on this desk.");
                }

                $outlet = OutletStock::where('product_id', $product->id)
                    ->where('branch_id', $product->branch_id)
                    ->lockForUpdate()
                    ->first();
                $available = (int) ($outlet->qty ?? 0);
                if ($available < $item['quantity']) {
                    abort(422, "Insufficient outlet stock for [{$product->name}]. Available: {$available}");
                }

                $lineTotal = $product->price * $item['quantity'];
                $subtotal += $lineTotal;

                $outlet->decrement('qty', $item['quantity']);

                $saleItems[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit_price' => $product->price,
                    'quantity' => $item['quantity'],
                    '_branch_id' => $product->branch_id,
                ];
            }

            $total = round($subtotal, 2);

            $rate = (float) ($shop->tax_rate ?? 18);
            $divisor = 1 + ($rate / 100);
            $totalExclTax = round($total / $divisor, 2);
            $totalTax = round($total - $totalExclTax, 2);

            $rawTendered = $request->input('amount_tendered');
            $amountTendered = ($rawTendered === null || $rawTendered === '')
                ? $total
                : round((float) $rawTendered, 2);

            if ($request->payment_method === 'cash' && $amountTendered < $total) {
                abort(422, 'Amount tendered must be at least the sale total.');
            }

            if (in_array($request->payment_method, ['card', 'mobile', 'room'], true)) {
                $amountTendered = $total;
            }

            $cashChange = $request->payment_method === 'cash'
                ? round(max(0, $amountTendered - $total), 2)
                : 0;

            $shop->receipt_counter = ((int) $shop->receipt_counter) + 1;
            $shop->save();

            $prefix = $shop->serial_prefix ?: 'DEM';
            $serialNumber = sprintf('%s-%s-%04d', $prefix, now()->format('Ym'), $shop->receipt_counter);
            $znr = $serialNumber.'/Z';
            $uinSuffix = preg_replace('/\D/', '', sprintf('%.6f', microtime(true)));
            $uin = $serialNumber.$uinSuffix;
            $verification = strtoupper(substr(sha1($serialNumber.'|'.uniqid('', true)), 0, 12));

            $sale = Sale::create([
                'shop_id' => $shop->id,
                'branch_id' => $user->branch_id,
                'folio_id' => $folio?->id,
                'room_id' => $request->room_id,
                'cashier_id' => $user->id,
                'subtotal' => round($subtotal, 2),
                'tax' => $totalTax,
                'total' => $total,
                'payment_method' => $request->payment_method,
                'serial_number' => $serialNumber,
                'znr' => $znr,
                'uin' => $uin,
                'verification_code' => $verification,
                'customer_name' => $request->customer_name,
                'customer_phone' => $request->customer_phone,
                'customer_address' => $request->customer_address,
                'customer_id_type' => $request->customer_id_type,
                'customer_id' => $request->customer_id,
                'total_excl_tax' => $totalExclTax,
                'total_tax' => $totalTax,
                'amount_tendered' => $amountTendered,
                'cash_change' => $cashChange,
                'tax_rate_used' => $rate,
            ]);

            foreach ($saleItems as $si) {
                $sale->items()->create([
                    'product_id' => $si['product_id'],
                    'product_name' => $si['product_name'],
                    'unit_price' => $si['unit_price'],
                    'quantity' => $si['quantity'],
                ]);

                StockMovement::create([
                    'shop_id' => $shop->id,
                    'product_id' => $si['product_id'],
                    'branch_id' => $user->branch_id ?? $si['_branch_id'],
                    'type' => 'sale',
                    'qty' => -((int) $si['quantity']),
                    'reference_type' => Sale::class,
                    'reference_id' => $sale->id,
                    'user_id' => $user->id,
                    'note' => "Sale {$serialNumber}",
                ]);
            }

            if ($folio) {
                $descItems = collect($saleItems)->map(fn ($i) => "{$i['product_name']}×{$i['quantity']}")->implode(', ');
                FolioCharge::create([
                    'folio_id' => $folio->id,
                    'description' => "POS: {$descItems}",
                    'amount' => $total,
                    'source' => 'pos',
                    'reference_type' => Sale::class,
                    'reference_id' => $sale->id,
                ]);
            }

            ActivityLog::record(
                'sale_created',
                "Sale #{$sale->id} · {$serialNumber} · total {$sale->total} via {$request->payment_method} by {$user->name}",
                $user->id,
                $request->ip()
            );

            return $sale;
        });

        return response()->json(
            $sale->load(['items', 'cashier:id,name', 'shop', 'branch']),
            201
        );
    }

    public function show(string $id)
    {
        return response()->json(
            Sale::with(['items', 'cashier:id,name', 'shop', 'branch'])->findOrFail($id)
        );
    }

    public function update(Request $request, string $id)
    {
        abort(405);
    }

    public function destroy(string $id)
    {
        abort(405);
    }
}
