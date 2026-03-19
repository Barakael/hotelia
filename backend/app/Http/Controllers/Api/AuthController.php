<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 401);
        }

        /** @var User $user */
        $user  = Auth::user();
        $user->load('shop');
        $token = $user->createToken('pos-token')->plainTextToken;

        ActivityLog::record('login', "User {$user->name} logged in", $user->id, $request->ip());

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
                'role'      => $user->role,
                'shop_id'   => $user->shop_id,
                'branch_id' => $user->branch_id,
                'shop'      => $user->shop,
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('shop');

        return response()->json([
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role,
            'shop_id'   => $user->shop_id,
            'branch_id' => $user->branch_id,
            'shop'      => $user->shop,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
