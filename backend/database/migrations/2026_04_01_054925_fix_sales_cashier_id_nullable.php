<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Skip if cashier_id is already nullable to avoid re-running on existing DBs
        $columns = Schema::getColumns('sales');
        foreach ($columns as $col) {
            $colName = is_array($col) ? ($col['name'] ?? '') : (property_exists($col, 'name') ? $col->name : '');
            $nullable = is_array($col) ? ($col['nullable'] ?? false) : (property_exists($col, 'nullable') ? $col->nullable : false);
            if ($colName === 'cashier_id' && $nullable) {
                return;
            }
        }
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['cashier_id']);
            $table->foreignId('cashier_id')->nullable()->change();
            $table->foreign('cashier_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['cashier_id']);
            $table->foreignId('cashier_id')->nullable(false)->change();
            $table->foreign('cashier_id')->references('id')->on('users')->restrictOnDelete();
        });
    }
};
