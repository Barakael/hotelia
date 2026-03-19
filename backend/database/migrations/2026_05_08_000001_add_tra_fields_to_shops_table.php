<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            if (! Schema::hasColumn('shops', 'tin')) {
                $table->string('tin')->nullable()->after('phone');
            }
            if (! Schema::hasColumn('shops', 'vrn')) {
                $table->string('vrn')->nullable()->after('tin');
            }
            if (! Schema::hasColumn('shops', 'mobile')) {
                $table->string('mobile')->nullable()->after('vrn');
            }
            if (! Schema::hasColumn('shops', 'location')) {
                $table->string('location')->nullable()->after('mobile');
            }
            if (! Schema::hasColumn('shops', 'tax_office')) {
                $table->string('tax_office')->nullable()->after('location');
            }
            if (! Schema::hasColumn('shops', 'serial_prefix')) {
                $table->string('serial_prefix', 16)->default('DEM')->after('tax_office');
            }
            if (! Schema::hasColumn('shops', 'receipt_counter')) {
                $table->unsignedInteger('receipt_counter')->default(0)->after('serial_prefix');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropColumn([
                'tin', 'vrn', 'mobile', 'location', 'tax_office',
                'serial_prefix', 'receipt_counter',
            ]);
        });
    }
};
