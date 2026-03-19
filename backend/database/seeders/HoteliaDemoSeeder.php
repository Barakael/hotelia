<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Guest;
use App\Models\OutletStock;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomType;
use App\Models\ServiceType;
use App\Models\Shop;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class HoteliaDemoSeeder extends Seeder
{
    public function run(): void
    {
        $shop = Shop::where('email', 'demo.company@tera-pos.local')->first()
            ?? Shop::first();

        if (! $shop) {
            return;
        }

        // Rename demo shop for Hotelia
        $shop->update(['name' => 'Hotelia Demo Hotel']);

        $outlets = [
            ['name' => 'Restaurant', 'outlet_type' => 'restaurant'],
            ['name' => 'Bar', 'outlet_type' => 'bar'],
            ['name' => 'BBQ', 'outlet_type' => 'bbq'],
            ['name' => 'Reception', 'outlet_type' => 'reception'],
            ['name' => 'Store', 'outlet_type' => 'store'],
        ];

        $branches = [];
        foreach ($outlets as $o) {
            $branches[$o['outlet_type']] = Branch::updateOrCreate(
                ['shop_id' => $shop->id, 'name' => $o['name']],
                ['outlet_type' => $o['outlet_type'], 'address' => $shop->address, 'phone' => $shop->phone]
            );
        }

        // Receptionist
        User::updateOrCreate(
            ['email' => 'reception@pos.com'],
            [
                'name' => 'Reception Desk',
                'role' => 'receptionist',
                'password' => Hash::make('password'),
                'shop_id' => $shop->id,
                'branch_id' => $branches['reception']->id,
            ]
        );

        // Assign desks
        User::where('email', 'store@pos.com')->update([
            'shop_id' => $shop->id,
            'branch_id' => $branches['store']->id,
        ]);
        User::where('email', 'bar@pos.com')->update([
            'shop_id' => $shop->id,
            'branch_id' => $branches['bar']->id,
        ]);
        User::where('email', 'fnb@pos.com')->update([
            'shop_id' => $shop->id,
            'branch_id' => $branches['restaurant']->id,
        ]);

        $owner = User::where('email', 'owner@pos.com')->first();
        if ($owner) {
            $owner->update(['shop_id' => $shop->id]);
        }

        // Room types + 20 rooms
        $standard = RoomType::updateOrCreate(
            ['shop_id' => $shop->id, 'name' => 'Standard'],
            ['base_rate' => 80000, 'capacity' => 2]
        );
        $deluxe = RoomType::updateOrCreate(
            ['shop_id' => $shop->id, 'name' => 'Deluxe'],
            ['base_rate' => 120000, 'capacity' => 3]
        );
        $suite = RoomType::updateOrCreate(
            ['shop_id' => $shop->id, 'name' => 'Suite'],
            ['base_rate' => 200000, 'capacity' => 4]
        );

        for ($i = 1; $i <= 20; $i++) {
            $type = $i <= 12 ? $standard : ($i <= 17 ? $deluxe : $suite);
            $num = sprintf('%02d', $i);
            Room::updateOrCreate(
                ['shop_id' => $shop->id, 'number' => $num],
                ['room_type_id' => $type->id, 'status' => 'available']
            );
        }

        // Sellable catalog: store qty on products.stock; desk qty on outlet_stocks
        $catalog = [
            'restaurant' => [
                ['name' => 'Chicken Pilau', 'barcode' => 'HOT-RST-001', 'price' => 12000, 'store' => 40, 'outlet' => 20, 'category' => 'Meals'],
                ['name' => 'Fish & Chips', 'barcode' => 'HOT-RST-002', 'price' => 15000, 'store' => 25, 'outlet' => 12, 'category' => 'Meals'],
                ['name' => 'Fresh Juice', 'barcode' => 'HOT-RST-003', 'price' => 4000, 'store' => 50, 'outlet' => 25, 'category' => 'Drinks'],
            ],
            'bar' => [
                ['name' => 'Safari Lager', 'barcode' => 'HOT-BAR-001', 'price' => 3500, 'store' => 100, 'outlet' => 40, 'category' => 'Beer'],
                ['name' => 'Soda 500ml', 'barcode' => 'HOT-BAR-002', 'price' => 1500, 'store' => 80, 'outlet' => 40, 'category' => 'Soft drinks'],
                ['name' => 'House Wine Glass', 'barcode' => 'HOT-BAR-003', 'price' => 8000, 'store' => 30, 'outlet' => 15, 'category' => 'Wine'],
            ],
            'bbq' => [
                ['name' => 'Nyama Choma Plate', 'barcode' => 'HOT-BBQ-001', 'price' => 18000, 'store' => 20, 'outlet' => 10, 'category' => 'Grill'],
                ['name' => 'Mishkaki Skewer', 'barcode' => 'HOT-BBQ-002', 'price' => 5000, 'store' => 40, 'outlet' => 20, 'category' => 'Grill'],
            ],
        ];

        foreach ($catalog as $outlet => $products) {
            $branch = $branches[$outlet];
            foreach ($products as $p) {
                $product = Product::updateOrCreate(
                    ['shop_id' => $shop->id, 'barcode' => $p['barcode']],
                    [
                        'name' => $p['name'],
                        'price' => $p['price'],
                        'stock' => $p['store'],
                        'category' => $p['category'],
                        'branch_id' => $branch->id,
                        'low_stock_threshold' => 10,
                        'is_sellable_transfer' => true,
                    ]
                );

                OutletStock::updateOrCreate(
                    ['branch_id' => $branch->id, 'product_id' => $product->id],
                    ['shop_id' => $shop->id, 'qty' => $p['outlet']]
                );

                if (! StockMovement::where('product_id', $product->id)->where('type', 'opening')->exists()) {
                    StockMovement::create([
                        'shop_id' => $shop->id,
                        'product_id' => $product->id,
                        'branch_id' => $branches['store']->id,
                        'type' => 'opening',
                        'qty' => $p['store'],
                        'user_id' => $owner?->id,
                        'note' => 'Demo store opening stock',
                    ]);
                }
            }
        }

        // Store-only tools / supplies — never transferable to outlet sell stock
        $storeTools = [
            ['name' => 'Mop & Bucket Set', 'barcode' => 'HOT-TOOL-001', 'price' => 0, 'stock' => 8, 'category' => 'Housekeeping'],
            ['name' => 'Bar Soap (bulk)', 'barcode' => 'HOT-TOOL-002', 'price' => 0, 'stock' => 100, 'category' => 'Supplies'],
            ['name' => 'Screwdriver Set', 'barcode' => 'HOT-TOOL-003', 'price' => 0, 'stock' => 4, 'category' => 'Maintenance'],
        ];
        foreach ($storeTools as $t) {
            Product::updateOrCreate(
                ['shop_id' => $shop->id, 'barcode' => $t['barcode']],
                [
                    'name' => $t['name'],
                    'price' => $t['price'],
                    'stock' => $t['stock'],
                    'category' => $t['category'],
                    'branch_id' => $branches['store']->id,
                    'low_stock_threshold' => 2,
                    'is_sellable_transfer' => false,
                ]
            );
        }

        // Also attach legacy ProductSeeder items to store if present without shop
        Product::whereNull('shop_id')->update([
            'shop_id' => $shop->id,
            'branch_id' => $branches['store']->id,
            'is_sellable_transfer' => false,
        ]);

        Supplier::updateOrCreate(
            ['shop_id' => $shop->id, 'name' => 'Dar Fresh Supplies'],
            ['phone' => '+255700000001', 'address' => 'Kariakoo, Dar es Salaam']
        );

        ServiceType::updateOrCreate(
            ['shop_id' => $shop->id, 'name' => 'Conference Hall A'],
            ['type' => 'conference', 'default_price' => 250000, 'is_active' => true]
        );
        ServiceType::updateOrCreate(
            ['shop_id' => $shop->id, 'name' => 'Airport Shuttle'],
            ['type' => 'shuttle', 'default_price' => 50000, 'is_active' => true]
        );

        // Demo booked reservation (room 01)
        $room = Room::where('shop_id', $shop->id)->where('number', '01')->first();
        if ($room && ! Reservation::where('shop_id', $shop->id)->where('room_id', $room->id)->whereIn('status', ['booked', 'checked_in'])->exists()) {
            $guest = Guest::create([
                'shop_id' => $shop->id,
                'name' => 'Demo Guest',
                'phone' => '+255711000000',
                'id_type' => 'NIDA',
                'id_number' => '19900101123456789012',
            ]);
            Reservation::create([
                'shop_id' => $shop->id,
                'guest_id' => $guest->id,
                'room_id' => $room->id,
                'check_in_date' => now()->toDateString(),
                'check_out_date' => now()->addDays(2)->toDateString(),
                'status' => 'booked',
                'deposit' => 20000,
                'notes' => 'Demo booking',
            ]);
            $room->update(['status' => 'reserved']);
        }
    }
}
