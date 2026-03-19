<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('outlet_type')->nullable()->after('phone');
            // restaurant|bar|bbq|reception|store
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->after('shop_id')->constrained()->nullOnDelete();
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->after('shop_id')->constrained()->nullOnDelete();
            $table->foreignId('folio_id')->nullable()->after('branch_id')->constrained()->nullOnDelete();
            $table->foreignId('room_id')->nullable()->after('folio_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('room_id');
            $table->dropConstrainedForeignId('folio_id');
            $table->dropConstrainedForeignId('branch_id');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('branch_id');
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('outlet_type');
        });
    }
};
