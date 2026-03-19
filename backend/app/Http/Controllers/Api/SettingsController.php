<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');

        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'store_name'    => 'sometimes|string|max:255',
            'store_address' => 'sometimes|string|max:500',
            'store_phone'   => 'sometimes|string|max:50',
            'store_email'   => 'sometimes|nullable|email|max:255',
            'tax_rate'      => 'sometimes|numeric|min:0|max:100',
            'currency'      => 'sometimes|string|max:10',
        ]);

        foreach ($data as $key => $value) {
            Setting::set($key, (string) $value);
        }

        return response()->json(Setting::all()->pluck('value', 'key'));
    }
}
