<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FolioCharge extends Model
{
    protected $fillable = [
        'folio_id', 'description', 'amount', 'source', 'reference_type', 'reference_id',
    ];

    protected $casts = [
        'amount' => 'float',
    ];

    public function folio()
    {
        return $this->belongsTo(Folio::class);
    }
}
