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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');          // e.g. Starter, Professional, Enterprise
            $table->string('slug')->unique(); // e.g. starter, professional, enterprise
            $table->decimal('price', 10, 2); // monthly price in USD
            $table->integer('max_branches')->default(1);
            $table->integer('max_staff')->default(5);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
