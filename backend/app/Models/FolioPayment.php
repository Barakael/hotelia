<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FolioPayment extends Model
{
    protected $fillable = ['folio_id', 'method', 'amount', 'reference'];

    protected $casts = [
        'amount' => 'float',
    ];

    public function folio()
    {
        return $this->belongsTo(Folio::class);
    }
}
