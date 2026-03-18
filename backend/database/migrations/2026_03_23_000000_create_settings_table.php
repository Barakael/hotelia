<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Seed default values
        DB::table('settings')->insert([
            ['key' => 'store_name',    'value' => 'MyPOS Store',     'created_at' => now(), 'updated_at' => now()],
            ['key' => 'store_address', 'value' => '',                 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'store_phone',   'value' => '',                 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'store_email',   'value' => '',                 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'tax_rate',      'value' => '18',               'created_at' => now(), 'updated_at' => now()],
            ['key' => 'currency',      'value' => 'TZS',              'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
