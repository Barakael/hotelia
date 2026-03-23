import AppLayout from '@/components/layout/AppLayout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminReportsApi, AdminReportData, subscriptionsApi, subscriptionPaymentsApi, SubscriptionRow, SubscriptionPaymentRow } from '@/services/api';
import {
  Store, Users, DollarSign, TrendingUp, RefreshCw, CreditCard, CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

type Tab = 'analytics' | 'subscriptions';

const SUB_STATUS_BADGE: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  past_due:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  trialing:  'bg-blue-100 text-blue-700',
};

const PAY_STATUS_BADGE: Record<string, string> = {
  paid:     'bg-green-100 text-green-700',
  pending:  'bg-yellow-100 text-yellow-700',
  failed:   'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-500',
};

export default function SystemReports() {
  const [tab, setTab] = useState<Tab>('analytics');

  const { data, isLoading, refetch, isFetching } = useQuery<AdminReportData>({
    queryKey: ['admin-reports'],
    queryFn:  () => adminReportsApi.get(),
    refetchInterval: 120_000,
  });

  const { data: subscriptions = [] } = useQuery<SubscriptionRow[]>({
    queryKey: ['subscriptions-admin'],
    queryFn: subscriptionsApi.getAll,
    enabled: tab === 'subscriptions',
  });

  const { data: payments = [] } = useQuery<SubscriptionPaymentRow[]>({
    queryKey: ['subscription-payments'],
    queryFn: subscriptionPaymentsApi.getAll,
    enabled: tab === 'subscriptions',
  });

  const summaryCards = [
    { label: 'Total Shops', value: data?.summary.total_shops.toString() ?? '—', icon: Store, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Users', value: data?.summary.total_users.toString() ?? '—', icon: Users, color: 'text-info',    bg: 'bg-info/10'    },
  ];

  const overduePayments = payments.filter(p => p.status === 'pending' && new Date(p.due_date) < new Date());
  const mrr = subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.plan_price, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" /> System Reports
            </h1>
            <p className="text-sm text-muted-foreground">Cross-shop analytics — all time</p>
          </div>
          <div className="flex gap-2">
            <Button variant={tab === 'analytics' ? 'default' : 'outline'} size="sm" onClick={() => setTab('analytics')}>
              Analytics
            </Button>
            <Button variant={tab === 'subscriptions' ? 'default' : 'outline'} size="sm" onClick={() => setTab('subscriptions')}>
              <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Subscriptions
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ── SUBSCRIPTIONS TAB ─────────────────────────────────────── */}
        {tab === 'subscriptions' && (
          <div className="space-y-6">
            {/* Subscription stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Active Subscriptions', value: subscriptions.filter(s => s.status === 'active').length, icon: CheckCircle2, color: 'text-green-600' },
                { label: 'Monthly Recurring Rev', value: `$${mrr.toFixed(2)}`, icon: DollarSign, color: 'text-warning' },
                { label: 'Overdue Invoices', value: overduePayments.length, icon: AlertTriangle, color: overduePayments.length ? 'text-red-600' : 'text-muted-foreground' },
                { label: 'Total Invoices', value: payments.length, icon: Clock, color: 'text-info' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass-card rounded-xl p-4">
                  <div className={`mb-1 ${color}`}><Icon size={20} /></div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Subscriptions table */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b"><h3 className="font-semibold text-sm">Subscriptions</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {['Shop', 'Plan', 'Price/mo', 'Status', 'Starts', 'Next Due', 'Days Left'].map(h => (
                        <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map(sub => (
                      <tr key={sub.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{sub.shop_name}</td>
                        <td className="px-4 py-3">{sub.plan_name}</td>
                        <td className="px-4 py-3">${sub.plan_price.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUB_STATUS_BADGE[sub.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{sub.starts_at ? new Date(sub.starts_at).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{sub.next_due_at ? new Date(sub.next_due_at).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">
                          {sub.days_until_due !== null ? (
                            <span className={sub.days_until_due < 0 ? 'text-red-600 font-semibold' : sub.days_until_due <= 7 ? 'text-yellow-600' : 'text-muted-foreground'}>
                              {sub.days_until_due < 0 ? `${Math.abs(sub.days_until_due)}d overdue` : `${sub.days_until_due}d`}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                    {subscriptions.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No subscriptions yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment invoices table */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b"><h3 className="font-semibold text-sm">All Payment Invoices</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {['Shop', 'Plan', 'Amount', 'Due Date', 'Paid On', 'Method', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{p.shop_name}</td>
                        <td className="px-4 py-3">{p.plan_name}</td>
                        <td className="px-4 py-3 font-mono">${p.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.due_date ? new Date(p.due_date).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 capitalize">{p.payment_method ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAY_STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No invoices yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ─────────────────────────────────────────── */}
        {tab === 'analytics' && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {summaryCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="glass-card rounded-xl p-5 border border-border/40 hover:shadow-xl transition-shadow"
                >
                  {isLoading ? (
                    <div className="space-y-2">
                      <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                      <div className="h-6 w-20 bg-muted rounded animate-pulse mt-3" />
                      <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className={`p-2 rounded-lg ${card.bg} w-fit mb-3`}>
                        <card.icon className={`w-5 h-5 ${card.color}`} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{card.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                    </>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Shop breakdown table */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Shop Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Shop</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cashiers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/40">
                          {Array.from({ length: 2 }).map((__, j) => (
                            <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                          ))}
                        </tr>
                      ))
                    ) : (data?.shop_breakdown ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No shops registered.</td>
                      </tr>
                    ) : (
                      (data?.shop_breakdown ?? [])
                        .slice()
                        .sort((a, b) => b.revenue - a.revenue)
                        .map((shop, i) => (
                          <motion.tr
                            key={shop.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                            className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">{shop.name}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{shop.cashier_count}</td>
                          </motion.tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
