<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Gate::define('manage-inventory', function ($user) {
            return in_array($user->role, ['owner', 'super_admin', 'storekeeper'], true);
        });

        // Storekeepers edit masters; bar/fnb may only tweak price (enforced in ProductController)
        Gate::define('update-product', function ($user) {
            return in_array($user->role, ['owner', 'super_admin', 'storekeeper', 'bar', 'fnb'], true);
        });

        Gate::define('manage-users', function ($user) {
            return $user->role === 'super_admin';
        });

        Gate::define('manage-shops', function ($user) {
            return $user->role === 'super_admin';
        });

        Gate::define('manage-branch', function ($user) {
            return $user->role === 'owner';
        });

        Gate::define('manage-staff', function ($user) {
            return $user->role === 'owner';
        });

        Gate::define('manage-settings', function ($user) {
            return $user->role === 'owner';
        });

        Gate::define('manage-subscriptions', function ($user) {
            return $user->role === 'super_admin';
        });

        Gate::define('view-subscription', function ($user) {
            return in_array($user->role, ['owner', 'super_admin'], true);
        });

        Gate::define('manage-purchases', function ($user) {
            return in_array($user->role, ['owner', 'super_admin', 'storekeeper'], true);
        });

        Gate::define('adjust-stock', function ($user) {
            return in_array($user->role, ['owner', 'super_admin', 'storekeeper'], true);
        });

        Gate::define('view-issues', function ($user) {
            return in_array($user->role, ['owner', 'storekeeper', 'bar', 'fnb'], true);
        });

        Gate::define('issue-stock', function ($user) {
            return in_array($user->role, ['owner', 'storekeeper'], true);
        });

        Gate::define('receive-stock', function ($user) {
            return in_array($user->role, ['owner', 'bar', 'fnb'], true);
        });

        Gate::define('sell', function ($user) {
            return in_array($user->role, ['owner', 'bar', 'fnb'], true);
        });

        Gate::define('manage-rooms', function ($user) {
            return in_array($user->role, ['owner', 'receptionist', 'super_admin'], true);
        });

        Gate::define('manage-services', function ($user) {
            return in_array($user->role, ['owner', 'receptionist', 'super_admin'], true);
        });
    }
}
