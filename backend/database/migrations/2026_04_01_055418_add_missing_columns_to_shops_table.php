<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            if (!Schema::hasColumn('shops', 'address')) {
                $table->string('address')->nullable()->after('name');
            }
            if (!Schema::hasColumn('shops', 'phone')) {
                $table->string('phone')->nullable()->after('address');
            }
            if (!Schema::hasColumn('shops', 'owner_id')) {
                $table->foreignId('owner_id')->nullable()->after('currency')->constrained('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn(['address', 'phone', 'owner_id']);
        });
    }
};
