<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockIssueItem extends Model
{
    protected $fillable = ['stock_issue_id', 'product_id', 'qty'];

    protected $casts = ['qty' => 'integer'];

    public function issue()
    {
        return $this->belongsTo(StockIssue::class, 'stock_issue_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
