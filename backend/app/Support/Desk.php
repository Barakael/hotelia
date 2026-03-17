<?php

namespace App\Support;

use App\Models\Branch;
use App\Models\User;

class Desk
{
    /** Branch ids this selling desk may sell from. Null means no outlet filter (owner). */
    public static function sellingBranchIds(User $user): ?array
    {
        if ($user->role === 'bar') {
            return Branch::where('shop_id', $user->shop_id)
                ->where('outlet_type', 'bar')
                ->pluck('id')
                ->all();
        }

        if ($user->role === 'fnb') {
            return Branch::where('shop_id', $user->shop_id)
                ->whereIn('outlet_type', ['restaurant', 'bbq'])
                ->pluck('id')
                ->all();
        }

        return null;
    }

    public static function canReceiveIssue(User $user, Branch $branch): bool
    {
        if ((int) $user->id && $user->role === 'owner') {
            return true;
        }

        $ids = self::sellingBranchIds($user);

        return $ids !== null && in_array($branch->id, $ids, true);
    }
}
