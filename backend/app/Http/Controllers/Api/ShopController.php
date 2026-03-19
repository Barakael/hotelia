<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class ShopController extends Controller
{
    /**
     * GET /api/shops — list all shops with summary stats.
     */
    public function index()
    {
        $shops = Shop::with('owner:id,name,email')
            ->withCount('branches')
            ->get()
            ->map(function (Shop $shop) {
                $staffCount = User::where('shop_id', $shop->id)
                    ->where('role', 'cashier')
                    ->count();

                return [
                    'id'             => $shop->id,
                    'name'           => $shop->name,
                    'address'        => $shop->address,
                    'phone'          => $shop->phone,
                    'email'          => $shop->email,
                    'tax_rate'       => $shop->tax_rate,
                    'currency'       => $shop->currency,
                    'branches_count' => $shop->branches_count,
                    'staff_count'    => $staffCount,
                    'owner'          => $shop->owner,
                    'created_at'     => $shop->created_at,
                ];
            });

        return response()->json($shops);
    }

    /**
     * POST /api/shops — register new shop + owner account in one transaction.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            // Shop fields
            'name'         => 'required|string|max:255',
            'address'      => 'nullable|string|max:500',
            'phone'        => 'nullable|string|max:50',
            'email'        => 'nullable|email|max:255',
            'tax_rate'     => 'nullable|numeric|min:0|max:100',
            'currency'     => 'nullable|string|max:10',
            // Owner account fields
            'owner_name'     => 'required|string|max:255',
            'owner_email'    => 'required|email|unique:users,email',
            'owner_password' => 'required|string|min:8',
        ]);

        $result = DB::transaction(function () use ($data) {
            // Create owner user (unlinked shop for now)
            $owner = User::create([
                'name'     => $data['owner_name'],
                'email'    => $data['owner_email'],
                'password' => Hash::make($data['owner_password']),
                'role'     => 'owner',
            ]);

            // Create shop linked to owner
            $shop = Shop::create([
                'name'     => $data['name'],
                'address'  => $data['address'] ?? null,
                'phone'    => $data['phone'] ?? null,
                'email'    => $data['email'] ?? null,
                'tax_rate' => $data['tax_rate'] ?? 18,
                'currency' => $data['currency'] ?? 'TZS',
                'owner_id' => $owner->id,
            ]);

            // Create a default "Main Branch" for this shop
            $branch = Branch::create([
                'shop_id' => $shop->id,
                'name'    => 'Main Branch',
                'address' => $data['address'] ?? null,
                'phone'   => $data['phone'] ?? null,
            ]);

            // Link owner to this shop (no branch — owner spans all)
            $owner->update(['shop_id' => $shop->id]);

            ActivityLog::record(
                'shop_created',
                "Shop '{$shop->name}' registered with owner {$owner->name}",
                request()->user()?->id,
                request()->ip()
            );

            return ['shop' => $shop->load('owner:id,name,email'), 'branch' => $branch];
        });

        return response()->json($result, 201);
    }

    /**
     * GET /api/shops/{shop} — full details including branches and staff.
     */
    public function show(Shop $shop)
    {
        $shop->load('owner:id,name,email', 'branches');
        $staff = User::where('shop_id', $shop->id)
            ->where('role', 'cashier')
            ->select('id', 'name', 'email', 'branch_id', 'created_at')
            ->with('branch:id,name')
            ->get();

        return response()->json([
            'shop'   => $shop,
            'staff'  => $staff,
        ]);
    }

    /**
     * PUT /api/shops/{shop} — update shop details.
     */
    public function update(Request $request, Shop $shop)
    {
        $data = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'address'  => 'sometimes|nullable|string|max:500',
            'phone'    => 'sometimes|nullable|string|max:50',
            'email'    => 'sometimes|nullable|email|max:255',
            'tax_rate' => 'sometimes|numeric|min:0|max:100',
            'currency' => 'sometimes|string|max:10',
        ]);

        $shop->update($data);

        return response()->json($shop->load('owner:id,name,email'));
    }

    /**
     * DELETE /api/shops/{shop} — remove shop and all its data.
     */
    public function destroy(Shop $shop)
    {
        DB::transaction(function () use ($shop) {
            // Unlink users, then delete shop (cascades to branches)
            User::where('shop_id', $shop->id)->update(['shop_id' => null, 'branch_id' => null]);
            $shop->delete();
        });

        ActivityLog::record('shop_deleted', "Shop '{$shop->name}' deleted", request()->user()?->id, request()->ip());

        return response()->json(['message' => 'Shop deleted.']);
    }

    // ─── Owner-facing endpoints (GET/PUT /api/settings) ──────────────────────

    /**
     * GET /api/settings — shop staff (owner/cashier) view their own shop (for receipts, etc.).
     */
    public function showOwnerShop(Request $request)
    {
        $shopId = $request->user()->shop_id;
        if (!$shopId) {
            return response()->json(['message' => 'No shop assigned to this user.'], 404);
        }

        $shop = Shop::with('branches')->findOrFail($shopId);
        return response()->json($shop);
    }

    /**
     * PUT /api/settings — owner updates their own shop details.
     */
    public function updateOwnerShop(Request $request)
    {
        $shop = Shop::findOrFail($request->user()->shop_id);

        $data = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'address'  => 'sometimes|nullable|string|max:500',
            'phone'    => 'sometimes|nullable|string|max:50',
            'email'    => 'sometimes|nullable|email|max:255',
            'tax_rate' => 'sometimes|numeric|min:0|max:100',
            'currency' => 'sometimes|string|max:10',
        ]);

        $shop->update($data);

        return response()->json($shop);
    }
}
