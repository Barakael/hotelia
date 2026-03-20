<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomType;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function types(Request $request)
    {
        return response()->json(
            RoomType::where('shop_id', $request->user()->shop_id)->orderBy('name')->get()
        );
    }

    public function storeType(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'base_rate' => 'required|numeric|min:0',
            'capacity' => 'nullable|integer|min:1',
        ]);
        $data['shop_id'] = $request->user()->shop_id;
        $data['capacity'] = $data['capacity'] ?? 2;

        return response()->json(RoomType::create($data), 201);
    }

    public function index(Request $request)
    {
        return response()->json(
            Room::with('roomType')
                ->where('shop_id', $request->user()->shop_id)
                ->orderBy('number')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'room_type_id' => 'required|exists:room_types,id',
            'number' => 'required|string|max:32',
            'status' => 'nullable|in:available,reserved,occupied,cleaning,out_of_service',
        ]);

        $data['shop_id'] = $request->user()->shop_id;
        $data['status'] = $data['status'] ?? 'available';

        return response()->json(Room::create($data)->load('roomType'), 201);
    }

    public function updateStatus(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => 'required|in:available,reserved,occupied,cleaning,out_of_service',
        ]);

        $room = Room::where('shop_id', $request->user()->shop_id)->findOrFail($id);
        $room->update(['status' => $data['status']]);

        return response()->json($room->load('roomType'));
    }

    /** Occupied rooms with open folios — for POS charge-to-room */
    public function occupiedWithFolios(Request $request)
    {
        $shopId = $request->user()->shop_id;

        $rooms = Room::with([
            'roomType',
            'reservations' => function ($q) {
                $q->where('status', 'checked_in')->with(['guest', 'folio' => function ($fq) {
                    $fq->where('status', 'open');
                }]);
            },
        ])
            ->where('shop_id', $shopId)
            ->where('status', 'occupied')
            ->orderBy('number')
            ->get()
            ->map(function (Room $room) {
                $res = $room->reservations->first();
                $folio = $res?->folio;

                return [
                    'id' => $room->id,
                    'number' => $room->number,
                    'room_type' => $room->roomType?->name,
                    'guest_name' => $res?->guest?->name,
                    'folio_id' => $folio?->id,
                    'reservation_id' => $res?->id,
                ];
            })
            ->filter(fn ($r) => $r['folio_id'] !== null)
            ->values();

        return response()->json($rooms);
    }
}
