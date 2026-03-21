import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Product, CartItem, Sale } from '@/types';
import api from '@/services/api';

// API response shape for a product (snake_case)
interface ApiProduct {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
  low_stock_threshold: number;
  is_sellable_transfer?: boolean;
  branch_id?: number | null;
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: String(p.id),
    name: p.name,
    barcode: p.barcode,
    price: p.price,
    stock: p.stock,
    category: p.category,
    image: p.image,
    lowStockThreshold: p.low_stock_threshold,
    isSellableTransfer: !!p.is_sellable_transfer,
    branchId: p.branch_id ?? null,
  };
}

// API response shape for a sale
interface ApiSaleItem {
  id: number;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
}

interface ApiSale {
  id: number;
  cashier_id: number;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: 'cash' | 'card' | 'mobile' | 'room';
  created_at: string;
  items: ApiSaleItem[];
  cashier?: { id: number; name: string };
}

function mapApiSale(s: ApiSale): Sale {
  return {
    id: String(s.id),
    items: s.items.map((item) => ({
      product: {
        id: String(item.product_id),
        name: item.product_name,
        barcode: '',
        price: item.unit_price,
        stock: 0,
        category: '',
        lowStockThreshold: 0,
      },
      quantity: item.quantity,
    })),
    total: s.total,
    tax: s.tax,
    cashierId: String(s.cashier_id),
    cashierName: s.cashier?.name ?? String(s.cashier_id),
    timestamp: new Date(s.created_at),
    paymentMethod: s.payment_method,
  };
}

interface StoreContextType {
  products: Product[];
  productsLoading: boolean;
  sales: Sale[];
  salesLoading: boolean;
  cart: CartItem[];
  addToCart: (barcode: string) => Product | null;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  completeSale: (
    paymentMethod: 'cash' | 'card' | 'mobile' | 'room',
    cashierId: string,
    cashierName: string,
    extras?: { folio_id?: number; room_id?: number }
  ) => Promise<Sale>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data: rawProducts = [], isLoading: productsLoading } = useQuery<ApiProduct[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
    staleTime: 1000 * 30, // 30 s
  });

  const products = rawProducts.map(mapProduct);

  const { data: rawSales = [], isLoading: salesLoading } = useQuery<ApiSale[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data } = await api.get('/sales');
      return data;
    },
    staleTime: 1000 * 60, // 1 min
  });

  const sales = rawSales.map(mapApiSale);

  const addToCart = useCallback(
    (barcode: string): Product | null => {
      const product = products.find((p) => p.barcode === barcode);
      if (!product || product.stock <= 0) return null;

      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);
        if (existing) {
          if (existing.quantity >= product.stock) return prev;
          return prev.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...prev, { product, quantity: 1 }];
      });
      return product;
    },
    [products]
  );

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((item) => item.product.id !== productId));

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  // Tax is 18% inclusive — already contained in product prices

  const completeSale = async (
    paymentMethod: 'cash' | 'card' | 'mobile' | 'room',
    cashierId: string,
    cashierName: string,
    extras?: { folio_id?: number; room_id?: number }
  ): Promise<Sale> => {
    const { data } = await api.post('/sales', {
      payment_method: paymentMethod,
      items: cart.map((item) => ({
        product_id: parseInt(item.product.id),
        quantity: item.quantity,
      })),
      ...(extras?.folio_id ? { folio_id: extras.folio_id } : {}),
      ...(extras?.room_id ? { room_id: extras.room_id } : {}),
    });

    // Map API response back to the local Sale shape for receipt display
    const sale: Sale = {
      id: String(data.id),
      items: cart.map((item) => ({ ...item })), // snapshot of cart at time of sale
      total: data.total,
      tax: data.tax,
      cashierId,
      cashierName,
      timestamp: new Date(data.created_at),
      paymentMethod,
    };

    // Refresh products so stock counts are up to date
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    clearCart();
    return sale;
  };

  // ── Inventory CRUD (owner / super_admin) ───────────────────────────────────
  const addProduct = async (product: Omit<Product, 'id'>): Promise<void> => {
    await api.post('/products', {
      name: product.name,
      barcode: product.barcode,
      price: product.price,
      stock: product.stock,
      category: product.category,
      image: product.image,
      low_stock_threshold: product.lowStockThreshold,
      is_sellable_transfer: product.isSellableTransfer ?? false,
      branch_id: product.branchId ?? null,
    });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    const body: Record<string, unknown> = { ...updates };
    if ('lowStockThreshold' in updates) {
      body.low_stock_threshold = updates.lowStockThreshold;
      delete body.lowStockThreshold;
    }
    if ('isSellableTransfer' in updates) {
      body.is_sellable_transfer = updates.isSellableTransfer;
      delete body.isSellableTransfer;
    }
    if ('branchId' in updates) {
      body.branch_id = updates.branchId;
      delete body.branchId;
    }
    // Stock changes go through purchases / stock movements — not product update
    delete body.stock;
    await api.put(`/products/${id}`, body);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const deleteProduct = async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        productsLoading,
        sales,
        salesLoading,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotal,
    
        completeSale,
        addProduct,
        updateProduct,
        deleteProduct,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
