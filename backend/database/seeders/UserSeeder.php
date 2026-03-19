<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Admin',       'email' => 'admin@pos.com', 'role' => 'super_admin'],
            ['name' => 'Store Owner', 'email' => 'owner@pos.com', 'role' => 'owner'],
            ['name' => 'Store Keeper', 'email' => 'store@pos.com', 'role' => 'storekeeper'],
            ['name' => 'Bar Desk', 'email' => 'bar@pos.com', 'role' => 'bar'],
            ['name' => 'Restaurant & BBQ', 'email' => 'fnb@pos.com', 'role' => 'fnb'],
        ];

        foreach ($users as $u) {
            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name'     => $u['name'],
                    'role'     => $u['role'],
                    'password' => Hash::make('password'), // default password: "password"
                ]
            );
        }
    }
}
