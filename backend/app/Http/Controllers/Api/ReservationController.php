<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Folio;
use App\Models\FolioCharge;
use App\Models\FolioPayment;
use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Reservation::with(['guest', 'room.roomType', 'folio.charges', 'folio.payments'])
                ->where('shop_id', $request->user()->shop_id)
                ->orderByDesc('check_in_date')
                ->limit(100)
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'guest_name' => 'required|string|max:255',
            'guest_phone' => 'nullable|string|max:64',
            'guest_id_type' => 'nullable|string|max:64',
            'guest_id_number' => 'nullable|string|max:128',
            'guest_email' => 'nullable|email|max:255',
            'guest_nationality' => 'nullable|string|max:80',
            'guest_address' => 'nullable|string|max:255',
            'adults' => 'nullable|integer|min:1',
            'children' => 'nullable|integer|min:0',
            'vehicle_plate' => 'nullable|string|max:32',
            'purpose' => 'nullable|string|max:255',
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'check_out_date' => 'required|date|after:check_in_date',
            'deposit' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        $shopId = $user->shop_id;

        $reservation = DB::transaction(function () use ($data, $shopId) {
            $room = Room::where('shop_id', $shopId)->lockForUpdate()->findOrFail($data['room_id']);

            if (! in_array($room->status, ['available', 'cleaning'], true)) {
                abort(422, "Room {$room->number} is not available (status: {$room->status}).");
            }

            $overlap = Reservation::where('room_id', $room->id)
                ->whereIn('status', ['booked', 'checked_in'])
                ->where('check_in_date', '<', $data['check_out_date'])
                ->where('check_out_date', '>', $data['check_in_date'])
                ->exists();

            if ($overlap) {
                abort(422, 'Room already booked for overlapping dates.');
            }

            $guest = Guest::create([
                'shop_id' => $shopId,
                'name' => $data['guest_name'],
                'phone' => $data['guest_phone'] ?? null,
                'id_type' => $data['guest_id_type'] ?? null,
                'id_number' => $data['guest_id_number'] ?? null,
                'email' => $data['guest_email'] ?? null,
                'nationality' => $data['guest_nationality'] ?? null,
                'address' => $data['guest_address'] ?? null,
            ]);

            $reservation = Reservation::create([
                'shop_id' => $shopId,
                'guest_id' => $guest->id,
                'room_id' => $room->id,
                'check_in_date' => $data['check_in_date'],
                'check_out_date' => $data['check_out_date'],
                'status' => 'booked',
                'deposit' => $data['deposit'] ?? 0,
                'adults' => $data['adults'] ?? 1,
                'children' => $data['children'] ?? 0,
                'vehicle_plate' => $data['vehicle_plate'] ?? null,
                'purpose' => $data['purpose'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $room->update(['status' => 'reserved']);

            return $reservation->load(['guest', 'room.roomType']);
        });

        return response()->json($reservation, 201);
    }

    public function checkIn(Request $request, string $id)
    {
        $user = $request->user();

        $reservation = DB::transaction(function () use ($id, $user) {
            $reservation = Reservation::with(['room.roomType', 'guest'])
                ->where('shop_id', $user->shop_id)
                ->lockForUpdate()
                ->findOrFail($id);

            if ($reservation->status !== 'booked') {
                abort(422, 'Only booked reservations can be checked in.');
            }

            $nights = max(1, Carbon::parse($reservation->check_in_date)
                ->diffInDays(Carbon::parse($reservation->check_out_date)));
            $rate = (float) ($reservation->room->roomType->base_rate ?? 0);
            $roomCharge = round($nights * $rate, 2);

            $folio = Folio::create([
                'shop_id' => $user->shop_id,
                'reservation_id' => $reservation->id,
                'status' => 'open',
                'opened_at' => now(),
            ]);

            FolioCharge::create([
                'folio_id' => $folio->id,
                'description' => "Room {$reservation->room->number} × {$nights} night(s)",
                'amount' => $roomCharge,
                'source' => 'room',
            ]);

            if ($reservation->deposit > 0) {
                FolioPayment::create([
                    'folio_id' => $folio->id,
                    'method' => 'cash',
                    'amount' => $reservation->deposit,
                    'reference' => 'Deposit',
                ]);
            }

            $reservation->update(['status' => 'checked_in']);
            $reservation->room->update(['status' => 'occupied']);

            return $reservation->fresh(['guest', 'room.roomType', 'folio.charges', 'folio.payments']);
        });

        return response()->json($reservation);
    }

    public function checkOut(Request $request, string $id)
    {
        $data = $request->validate([
            'payment_method' => 'nullable|in:cash,card,mobile',
            'payment_amount' => 'nullable|numeric|min:0',
            'payment_reference' => 'nullable|string|max:128',
        ]);

        $user = $request->user();

        $reservation = DB::transaction(function () use ($id, $user, $data) {
            $reservation = Reservation::with(['room', 'folio.charges', 'folio.payments'])
                ->where('shop_id', $user->shop_id)
                ->lockForUpdate()
                ->findOrFail($id);

            if ($reservation->status !== 'checked_in') {
                abort(422, 'Only checked-in reservations can be checked out.');
            }

            $folio = $reservation->folio;
            if (! $folio || $folio->status !== 'open') {
                abort(422, 'No open folio for this reservation.');
            }

            $balance = $folio->balance;
            if ($balance > 0) {
                $method = $data['payment_method'] ?? 'cash';
                $amount = $data['payment_amount'] ?? $balance;
                FolioPayment::create([
                    'folio_id' => $folio->id,
                    'method' => $method,
                    'amount' => round((float) $amount, 2),
                    'reference' => $data['payment_reference'] ?? 'Checkout',
                ]);
            }

            $folio->update(['status' => 'settled', 'settled_at' => now()]);
            $reservation->update(['status' => 'checked_out']);
            $reservation->room->update(['status' => 'cleaning']);

            return $reservation->fresh(['guest', 'room.roomType', 'folio.charges', 'folio.payments']);
        });

        return response()->json($reservation);
    }

    public function cancel(Request $request, string $id)
    {
        $reservation = Reservation::with('room')
            ->where('shop_id', $request->user()->shop_id)
            ->findOrFail($id);

        if (! in_array($reservation->status, ['booked'], true)) {
            abort(422, 'Only booked reservations can be cancelled.');
        }

        $reservation->update(['status' => 'cancelled']);
        if ($reservation->room->status === 'reserved') {
            $reservation->room->update(['status' => 'available']);
        }

        return response()->json($reservation->fresh(['guest', 'room.roomType']));
    }
}
