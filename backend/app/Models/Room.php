<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    protected $fillable = ['shop_id', 'room_type_id', 'number', 'status'];

    public function roomType()
    {
        return $this->belongsTo(RoomType::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }
}
