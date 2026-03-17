<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockIssue extends Model
{
    protected $fillable = [
        'shop_id', 'to_branch_id', 'issued_by', 'issued_to', 'status', 'note', 'acknowledged_at',
    ];

    protected $casts = ['acknowledged_at' => 'datetime'];

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'to_branch_id');
    }

    public function issuer()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'issued_to');
    }

    public function items()
    {
        return $this->hasMany(StockIssueItem::class);
    }
}
