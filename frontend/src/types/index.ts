export type UserRole = 'super_admin' | 'owner' | 'storekeeper' | 'receptionist' | 'bar' | 'fnb';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  shopId?: number | null;
  branchId?: number | null;
  avatar?: string;
}

export interface Shop {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxRate: number;
  currency: string;
  ownerId?: number | null;
  owner?: { id: number; name: string; email: string } | null;
  branchesCount?: number;
  staffCount?: number;
  createdAt?: string;
}

export interface Branch {
  id: number;
  shopId: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  outletType?: string | null;
  cashierCount?: number;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
  lowStockThreshold: number;
  isSellableTransfer?: boolean;
  branchId?: number | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  tax: number;
  cashierId: string;
  cashierName: string;
  timestamp: Date;
  paymentMethod: 'cash' | 'card' | 'mobile' | 'room';
}

export interface DailySales {
  date: string;
  total: number;
  transactions: number;
}

export interface CategorySales {
  category: string;
  total: number;
  count: number;
}
