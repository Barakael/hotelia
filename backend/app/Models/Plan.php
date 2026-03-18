<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = ['name', 'slug', 'price', 'max_branches', 'max_staff', 'is_active'];

    protected $casts = [
        'price'        => 'float',
        'is_active'    => 'boolean',
        'max_branches' => 'integer',
        'max_staff'    => 'integer',
    ];

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }
}
