<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            ['name' => 'Mineral Water 500ml',   'barcode' => '6001069380023', 'price' => 500,   'stock' => 150, 'category' => 'Beverages',  'low_stock_threshold' => 20],
            ['name' => 'Coca-Cola 330ml',       'barcode' => '5449000131805', 'price' => 1000,  'stock' => 120, 'category' => 'Beverages',  'low_stock_threshold' => 20],
            ['name' => 'Pepsi 330ml',           'barcode' => '5449000214911', 'price' => 1000,  'stock' => 80,  'category' => 'Beverages',  'low_stock_threshold' => 20],
            ['name' => 'Orange Juice 1L',       'barcode' => '6009175581871', 'price' => 3500,  'stock' => 45,  'category' => 'Beverages',  'low_stock_threshold' => 10],
            ['name' => 'White Bread Loaf',      'barcode' => '6001069380047', 'price' => 2500,  'stock' => 30,  'category' => 'Bakery',     'low_stock_threshold' => 10],
            ['name' => 'Whole Milk 1L',         'barcode' => '6001234567890', 'price' => 2800,  'stock' => 25,  'category' => 'Dairy',      'low_stock_threshold' => 10],
            ['name' => 'Eggs (tray of 30)',     'barcode' => '6009612345678', 'price' => 12000, 'stock' => 15,  'category' => 'Dairy',      'low_stock_threshold' => 5],
            ['name' => 'Rice 2kg',              'barcode' => '6001069380089', 'price' => 5500,  'stock' => 60,  'category' => 'Grains',     'low_stock_threshold' => 15],
            ['name' => 'Maize Flour 2kg',       'barcode' => '6009175580013', 'price' => 4500,  'stock' => 55,  'category' => 'Grains',     'low_stock_threshold' => 15],
            ['name' => 'Cooking Oil 1L',        'barcode' => '6001069380056', 'price' => 7000,  'stock' => 40,  'category' => 'Cooking',    'low_stock_threshold' => 10],
            ['name' => 'Tomato Sauce 400g',     'barcode' => '6001069380034', 'price' => 3000,  'stock' => 35,  'category' => 'Condiments', 'low_stock_threshold' => 10],
            ['name' => 'Laundry Detergent 1kg', 'barcode' => '6009612987654', 'price' => 6500,  'stock' => 8,   'category' => 'Household',  'low_stock_threshold' => 5],
        ];

        $shopId = \App\Models\Shop::query()->value('id');

        foreach ($products as $p) {
            Product::updateOrCreate(
                ['barcode' => $p['barcode']],
                array_merge($p, ['shop_id' => $shopId])
            );
        }
    }
}
