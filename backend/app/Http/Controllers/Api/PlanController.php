<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PlanController extends Controller
{
    /** GET /api/plans — super_admin gets all plans; everyone else gets active only */
    public function index(Request $request)
    {
        $query = Plan::orderBy('price');

        if ($request->user()?->role !== 'super_admin') {
            $query->where('is_active', true);
        }

        return response()->json($query->get());
    }

    /** POST /api/plans — create a new plan (super_admin only) */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'         => 'required|string|max:100',
            'price'        => 'required|numeric|min:0',
            'max_branches' => 'required|integer|min:1',
            'max_staff'    => 'required|integer|min:1',
            'is_active'    => 'sometimes|boolean',
        ]);

        $data['slug'] = Str::slug($data['name']);

        $plan = Plan::create(array_merge(['is_active' => true], $data));

        return response()->json($plan, 201);
    }

    /** PUT /api/plans/{plan} — update a plan (super_admin only) */
    public function update(Request $request, Plan $plan)
    {
        $data = $request->validate([
            'name'         => 'sometimes|string|max:100',
            'price'        => 'sometimes|numeric|min:0',
            'max_branches' => 'sometimes|integer|min:1',
            'max_staff'    => 'sometimes|integer|min:1',
            'is_active'    => 'sometimes|boolean',
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $plan->update($data);

        return response()->json($plan->fresh());
    }

    /** DELETE /api/plans/{plan} — delete or deactivate a plan (super_admin only) */
    public function destroy(Plan $plan)
    {
        // If shops are actively subscribed, deactivate instead of hard-delete
        if ($plan->subscriptions()->whereIn('status', ['active', 'trialing'])->exists()) {
            $plan->update(['is_active' => false]);
            return response()->json(['message' => 'Plan deactivated — it has active subscriptions.']);
        }

        $plan->delete();

        return response()->json(['message' => 'Plan deleted.']);
    }
}
