<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Folio;
use App\Models\FolioCharge;
use App\Models\Sale;
use App\Models\ServiceBooking;
use App\Models\ServiceType;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceController extends Controller
{
    public function types(Request $request)
    {
        return response()->json(
            ServiceType::where('shop_id', $request->user()->shop_id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
        );
    }

    public function storeType(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:conference,shuttle',
            'name' => 'required|string|max:255',
            'default_price' => 'required|numeric|min:0',
        ]);
        $data['shop_id'] = $request->user()->shop_id;

        return response()->json(ServiceType::create($data), 201);
    }

    public function index(Request $request)
    {
        return response()->json(
            ServiceBooking::with(['serviceType', 'folio'])
                ->where('shop_id', $request->user()->shop_id)
                ->orderByDesc('starts_at')
                ->limit(100)
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'service_type_id' => 'required|exists:service_types,id',
            'party_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:64',
            'starts_at' => 'required|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'payment_method' => 'nullable|in:cash,card,mobile,room',
            'folio_id' => 'nullable|exists:folios,id',
        ]);

        $user = $request->user();
        $shopId = $user->shop_id;

        $booking = DB::transaction(function () use ($data, $user, $shopId) {
            $type = ServiceType::where('shop_id', $shopId)->findOrFail($data['service_type_id']);
            $amount = isset($data['amount']) ? (float) $data['amount'] : (float) $type->default_price;
            $method = $data['payment_method'] ?? null;

            $booking = ServiceBooking::create([
                'shop_id' => $shopId,
                'service_type_id' => $type->id,
                'party_name' => $data['party_name'],
                'phone' => $data['phone'] ?? null,
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'] ?? null,
                'amount' => $amount,
                'status' => 'booked',
                'payment_method' => $method,
                'notes' => $data['notes'] ?? null,
            ]);

            if ($method === 'room') {
                $folioId = $data['folio_id'] ?? null;
                if (! $folioId) {
                    abort(422, 'folio_id required for charge-to-room.');
                }
                $folio = Folio::where('shop_id', $shopId)->where('status', 'open')->findOrFail($folioId);
                FolioCharge::create([
                    'folio_id' => $folio->id,
                    'description' => "{$type->name} — {$data['party_name']}",
                    'amount' => $amount,
                    'source' => 'service',
                    'reference_type' => ServiceBooking::class,
                    'reference_id' => $booking->id,
                ]);
                $booking->update([
                    'folio_id' => $folio->id,
                    'status' => 'settled',
                ]);
            } elseif (in_array($method, ['cash', 'card', 'mobile'], true)) {
                $shop = Shop::findOrFail($shopId);
                $shop->receipt_counter = ((int) $shop->receipt_counter) + 1;
                $shop->save();
                $prefix = $shop->serial_prefix ?: 'DEM';
                $serial = sprintf('%s-%s-%04d', $prefix, now()->format('Ym'), $shop->receipt_counter);

                // Sale header only (service revenue) — no stock SKU required
                $sale = Sale::create([
                    'shop_id' => $shopId,
                    'branch_id' => $user->branch_id,
                    'cashier_id' => $user->id,
                    'subtotal' => $amount,
                    'tax' => 0,
                    'total' => $amount,
                    'payment_method' => $method,
                    'serial_number' => $serial,
                    'total_excl_tax' => $amount,
                    'total_tax' => 0,
                    'amount_tendered' => $amount,
                    'cash_change' => 0,
                    'tax_rate_used' => 0,
                    'customer_name' => $data['party_name'].' · '.$type->name,
                    'customer_phone' => $data['phone'] ?? null,
                ]);

                $booking->update([
                    'sale_id' => $sale->id,
                    'status' => 'settled',
                ]);
            }

            return $booking->fresh(['serviceType', 'folio', 'sale']);
        });

        return response()->json($booking, 201);
    }
}
