<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Guest extends Model
{
    protected $fillable = [
        'shop_id', 'name', 'phone', 'email', 'nationality', 'address', 'id_type', 'id_number',
    ];

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }
}
