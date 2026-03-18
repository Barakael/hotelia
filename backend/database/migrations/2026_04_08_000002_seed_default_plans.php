<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $now = now();

        $plans = [
            ['name' => 'Starter',      'slug' => 'starter',      'price' => 29.00,  'max_branches' => 1,   'max_staff' => 3,   'is_active' => 1],
            ['name' => 'Professional', 'slug' => 'professional', 'price' => 79.00,  'max_branches' => 5,   'max_staff' => 20,  'is_active' => 1],
            ['name' => 'Enterprise',   'slug' => 'enterprise',   'price' => 199.00, 'max_branches' => 999, 'max_staff' => 999, 'is_active' => 1],
        ];

        foreach ($plans as $plan) {
            DB::table('plans')->updateOrInsert(
                ['slug' => $plan['slug']],
                array_merge($plan, ['created_at' => $now, 'updated_at' => $now])
            );
        }
    }

    public function down(): void
    {
        DB::table('plans')->whereIn('slug', ['starter', 'professional', 'enterprise'])->delete();
    }
};
