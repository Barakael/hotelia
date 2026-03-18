<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    protected $fillable = ['shop_id', 'plan_id', 'status', 'starts_at', 'next_due_at', 'cancelled_at'];

    protected $casts = [
        'starts_at'    => 'date',
        'next_due_at'  => 'date',
        'cancelled_at' => 'date',
    ];

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function payments()
    {
        return $this->hasMany(SubscriptionPayment::class);
    }
}
