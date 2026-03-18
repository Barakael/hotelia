<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceBooking extends Model
{
    protected $fillable = [
        'shop_id', 'service_type_id', 'party_name', 'phone', 'starts_at', 'ends_at',
        'amount', 'status', 'payment_method', 'folio_id', 'sale_id', 'notes',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'amount' => 'float',
    ];

    public function serviceType()
    {
        return $this->belongsTo(ServiceType::class);
    }

    public function folio()
    {
        return $this->belongsTo(Folio::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
}
