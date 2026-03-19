<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outlet_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('qty')->default(0);
            $table->timestamps();

            $table->unique(['branch_id', 'product_id']);
        });

        Schema::create('stock_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('to_branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('issued_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('pending'); // pending|acknowledged|rejected
            $table->text('note')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_issue_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_issue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('qty');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_issue_items');
        Schema::dropIfExists('stock_issues');
        Schema::dropIfExists('outlet_stocks');
    }
};
