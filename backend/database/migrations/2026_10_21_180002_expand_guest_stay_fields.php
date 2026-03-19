<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->string('email')->nullable()->after('phone');
            $table->string('nationality')->nullable()->after('email');
            $table->string('address')->nullable()->after('nationality');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->unsignedInteger('adults')->default(1)->after('deposit');
            $table->unsignedInteger('children')->default(0)->after('adults');
            $table->string('vehicle_plate')->nullable()->after('children');
            $table->string('purpose')->nullable()->after('vehicle_plate');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn(['adults', 'children', 'vehicle_plate', 'purpose']);
        });
        Schema::table('guests', function (Blueprint $table) {
            $table->dropColumn(['email', 'nationality', 'address']);
        });
    }
};
