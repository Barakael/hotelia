<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Folio;
use Illuminate\Http\Request;

class FolioController extends Controller
{
    public function show(Request $request, string $id)
    {
        $folio = Folio::with([
            'charges',
            'payments',
            'reservation.guest',
            'reservation.room.roomType',
        ])
            ->where('shop_id', $request->user()->shop_id)
            ->findOrFail($id);

        return response()->json([
            ...$folio->toArray(),
            'charges_total' => $folio->charges_total,
            'payments_total' => $folio->payments_total,
            'balance' => $folio->balance,
        ]);
    }
}
