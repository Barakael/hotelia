<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = [
        'shop_id', 'name', 'address', 'phone', 'outlet_type',
    ];

    /** The shop this branch belongs to */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    /** Cashiers assigned to this branch */
    public function staff()
    {
        return $this->hasMany(User::class);
    }
}
