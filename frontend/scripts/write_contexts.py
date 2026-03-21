#!/usr/bin/env python3
"""Writes all new frontend files for the POS system backend integration."""
import os

BASE = '/Users/barakael0/scan-and-sale-flow/src'

def write(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content)
    print(f'  wrote {path}')

# ─── AuthContext ────────────────────────────────────────────────────────────────
write('contexts/AuthContext.tsx', """\
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import api from '@/services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('pos_token');
    const stored = localStorage.getItem('pos_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data } = await api.post('/login', { email, password });
      localStorage.setItem('pos_token', data.token);
      const u: User = {
        id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      };
      localStorage.setItem('pos_user', JSON.stringify(u));
      setUser(u);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/logout');
    } catch {
      // best-effort
    } finally {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
""")

# ─── StoreContext ───────────────────────────────────────────────────────────────
write('contexts/StoreContext.tsx', """\
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
  };
}

interface StoreContextType {
  products: Product[];
  productsLoading: boolean;
  cart: CartItem[];
  addToCart: (barcode: string) => Product | null;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartTax: number;
  completeSale: (
    paymentMethod: 'cash' | 'card' | 'mobile',
    cashierId: string,
    cashierName: string
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
  const cartTax = Math.round(cartTotal * 0.18);

  const completeSale = async (
    paymentMethod: 'cash' | 'card' | 'mobile',
    cashierId: string,
    cashierName: string
  ): Promise<Sale> => {
    const { data } = await api.post('/sales', {
      payment_method: paymentMethod,
      items: cart.map((item) => ({
        product_id: parseInt(item.product.id),
        quantity: item.quantity,
      })),
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
    });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    const body: Record<string, unknown> = { ...updates };
    if ('lowStockThreshold' in updates) {
      body.low_stock_threshold = updates.lowStockThreshold;
      delete body.lowStockThreshold;
    }
    await api.put(\`/products/\${id}\`, body);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const deleteProduct = async (id: string): Promise<void> => {
    await api.delete(\`/products/\${id}\`);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        productsLoading,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotal,
        cartTax,
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
""")

print('All files written successfully.')
