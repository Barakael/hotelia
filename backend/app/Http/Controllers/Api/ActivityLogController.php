<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /**
     * GET /api/activity-logs
     * Returns paginated activity logs, most recent first.
     * Restricted to super_admin via the `can:manage-users` gate.
     */
    public function index(Request $request)
    {
        $query = ActivityLog::with('user:id,name,email,role')
            ->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        $logs = $query->paginate(50);

        return response()->json($logs);
    }
}
