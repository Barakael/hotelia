<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Folio extends Model
{
    protected $fillable = [
        'shop_id', 'reservation_id', 'status', 'opened_at', 'settled_at',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'settled_at' => 'datetime',
    ];

    public function reservation()
    {
        return $this->belongsTo(Reservation::class);
    }

    public function charges()
    {
        return $this->hasMany(FolioCharge::class);
    }

    public function payments()
    {
        return $this->hasMany(FolioPayment::class);
    }

    public function getChargesTotalAttribute(): float
    {
        return (float) $this->charges()->sum('amount');
    }

    public function getPaymentsTotalAttribute(): float
    {
        return (float) $this->payments()->sum('amount');
    }

    public function getBalanceAttribute(): float
    {
        return round($this->charges_total - $this->payments_total, 2);
    }
}
