<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPayment extends Model
{
    protected $fillable = [
        'subscription_id', 'shop_id', 'amount', 'status',
        'payment_method', 'reference', 'due_date', 'paid_at', 'notes',
    ];

    protected $casts = [
        'due_date' => 'date',
        'paid_at'  => 'datetime',
        'amount'   => 'float',
    ];

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }
}
