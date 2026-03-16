# Hotelia

Integrated hotel management system — Accommodation, Restaurant / Bar / BBQ POS, Conference & Shuttle, Purchases (Manunuzi), Sales, and Stock.

Forked from SmartSell POS (`ScanPos`) and extended with hotel modules.

## Stack

- **Backend:** Laravel API + Sanctum (`backend/`)
- **Frontend:** React + Vite + TanStack Query + shadcn (`frontend/`)

## Local setup

### Backend

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
# Default DB is SQLite — creates database/database.sqlite if needed
touch database/database.sqlite
php artisan migrate --seed
php artisan serve
```

API: `http://127.0.0.1:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://127.0.0.1:5173` (proxies `/api` to Laravel — check `vite.config.ts`).

## Default users (password: `password`)

| Email | Role |
|-------|------|
| `admin@pos.com` | super_admin |
| `owner@pos.com` | owner |
| `store@pos.com` | storekeeper |
| `bar@pos.com` | bar till |
| `fnb@pos.com` | restaurant and BBQ till |
| `reception@pos.com` | hotel reception |

Demo seed includes 20 rooms, Restaurant/Bar/BBQ products, Conference Hall + Airport Shuttle, and one sample booking.

## Modules

- POS sales, inventory, receipts, reports (from SmartSell)
- Purchases / suppliers / stock movements
- Rooms, reservations, guest folios, charge-to-room
- Outlets: Restaurant, Bar, BBQ
- Conference & Shuttle service bookings
