import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useStore } from '@/contexts/StoreContext';
import { formatCurrency } from '@/data/mockData';
import { DollarSign, ShoppingCart, CreditCard, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Period = 'daily' | 'weekly' | 'monthly';

// ── Reusable stat card matching Dashboard style ───────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  index = 0,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: 'primary' | 'accent' | 'info';
  index?: number;
}) {
  const tones = {
    primary: { icon: 'text-[#007AAD] dark:text-[#8FCBD6]', bg: 'bg-[#007AAD]/10 dark:bg-[#8FCBD6]/15' },
    accent:  { icon: 'text-[#007AAD]',                      bg: 'bg-[#007AAD]/15' },
    info:    { icon: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/40' },
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm"
    >
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg mb-2', tones.bg)}>
        <Icon className={cn('h-4 w-4', tones.icon)} />
      </div>
      <p className="text-lg sm:text-2xl font-bold tabular-nums leading-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">{label}</p>
    </motion.div>
  );
}

const Reports = () => {
  const { sales } = useStore();
  const [period, setPeriod] = useState<Period>('daily');

  const today = new Date();

  const todaySales = sales.filter(
    s => new Date(s.timestamp).toDateString() === today.toDateString()
  );
  const weekSales = sales.filter(s => {
    const diff = (today.getTime() - new Date(s.timestamp).getTime()) / 86_400_000;
    return diff <= 7;
  });
  const monthSales = sales.filter(s => {
    const d = new Date(s.timestamp);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });

  const currentSales =
    period === 'daily' ? todaySales : period === 'weekly' ? weekSales : monthSales;

  const totalRevenue      = currentSales.reduce((s, x) => s + x.total, 0);
  const totalTransactions = currentSales.length;

  const stats = [
    { label: 'Total Revenue',    value: formatCurrency(totalRevenue),   icon: DollarSign,  tone: 'primary' as const },
    { label: 'Transactions',     value: String(totalTransactions),       icon: ShoppingCart, tone: 'accent' as const },
  ];

  const PAYMENT_BADGE: Record<string, string> = {
    Cash:   'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
    Card:   'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    Mobile: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  };

  return (
    <AppLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-6 h-6 text-[#007AAD]" />
              Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track performance across all time periods
            </p>
          </div>

          {/* Period switcher */}
          <div className="flex gap-2 self-start sm:self-auto">
            {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'default' : 'outline'}
                onClick={() => setPeriod(p)}
                className={cn('capitalize', period === p && 'bg-[#007AAD] hover:bg-[#007AAD]/90 text-white border-[#007AAD]')}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>

        {/* Stat cards — 3 col on mobile like Dashboard */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {stats.map((s, i) => (
            <StatCard key={s.label} {...s} index={i} />
          ))}
        </div>

        {/* Transaction history table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
            <h3 className="flex items-center gap-2 text-sm sm:text-base font-semibold text-foreground">
              <CreditCard className="h-4 w-4 text-[#007AAD]" />
              Transaction History
            </h3>
            <span className="text-xs text-muted-foreground">{currentSales.length} transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 sm:px-4 py-2.5">Date & Time</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">Cashier</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Payment</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Items</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-3 sm:px-4 py-2.5">Total</th>
                </tr>
              </thead>
              <tbody>
                {currentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No transactions for this period
                    </td>
                  </tr>
                ) : (
                  currentSales.map(sale => (
                    <tr key={sale.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="px-3 sm:px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        <span className="sm:hidden block text-[11px] text-muted-foreground/70 mb-0.5">
                          {sale.cashierName}
                        </span>
                        {new Date(sale.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-foreground hidden sm:table-cell">{sale.cashierName}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                          PAYMENT_BADGE[sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)] ?? 'bg-secondary text-secondary-foreground'
                        )}>
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground hidden md:table-cell">
                        {sale.items.length}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right font-bold font-mono whitespace-nowrap">
                        {formatCurrency(sale.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
