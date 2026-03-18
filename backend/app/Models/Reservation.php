<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    protected $fillable = [
        'shop_id', 'guest_id', 'room_id', 'check_in_date', 'check_out_date',
        'status', 'deposit', 'adults', 'children', 'vehicle_plate', 'purpose', 'notes',
    ];

    protected $casts = [
        'check_in_date' => 'date',
        'check_out_date' => 'date',
        'deposit' => 'float',
    ];

    public function guest()
    {
        return $this->belongsTo(Guest::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function folio()
    {
        return $this->hasOne(Folio::class);
    }
}
