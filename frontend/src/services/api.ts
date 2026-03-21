import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach Bearer token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error normaliser
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[Object.keys(error.response?.data?.errors ?? {})[0]]?.[0] ||
      error.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default api;

// ─── Categories API ───────────────────────────────────────────────────────────
export interface ShopCategory {
  id: number;
  name: string;
}

export const categoriesApi = {
  getAll: () => api.get('/categories').then(r => r.data as ShopCategory[]),
  create: (name: string) => api.post('/categories', { name }).then(r => r.data as ShopCategory),
  delete: (id: number) => api.delete(`/categories/${id}`).then(r => r.data),
};

// ─── Users API (super_admin) ──────────────────────────────────────────────────
export interface UserPayload {
  name: string;
  email: string;
  role: 'super_admin' | 'owner' | 'storekeeper' | 'receptionist' | 'bar' | 'fnb';
  password?: string;
}

export const usersApi = {
  getAll: () => api.get('/users').then(r => r.data),
  create: (data: UserPayload) => api.post('/users', data).then(r => r.data),
  update: (id: string | number, data: Partial<UserPayload>) =>
    api.put(`/users/${id}`, data).then(r => r.data),
  delete: (id: string | number) => api.delete(`/users/${id}`).then(r => r.data),
};

// ─── Shops API (super_admin) ──────────────────────────────────────────────────
export interface ShopPayload {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate?: number | string;
  currency?: string;
  owner_name: string;
  owner_email: string;
  owner_password: string;
}

export interface ShopUpdatePayload {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate?: number | string;
  currency?: string;
}

export const shopsApi = {
  getAll: () => api.get('/shops').then(r => r.data),
  getOne: (id: number) => api.get(`/shops/${id}`).then(r => r.data),
  create: (data: ShopPayload) => api.post('/shops', data).then(r => r.data),
  update: (id: number, data: ShopUpdatePayload) => api.put(`/shops/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/shops/${id}`).then(r => r.data),
};

// ─── Branches API (owner) ─────────────────────────────────────────────────────
export interface BranchPayload {
  name: string;
  address?: string;
  phone?: string;
  outlet_type?: string;
}

export const branchesApi = {
  getAll: () => api.get('/branches').then(r => r.data),
  create: (data: BranchPayload) => api.post('/branches', data).then(r => r.data),
  update: (id: number, data: Partial<BranchPayload>) => api.put(`/branches/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/branches/${id}`).then(r => r.data),
};

// ─── Staff API (owner) ────────────────────────────────────────────────────────
export interface StaffPayload {
  name: string;
  email: string;
  password?: string;
  role?: string;
  branch_id?: number;
}

export const staffApi = {
  getAll: () => api.get('/staff').then(r => r.data),
  create: (data: StaffPayload) => api.post('/staff', data).then(r => r.data),
  update: (id: number, data: Partial<StaffPayload>) => api.put(`/staff/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/staff/${id}`).then(r => r.data),
};

// ─── Activity Logs API (super_admin) ─────────────────────────────────────────
export interface ActivityLogEntry {
  id: number;
  action: string;
  description: string;
  ip_address: string | null;
  created_at: string;
  user: { id: number; name: string; email: string; role: string } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const activityLogsApi = {
  getAll: (params?: { action?: string; date?: string; page?: number }) =>
    api.get('/activity-logs', { params }).then(r => r.data as PaginatedResponse<ActivityLogEntry>),
};

// ─── Admin Reports API (super_admin) ─────────────────────────────────────────
export interface ShopReportRow {
  id: number;
  name: string;
  currency: string;
  cashier_count: number;
  revenue: number;
  transactions: number;
}

export interface AdminReportSummary {
  total_shops: number;
  total_users: number;
  total_revenue: number;
  total_transactions: number;
}

export interface AdminReportData {
  summary: AdminReportSummary;
  shop_breakdown: ShopReportRow[];
  daily_revenue: { date: string; total: number; transactions: number }[];
  top_shop: ShopReportRow | null;
}

export const adminReportsApi = {
  get: () => api.get('/admin/reports').then(r => r.data as AdminReportData),
};

export interface OwnerSettingsPayload {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate?: number | string;
  currency?: string;
}

export const settingsApi = {
  get: () => api.get('/settings').then(r => r.data),
  update: (data: OwnerSettingsPayload) => api.put('/settings', data).then(r => r.data),
};

// ─── Plans API ────────────────────────────────────────────────────────────────
export interface Plan {
  id: number;
  name: string;
  slug: string;
  price: number;
  max_branches: number;
  max_staff: number;
  is_active: boolean;
}

export interface PlanPayload {
  name: string;
  price: number;
  max_branches: number;
  max_staff: number;
  is_active?: boolean;
}

export const plansApi = {
  getAll: () => api.get('/plans').then(r => r.data as Plan[]),
  create: (data: PlanPayload) => api.post('/plans', data).then(r => r.data as Plan),
  update: (id: number, data: Partial<PlanPayload>) => api.put(`/plans/${id}`, data).then(r => r.data as Plan),
  destroy: (id: number) => api.delete(`/plans/${id}`),
};

// ─── Subscriptions API ────────────────────────────────────────────────────────
export interface SubscriptionRow {
  id: number;
  shop_id: number;
  shop_name: string;
  plan_id: number;
  plan_name: string;
  plan_price: number;
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  starts_at: string;
  next_due_at: string;
  days_until_due: number | null;
}

export interface AssignPlanPayload {
  shop_id: number;
  plan_id: number;
  starts_at?: string;
}

export const subscriptionsApi = {
  get: () => api.get('/subscriptions').then(r => r.data as SubscriptionRow | SubscriptionRow[] | null),
  /** owner's single subscription — normalises {} (Symfony null quirk) → null */
  getOwner: () =>
    api.get('/subscriptions').then(r => {
      const d = r.data;
      if (!d || typeof d !== 'object' || !('id' in d)) return null;
      return d as SubscriptionRow;
    }),
  /** super_admin list */
  getAll: () => api.get('/subscriptions').then(r => r.data as SubscriptionRow[]),
  assign: (data: AssignPlanPayload) => api.post('/subscriptions', data).then(r => r.data),
};

// ─── Subscription Payments API ────────────────────────────────────────────────
export interface SubscriptionPaymentRow {
  id: number;
  shop_id: number;
  shop_name: string;
  plan_name: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string | null;
  reference: string | null;
  due_date: string;
  paid_at: string | null;
  notes: string | null;
}

export interface MarkPaidPayload {
  payment_method?: string;
  reference?: string;
  notes?: string;
}

export const subscriptionPaymentsApi = {
  getAll: () => api.get('/subscription-payments').then(r => r.data as SubscriptionPaymentRow[]),
  markPaid: (id: number, data?: MarkPaidPayload) =>
    api.put(`/subscription-payments/${id}/mark-paid`, data ?? {}).then(r => r.data as SubscriptionPaymentRow),
};

// ─── Top Product type (used in dashboard + reports) ───────────────────────────
export interface TopProduct {
  product_id: number;
  name: string;
  category: string;
  total_sold: number;
  total_revenue: number;
}

// Updated AdminReportSummary (includes MRR + subscription stats)
export interface AdminReportSummaryExtended extends AdminReportSummary {
  mrr: number;
  active_subscriptions: number;
  overdue_payments: number;
}

export interface AdminReportDataExtended {
  summary: AdminReportSummaryExtended;
  shop_breakdown: ShopReportRow[];
  daily_revenue: { date: string; total: number; transactions: number }[];
  top_shop: ShopReportRow | null;
  top_products: TopProduct[];
  payment_stats: Record<string, { status: string; count: number; total: number }>;
}

// ─── Hotelia: Purchases / Stock / Rooms / Services ────────────────────────────
export const suppliersApi = {
  getAll: () => api.get('/suppliers').then(r => r.data),
  create: (data: { name: string; phone?: string; address?: string }) =>
    api.post('/suppliers', data).then(r => r.data),
  update: (id: number, data: Partial<{ name: string; phone?: string; address?: string }>) =>
    api.put(`/suppliers/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
};

export const purchasesApi = {
  getAll: () => api.get('/purchases').then(r => r.data),
  getOne: (id: number) => api.get(`/purchases/${id}`).then(r => r.data),
  create: (data: {
    supplier_id: number;
    notes?: string;
    items: { product_id: number; qty: number; unit_cost: number }[];
  }) => api.post('/purchases', data).then(r => r.data),
  receive: (id: number) => api.post(`/purchases/${id}/receive`).then(r => r.data),
};

export const stockMovementsApi = {
  getAll: (params?: { product_id?: number }) =>
    api.get('/stock-movements', { params }).then(r => r.data),
  reconcile: (data: { product_id: number; counted_qty: number; note?: string }) =>
    api.post('/stock-movements/reconcile', data).then(r => r.data),
};

export const stockIssuesApi = {
  getAll: () => api.get('/stock-issues').then(r => r.data),
  receivers: () => api.get('/stock-issue-receivers').then(r => r.data),
  outlets: () => api.get('/stock-issue-outlets').then(r => r.data),
  create: (data: {
    to_branch_id: number;
    issued_to: number;
    note?: string;
    items: { product_id: number; qty: number }[];
  }) => api.post('/stock-issues', data).then(r => r.data),
  acknowledge: (id: number) => api.post(`/stock-issues/${id}/acknowledge`).then(r => r.data),
  reject: (id: number) => api.post(`/stock-issues/${id}/reject`).then(r => r.data),
};

export const roomsApi = {
  getTypes: () => api.get('/room-types').then(r => r.data),
  createType: (data: { name: string; base_rate: number; capacity?: number }) =>
    api.post('/room-types', data).then(r => r.data),
  getAll: () => api.get('/rooms').then(r => r.data),
  create: (data: { room_type_id: number; number: string; status?: string }) =>
    api.post('/rooms', data).then(r => r.data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/rooms/${id}/status`, { status }).then(r => r.data),
  occupiedWithFolios: () => api.get('/pos/occupied-rooms').then(r => r.data as OccupiedRoom[]),
};

export interface OccupiedRoom {
  id: number;
  number: string;
  room_type?: string;
  guest_name?: string;
  folio_id: number;
  reservation_id: number;
}

export const reservationsApi = {
  getAll: () => api.get('/reservations').then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/reservations', data).then(r => r.data),
  checkIn: (id: number) => api.post(`/reservations/${id}/check-in`).then(r => r.data),
  checkOut: (id: number, data?: Record<string, unknown>) =>
    api.post(`/reservations/${id}/check-out`, data ?? {}).then(r => r.data),
  cancel: (id: number) => api.post(`/reservations/${id}/cancel`).then(r => r.data),
};

export const foliosApi = {
  getOne: (id: number) => api.get(`/folios/${id}`).then(r => r.data),
};

export const servicesApi = {
  getTypes: () => api.get('/service-types').then(r => r.data),
  createType: (data: { type: string; name: string; default_price: number }) =>
    api.post('/service-types', data).then(r => r.data),
  getBookings: () => api.get('/service-bookings').then(r => r.data),
  createBooking: (data: Record<string, unknown>) =>
    api.post('/service-bookings', data).then(r => r.data),
};

