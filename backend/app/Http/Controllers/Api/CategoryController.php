<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Models\ShopCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    /**
     * GET /api/categories
     * Returns all categories for the authenticated user's shop.
     * Super admin can pass ?shop_id=X to query a specific shop.
     */
    public function index(Request $request)
    {
        $shopId = $this->resolveShopId($request);
        if (!$shopId) {
            return response()->json([]);
        }

        return response()->json(
            ShopCategory::where('shop_id', $shopId)
                ->orderBy('name')
                ->pluck('name', 'id')
                ->map(fn($name, $id) => ['id' => $id, 'name' => $name])
                ->values()
        );
    }

    /**
     * POST /api/categories
     * Add a new category for the shop (owner / manage-inventory).
     */
    public function store(Request $request)
    {
        $shopId = $this->resolveShopId($request);
        if (!$shopId) {
            return response()->json(['message' => 'Shop not found.'], 422);
        }

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('shop_categories')->where('shop_id', $shopId),
            ],
        ]);

        $category = ShopCategory::create([
            'shop_id' => $shopId,
            'name'    => trim($data['name']),
        ]);

        return response()->json($category, 201);
    }

    /**
     * DELETE /api/categories/{id}
     * Remove a category (owner / manage-inventory).
     */
    public function destroy(Request $request, int $id)
    {
        $shopId = $this->resolveShopId($request);

        ShopCategory::where('id', $id)
            ->where('shop_id', $shopId)
            ->firstOrFail()
            ->delete();

        return response()->json(['message' => 'Category deleted.']);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function resolveShopId(Request $request): ?int
    {
        $user = $request->user();

        if ($user->role === 'super_admin') {
            // super_admin can optionally scope to a specific shop
            if ($request->filled('shop_id')) {
                return (int) $request->shop_id;
            }
            return null;
        }

        // owner → their shop via owner_id
        if ($user->role === 'owner') {
            $shop = Shop::where('owner_id', $user->id)->first();
            return $shop?->id;
        }

        // cashier / other → shop_id on the user record
        return $user->shop_id;
    }
}
