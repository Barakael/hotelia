<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OutletStock extends Model
{
    protected $fillable = ['shop_id', 'branch_id', 'product_id', 'qty'];

    protected $casts = ['qty' => 'integer'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
