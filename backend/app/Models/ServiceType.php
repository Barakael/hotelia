<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceType extends Model
{
    protected $fillable = ['shop_id', 'type', 'name', 'default_price', 'is_active'];

    protected $casts = [
        'default_price' => 'float',
        'is_active' => 'boolean',
    ];

    public function bookings()
    {
        return $this->hasMany(ServiceBooking::class);
    }
}
