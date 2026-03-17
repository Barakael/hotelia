<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = [
        'shop_id',
        'branch_id',
        'folio_id',
        'room_id',
        'cashier_id',
        'subtotal',
        'tax',
        'total',
        'payment_method',
        'serial_number',
        'znr',
        'uin',
        'verification_code',
        'customer_name',
        'customer_phone',
        'customer_address',
        'customer_id_type',
        'customer_id',
        'total_excl_tax',
        'total_tax',
        'amount_tendered',
        'cash_change',
        'tax_rate_used',
    ];

    /** @var list<string> */
    protected $hidden = [
        'cash_change',
    ];

    protected $casts = [
        'subtotal'        => 'float',
        'tax'             => 'float',
        'total'           => 'float',
        'total_excl_tax'  => 'float',
        'total_tax'       => 'float',
        'amount_tendered' => 'float',
        'cash_change'     => 'float',
        'tax_rate_used'   => 'float',
    ];

    protected $appends = [
        'change',
    ];

    /** Alias for API consumers expecting key `change`. */
    public function getChangeAttribute(): ?float
    {
        $value = $this->attributes['cash_change'] ?? null;

        return $value !== null ? (float) $value : null;
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function folio()
    {
        return $this->belongsTo(Folio::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}
