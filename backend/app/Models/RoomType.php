<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomType extends Model
{
    protected $fillable = ['shop_id', 'name', 'base_rate', 'capacity'];

    protected $casts = [
        'base_rate' => 'float',
        'capacity' => 'integer',
    ];

    public function rooms()
    {
        return $this->hasMany(Room::class);
    }
}
