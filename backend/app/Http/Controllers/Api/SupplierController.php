<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Supplier::where('shop_id', $request->user()->shop_id)
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:64',
            'address' => 'nullable|string|max:255',
        ]);

        $data['shop_id'] = $request->user()->shop_id;
        $supplier = Supplier::create($data);

        return response()->json($supplier, 201);
    }

    public function update(Request $request, string $id)
    {
        $supplier = Supplier::where('shop_id', $request->user()->shop_id)->findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:64',
            'address' => 'nullable|string|max:255',
        ]);

        $supplier->update($data);

        return response()->json($supplier);
    }

    public function destroy(Request $request, string $id)
    {
        $supplier = Supplier::where('shop_id', $request->user()->shop_id)->findOrFail($id);
        $supplier->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
