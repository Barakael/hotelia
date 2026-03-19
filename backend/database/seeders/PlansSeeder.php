<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlansSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            ['name' => 'Starter',      'slug' => 'starter',      'price' => 29.00,  'max_branches' => 1,  'max_staff' => 3],
            ['name' => 'Professional', 'slug' => 'professional', 'price' => 79.00,  'max_branches' => 5,  'max_staff' => 20],
            ['name' => 'Enterprise',   'slug' => 'enterprise',   'price' => 199.00, 'max_branches' => 999,'max_staff' => 999],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], array_merge($plan, ['is_active' => true]));
        }
    }
}
