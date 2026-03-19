<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (! Schema::hasColumn('sales', 'shop_id')) {
                $table->foreignId('shop_id')->nullable()->after('id')->constrained('shops')->nullOnDelete();
            }
            if (! Schema::hasColumn('sales', 'serial_number')) {
                $table->string('serial_number')->nullable()->after('payment_method');
            }
            if (! Schema::hasColumn('sales', 'znr')) {
                $table->string('znr')->nullable()->after('serial_number');
            }
            if (! Schema::hasColumn('sales', 'uin')) {
                $table->string('uin')->nullable()->after('znr');
            }
            if (! Schema::hasColumn('sales', 'verification_code')) {
                $table->string('verification_code', 32)->nullable()->after('uin');
            }
            if (! Schema::hasColumn('sales', 'customer_name')) {
                $table->string('customer_name')->nullable()->after('verification_code');
            }
            if (! Schema::hasColumn('sales', 'customer_phone')) {
                $table->string('customer_phone')->nullable()->after('customer_name');
            }
            if (! Schema::hasColumn('sales', 'customer_address')) {
                $table->string('customer_address')->nullable()->after('customer_phone');
            }
            if (! Schema::hasColumn('sales', 'customer_id_type')) {
                $table->string('customer_id_type')->nullable()->after('customer_address');
            }
            if (! Schema::hasColumn('sales', 'customer_id')) {
                $table->string('customer_id')->nullable()->after('customer_id_type');
            }
            if (! Schema::hasColumn('sales', 'total_excl_tax')) {
                $table->decimal('total_excl_tax', 12, 2)->nullable()->after('customer_id');
            }
            if (! Schema::hasColumn('sales', 'total_tax')) {
                $table->decimal('total_tax', 12, 2)->nullable()->after('total_excl_tax');
            }
            if (! Schema::hasColumn('sales', 'amount_tendered')) {
                $table->decimal('amount_tendered', 12, 2)->nullable()->after('total_tax');
            }
            if (! Schema::hasColumn('sales', 'cash_change')) {
                $table->decimal('cash_change', 12, 2)->nullable()->after('amount_tendered');
            }
            if (! Schema::hasColumn('sales', 'tax_rate_used')) {
                $table->decimal('tax_rate_used', 5, 2)->nullable()->after('cash_change');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['shop_id']);
            $table->dropColumn([
                'shop_id', 'serial_number', 'znr', 'uin', 'verification_code',
                'customer_name', 'customer_phone', 'customer_address',
                'customer_id_type', 'customer_id',
                'total_excl_tax', 'total_tax', 'amount_tendered', 'cash_change',
                'tax_rate_used',
            ]);
        });
    }
};
