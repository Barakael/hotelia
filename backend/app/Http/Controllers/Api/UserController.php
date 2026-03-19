<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        $users = User::select('id', 'name', 'email', 'role', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'role'     => ['required', Rule::in(['super_admin', 'owner', 'cashier'])],
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'role'     => $data['role'],
            'password' => Hash::make($data['password']),
        ]);

        ActivityLog::record(
            'user_created',
            "User {$user->name} ({$user->role}) created",
            $request->user()->id,
            $request->ip()
        );

        return response()->json(
            $user->only('id', 'name', 'email', 'role', 'created_at'),
            201
        );
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'email'    => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role'     => ['sometimes', Rule::in(['super_admin', 'owner', 'cashier'])],
            'password' => 'sometimes|string|min:8',
        ]);

        // Prevent a super_admin from demoting themselves
        if (isset($data['role']) && $user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot change your own role.'], 403);
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);

        return response()->json($user->only('id', 'name', 'email', 'role', 'created_at'));
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
        }

        ActivityLog::record(
            'user_deleted',
            "User {$user->name} ({$user->role}) deleted",
            $request->user()->id,
            $request->ip()
        );

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }
}
