<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'description',
        'ip_address',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Convenience helper so any controller can log in one line.
     */
    public static function record(
        string $action,
        string $description,
        ?int $userId = null,
        ?string $ipAddress = null
    ): void {
        static::create([
            'action'      => $action,
            'description' => $description,
            'user_id'     => $userId,
            'ip_address'  => $ipAddress,
        ]);
    }
}
