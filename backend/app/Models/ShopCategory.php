<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopCategory extends Model
{
    protected $table = 'shop_categories';

    protected $fillable = ['shop_id', 'name'];

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }
}
