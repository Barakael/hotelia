import { Product, Sale, User, DailySales } from '@/types';

export const mockUsers: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@pos.com', role: 'super_admin' },
  { id: '2', name: 'Store Owner', email: 'owner@pos.com', role: 'owner' },
  { id: '3', name: 'Jane Cashier', email: 'jane@pos.com', role: 'cashier' },
];

export const mockProducts: Product[] = [
  { id: '1', name: 'Coca Cola 500ml', barcode: '5449000000996', price: 1500, stock: 120, category: 'Beverages', lowStockThreshold: 20 },
  { id: '2', name: 'Pepsi 500ml', barcode: '4060800001238', price: 1400, stock: 85, category: 'Beverages', lowStockThreshold: 20 },
  { id: '3', name: 'White Bread Loaf', barcode: '6001240100011', price: 2500, stock: 45, category: 'Bakery', lowStockThreshold: 10 },
  { id: '4', name: 'Whole Milk 1L', barcode: '5000159459228', price: 3200, stock: 60, category: 'Dairy', lowStockThreshold: 15 },
  { id: '5', name: 'Rice 2kg', barcode: '6009510800204', price: 8500, stock: 30, category: 'Grains', lowStockThreshold: 10 },
  { id: '6', name: 'Cooking Oil 1L', barcode: '6001089200019', price: 6500, stock: 25, category: 'Cooking', lowStockThreshold: 8 },
  { id: '7', name: 'Sugar 1kg', barcode: '6009900300018', price: 4000, stock: 40, category: 'Cooking', lowStockThreshold: 10 },
  { id: '8', name: 'Tea Bags 100pk', barcode: '6009182611206', price: 5500, stock: 35, category: 'Beverages', lowStockThreshold: 10 },
  { id: '9', name: 'Instant Coffee 200g', barcode: '7613036270632', price: 12000, stock: 18, category: 'Beverages', lowStockThreshold: 5 },
  { id: '10', name: 'Eggs (Tray of 30)', barcode: '6001007082611', price: 9500, stock: 22, category: 'Dairy', lowStockThreshold: 8 },
  { id: '11', name: 'Tomato Sauce 700ml', barcode: '6001059901007', price: 3500, stock: 50, category: 'Condiments', lowStockThreshold: 12 },
  { id: '12', name: 'Washing Powder 2kg', barcode: '6001085001003', price: 15000, stock: 15, category: 'Household', lowStockThreshold: 5 },
];

export const mockSales: Sale[] = [
  {
    id: 's1', items: [
      { product: mockProducts[0], quantity: 2 },
      { product: mockProducts[2], quantity: 1 },
    ], total: 5500, tax: 990, cashierId: '3', cashierName: 'Jane Cashier',
    timestamp: new Date('2026-03-05T09:15:00'), paymentMethod: 'cash'
  },
  {
    id: 's2', items: [
      { product: mockProducts[4], quantity: 1 },
      { product: mockProducts[6], quantity: 2 },
    ], total: 16500, tax: 2970, cashierId: '3', cashierName: 'Jane Cashier',
    timestamp: new Date('2026-03-05T10:30:00'), paymentMethod: 'card'
  },
  {
    id: 's3', items: [
      { product: mockProducts[8], quantity: 1 },
      { product: mockProducts[3], quantity: 2 },
    ], total: 18400, tax: 3312, cashierId: '3', cashierName: 'Jane Cashier',
    timestamp: new Date('2026-03-05T11:45:00'), paymentMethod: 'mobile'
  },
  {
    id: 's4', items: [
      { product: mockProducts[1], quantity: 3 },
      { product: mockProducts[10], quantity: 1 },
    ], total: 7700, tax: 1386, cashierId: '3', cashierName: 'Jane Cashier',
    timestamp: new Date('2026-03-04T14:20:00'), paymentMethod: 'cash'
  },
  {
    id: 's5', items: [
      { product: mockProducts[11], quantity: 1 },
      { product: mockProducts[5], quantity: 1 },
    ], total: 21500, tax: 3870, cashierId: '3', cashierName: 'Jane Cashier',
    timestamp: new Date('2026-03-03T16:00:00'), paymentMethod: 'card'
  },
];

export const mockWeeklySales: DailySales[] = [
  { date: 'Mon', total: 125000, transactions: 18 },
  { date: 'Tue', total: 98000, transactions: 14 },
  { date: 'Wed', total: 142000, transactions: 22 },
  { date: 'Thu', total: 115000, transactions: 17 },
  { date: 'Fri', total: 178000, transactions: 28 },
  { date: 'Sat', total: 210000, transactions: 35 },
  { date: 'Sun', total: 89000, transactions: 12 },
];

export const formatCurrency = (amount: number): string => {
  return `TZS ${amount.toLocaleString()}`;
};
