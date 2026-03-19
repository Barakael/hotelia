<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    /**
     * GET /api/branches — owner's shop branches.
     */
    public function index(Request $request)
    {
        $shopId = $request->user()->shop_id;

        $branches = Branch::where('shop_id', $shopId)
            ->withCount(['staff as cashier_count' => function ($q) {
                $q->where('role', 'cashier');
            }])
            ->get();

        return response()->json($branches);
    }

    /**
     * POST /api/branches — add new branch to owner's shop.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:50',
            'outlet_type' => 'nullable|in:restaurant,bar,bbq,reception,store',
        ]);

        $branch = Branch::create(array_merge($data, [
            'shop_id' => $request->user()->shop_id,
        ]));

        return response()->json($branch, 201);
    }

    /**
     * PUT /api/branches/{branch} — update branch details.
     */
    public function update(Request $request, Branch $branch)
    {
        // Ensure the branch belongs to the owner's shop
        if ($branch->shop_id !== $request->user()->shop_id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'address' => 'sometimes|nullable|string|max:500',
            'phone' => 'sometimes|nullable|string|max:50',
            'outlet_type' => 'nullable|in:restaurant,bar,bbq,reception,store',
        ]);

        $branch->update($data);

        return response()->json($branch);
    }

    /**
     * DELETE /api/branches/{branch} — remove branch.
     */
    public function destroy(Request $request, Branch $branch)
    {
        if ($branch->shop_id !== $request->user()->shop_id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($branch->staff()->where('role', 'cashier')->exists()) {
            return response()->json(['message' => 'Reassign all cashiers before deleting this branch.'], 422);
        }

        $branch->delete();

        return response()->json(['message' => 'Branch deleted.']);
    }
}
