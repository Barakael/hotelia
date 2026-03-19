<?php

namespace Database\Seeders;

use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds TRA demo shop (matches sample legal receipt).
 * Run after UserSeeder so owner user exists for owner_id.
 */
class DemoShopSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::where('email', 'owner@pos.com')->first();

        $shop = Shop::updateOrCreate(
            ['email' => 'demo.company@tera-pos.local'],
            [
                'name'             => 'DEMO COMPANY LTD',
                'address'          => '123 Business Street, Dar es Salaam',
                'phone'            => '+255123456789',
                'mobile'           => '+255123456789',
                'location'         => 'DODOMA',
                'tin'              => 'TAX123456789',
                'vrn'              => 'VRN987654321',
                'tax_office'       => 'DODOMA',
                'tax_rate'         => 18,
                'currency'         => 'TZS',
                'serial_prefix'    => 'DEM',
                'receipt_counter'  => 0,
                'owner_id'         => $owner?->id,
            ]
        );

        if ($owner && $owner->shop_id === null) {
            $owner->update(['shop_id' => $shop->id]);
        }

        // Assign demo shop to staff who should "adopt" the owner's shop_id.
        // Exclude super_admin so admin@pos.com doesn't get a shop by default.
        User::whereNull('shop_id')
            ->where('role', '!=', 'super_admin')
            ->update(['shop_id' => $shop->id]);
    }
}
