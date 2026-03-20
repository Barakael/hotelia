<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AdminReportsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BpmReportController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FolioController;
use App\Http\Controllers\Api\PlanController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\StockIssueController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\SubscriptionPaymentController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);

    Route::middleware('can:sell')->group(function () {
        Route::post('/sales', [SaleController::class, 'store']);
    });
    Route::get('/sales', [SaleController::class, 'index']);
    Route::get('/sales/{id}', [SaleController::class, 'show']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::middleware('can:update-product')->group(function () {
        Route::put('/products/{id}', [ProductController::class, 'update']);
        Route::patch('/products/{id}', [ProductController::class, 'update']);
    });

    Route::middleware('can:manage-inventory')->group(function () {
        Route::post('/products', [ProductController::class, 'store']);
        Route::delete('/products/{id}', [ProductController::class, 'destroy']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
    });

    Route::middleware('can:manage-purchases')->group(function () {
        Route::get('/suppliers', [SupplierController::class, 'index']);
        Route::post('/suppliers', [SupplierController::class, 'store']);
        Route::put('/suppliers/{id}', [SupplierController::class, 'update']);
        Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy']);

        Route::get('/purchases', [PurchaseController::class, 'index']);
        Route::post('/purchases', [PurchaseController::class, 'store']);
        Route::get('/purchases/{id}', [PurchaseController::class, 'show']);
        Route::post('/purchases/{id}/receive', [PurchaseController::class, 'receive']);
    });

    Route::middleware('can:adjust-stock')->group(function () {
        Route::get('/stock-movements', [StockMovementController::class, 'index']);
        Route::post('/stock-movements/adjust', [StockMovementController::class, 'adjust']);
        Route::post('/stock-movements/reconcile', [StockMovementController::class, 'reconcile']);
    });

    Route::middleware('can:view-issues')->group(function () {
        Route::get('/stock-issues', [StockIssueController::class, 'index']);
    });

    Route::middleware('can:receive-stock')->group(function () {
        Route::post('/stock-issues/{id}/acknowledge', [StockIssueController::class, 'acknowledge']);
        Route::post('/stock-issues/{id}/reject', [StockIssueController::class, 'reject']);
    });

    Route::middleware('can:issue-stock')->group(function () {
        Route::get('/stock-issue-outlets', [StockIssueController::class, 'outlets']);
        Route::get('/stock-issue-receivers', [StockIssueController::class, 'receivers']);
        Route::post('/stock-issues', [StockIssueController::class, 'store']);
    });

    // Cashiers need occupied rooms for charge-to-room (no manage-rooms gate)
    Route::get('/pos/occupied-rooms', [RoomController::class, 'occupiedWithFolios']);

    Route::middleware('can:manage-rooms')->group(function () {
        Route::get('/room-types', [RoomController::class, 'types']);
        Route::post('/room-types', [RoomController::class, 'storeType']);
        Route::get('/rooms/occupied-folios', [RoomController::class, 'occupiedWithFolios']);
        Route::get('/rooms', [RoomController::class, 'index']);
        Route::post('/rooms', [RoomController::class, 'store']);
        Route::patch('/rooms/{id}/status', [RoomController::class, 'updateStatus']);

        Route::get('/reservations', [ReservationController::class, 'index']);
        Route::post('/reservations', [ReservationController::class, 'store']);
        Route::post('/reservations/{id}/check-in', [ReservationController::class, 'checkIn']);
        Route::post('/reservations/{id}/check-out', [ReservationController::class, 'checkOut']);
        Route::post('/reservations/{id}/cancel', [ReservationController::class, 'cancel']);

        Route::get('/folios/{id}', [FolioController::class, 'show']);
    });

    Route::middleware('can:manage-services')->group(function () {
        Route::get('/service-types', [ServiceController::class, 'types']);
        Route::post('/service-types', [ServiceController::class, 'storeType']);
        Route::get('/service-bookings', [ServiceController::class, 'index']);
        Route::post('/service-bookings', [ServiceController::class, 'store']);
    });

    Route::middleware('can:manage-users')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
        Route::get('/admin/reports', [AdminReportsController::class, 'index']);
    });

    Route::middleware('can:manage-shops')->group(function () {
        Route::get('/shops', [ShopController::class, 'index']);
        Route::post('/shops', [ShopController::class, 'store']);
        Route::get('/shops/{shop}', [ShopController::class, 'show']);
        Route::put('/shops/{shop}', [ShopController::class, 'update']);
        Route::delete('/shops/{shop}', [ShopController::class, 'destroy']);
    });

    Route::middleware('can:manage-branch')->group(function () {
        Route::get('/branches', [BranchController::class, 'index']);
        Route::post('/branches', [BranchController::class, 'store']);
        Route::put('/branches/{branch}', [BranchController::class, 'update']);
        Route::delete('/branches/{branch}', [BranchController::class, 'destroy']);
    });

    Route::middleware('can:manage-staff')->group(function () {
        Route::get('/staff', [StaffController::class, 'index']);
        Route::post('/staff', [StaffController::class, 'store']);
        Route::put('/staff/{user}', [StaffController::class, 'update']);
        Route::delete('/staff/{user}', [StaffController::class, 'destroy']);
    });

    Route::get('/settings', [ShopController::class, 'showOwnerShop']);
    Route::middleware('can:manage-settings')->group(function () {
        Route::put('/settings', [ShopController::class, 'updateOwnerShop']);
    });

    Route::get('/plans', [PlanController::class, 'index']);

    Route::middleware('can:view-subscription')->group(function () {
        Route::get('/subscriptions', [SubscriptionController::class, 'index']);
        Route::get('/subscription-payments', [SubscriptionPaymentController::class, 'index']);
    });

    Route::middleware('can:manage-subscriptions')->group(function () {
        Route::post('/plans', [PlanController::class, 'store']);
        Route::put('/plans/{plan}', [PlanController::class, 'update']);
        Route::delete('/plans/{plan}', [PlanController::class, 'destroy']);
        Route::post('/subscriptions', [SubscriptionController::class, 'store']);
        Route::put('/subscription-payments/{id}/mark-paid', [SubscriptionPaymentController::class, 'markPaid']);
    });
});

Route::middleware('bpm.apikey')->group(function () {
    Route::get('/bpm/overview', [BpmReportController::class, 'overview']);
});
