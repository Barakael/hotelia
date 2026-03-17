<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name',
        'barcode',
        'price',
        'stock',
        'category',
        'image',
        'low_stock_threshold',
        'shop_id',
        'branch_id',
        'is_sellable_transfer',
    ];

    protected $casts = [
        'price' => 'float',
        'stock' => 'integer',
        'low_stock_threshold' => 'integer',
        'is_sellable_transfer' => 'boolean',
    ];

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }
}
