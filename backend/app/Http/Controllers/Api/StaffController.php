<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    /**
     * GET /api/staff — all cashiers in the owner's shop.
     */
    public function index(Request $request)
    {
        $shopId = $request->user()->shop_id;

        $staff = User::where('shop_id', $shopId)
            ->whereIn('role', ['storekeeper', 'receptionist', 'bar', 'fnb'])
            ->with('branch:id,name,outlet_type')
            ->select('id', 'name', 'email', 'role', 'branch_id', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($staff);
    }

    /**
     * POST /api/staff — create a cashier in the owner's shop.
     */
    public function store(Request $request)
    {
        $shopId = $request->user()->shop_id;

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:storekeeper,receptionist,bar,fnb',
            'branch_id' => ['nullable', 'integer', Rule::exists('branches', 'id')->where('shop_id', $shopId)],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'shop_id' => $shopId,
            'branch_id' => $data['branch_id'] ?? null,
        ]);

        return response()->json(
            $user->load('branch:id,name')->only('id', 'name', 'email', 'role', 'branch_id', 'created_at') + ['branch' => $user->branch],
            201
        );
    }

    /**
     * PUT /api/staff/{user} — update cashier details.
     */
    public function update(Request $request, User $user)
    {
        $shopId = $request->user()->shop_id;

        if ($user->shop_id !== $shopId || ! in_array($user->role, ['storekeeper', 'receptionist', 'bar', 'fnb'], true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'name'      => 'sometimes|string|max:255',
            'email'     => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password'  => 'sometimes|string|min:8',
            'role' => 'sometimes|in:storekeeper,receptionist,bar,fnb',
            'branch_id' => ['sometimes', 'integer', Rule::exists('branches', 'id')->where('shop_id', $shopId)],
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        $user->load('branch:id,name');

        return response()->json(
            $user->only('id', 'name', 'email', 'branch_id', 'created_at') + ['branch' => $user->branch]
        );
    }

    /**
     * DELETE /api/staff/{user} — remove cashier.
     */
    public function destroy(Request $request, User $user)
    {
        $shopId = $request->user()->shop_id;

        if ($user->shop_id !== $shopId || ! in_array($user->role, ['storekeeper', 'receptionist', 'bar', 'fnb'], true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'Staff member deleted.']);
    }
}
