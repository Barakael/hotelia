import { useState, FormEvent } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  subscriptionsApi,
  subscriptionPaymentsApi,
  plansApi,
  SubscriptionRow,
  SubscriptionPaymentRow,
  Plan,
  PlanPayload,
  AssignPlanPayload,
} from '@/services/api';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, RefreshCw, Calendar, DollarSign, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  paid:     'bg-green-100 text-green-700',
  pending:  'bg-yellow-100 text-yellow-700',
  failed:   'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-500',
};

const SUB_STATUS_BADGE: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  past_due:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  trialing:  'bg-blue-100 text-blue-700',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(n: number | null | undefined) {
  if (n == null || isNaN(n as number)) return '—';
  return `$${(n as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

// ─── Admin view ───────────────────────────────────────────────────────────────
const BLANK_PLAN_FORM = { name: '', price: '', max_branches: '1', max_staff: '5' };

function AdminPayments() {
  const qc = useQueryClient();
  const [assignShopId, setAssignShopId]   = useState('');
  const [assignPlanId, setAssignPlanId]   = useState('');
  const [markingId, setMarkingId]         = useState<number | null>(null);
  const [payMethod, setPayMethod]         = useState('');
  const [payRef, setPayRef]               = useState('');
  // Plan management state
  const [showPlanForm, setShowPlanForm]   = useState(false);
  const [editingPlan, setEditingPlan]     = useState<Plan | null>(null);
  const [planForm, setPlanForm]           = useState(BLANK_PLAN_FORM);

  const { data: subscriptions = [], isLoading: subsLoading, refetch: refetchSubs } =
    useQuery<SubscriptionRow[]>({
      queryKey: ['subscriptions-admin'],
      queryFn: subscriptionsApi.getAll,
    });

  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments } =
    useQuery<SubscriptionPaymentRow[]>({
      queryKey: ['subscription-payments'],
      queryFn: subscriptionPaymentsApi.getAll,
    });

  const { data: plans = [], refetch: refetchPlans } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: plansApi.getAll,
  });

  const createPlanMutation = useMutation({
    mutationFn: (data: PlanPayload) => plansApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      setShowPlanForm(false);
      setEditingPlan(null);
      setPlanForm(BLANK_PLAN_FORM);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PlanPayload> }) => plansApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      setShowPlanForm(false);
      setEditingPlan(null);
      setPlanForm(BLANK_PLAN_FORM);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: number) => plansApi.destroy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });

  const handlePlanSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data: PlanPayload = {
      name:         planForm.name,
      price:        parseFloat(planForm.price),
      max_branches: parseInt(planForm.max_branches),
      max_staff:    parseInt(planForm.max_staff),
    };
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const startEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name:         plan.name,
      price:        String(plan.price),
      max_branches: String(plan.max_branches),
      max_staff:    String(plan.max_staff),
    });
    setShowPlanForm(true);
  };

  const cancelPlanForm = () => {
    setShowPlanForm(false);
    setEditingPlan(null);
    setPlanForm(BLANK_PLAN_FORM);
  };

  const assignMutation = useMutation({
    mutationFn: (data: AssignPlanPayload) => subscriptionsApi.assign(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions-admin'] });
      qc.invalidateQueries({ queryKey: ['subscription-payments'] });
      setAssignShopId('');
      setAssignPlanId('');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      subscriptionPaymentsApi.markPaid(id, { payment_method: payMethod || undefined, reference: payRef || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-payments'] });
      qc.invalidateQueries({ queryKey: ['subscriptions-admin'] });
      setMarkingId(null);
      setPayMethod('');
      setPayRef('');
    },
  });

  const overduePayments = payments.filter(p => p.status === 'pending' && new Date(p.due_date) < new Date());
  const pendingPayments  = payments.filter(p => p.status === 'pending');
  const paidTotal        = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-8">
      {/* ── Plan Management ──────────────────────────────────────── */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Subscription Plans</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetchPlans()}><RefreshCw size={15} /></Button>
            <Button
              size="sm"
              onClick={() => {
                if (showPlanForm && !editingPlan) { cancelPlanForm(); return; }
                setEditingPlan(null);
                setPlanForm(BLANK_PLAN_FORM);
                setShowPlanForm(true);
              }}
            >
              <Plus size={14} className="mr-1" /> New Plan
            </Button>
          </div>
        </div>

        {/* Create / edit form */}
        {showPlanForm && (
          <div className="p-4 border-b bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              {editingPlan ? `Editing: ${editingPlan.name}` : 'Create new plan'}
            </p>
            <form className="flex gap-3 flex-wrap items-end" onSubmit={handlePlanSubmit}>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <input
                  className="border rounded-lg px-3 py-2 text-sm bg-background w-36"
                  placeholder="e.g. Starter"
                  value={planForm.name}
                  onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Price / mo ($)</label>
                <input
                  type="number" step="0.01" min="0"
                  className="border rounded-lg px-3 py-2 text-sm bg-background w-28"
                  placeholder="29.00"
                  value={planForm.price}
                  onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Max Branches</label>
                <input
                  type="number" min="1"
                  className="border rounded-lg px-3 py-2 text-sm bg-background w-28"
                  value={planForm.max_branches}
                  onChange={e => setPlanForm(f => ({ ...f, max_branches: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Max Staff</label>
                <input
                  type="number" min="1"
                  className="border rounded-lg px-3 py-2 text-sm bg-background w-24"
                  value={planForm.max_staff}
                  onChange={e => setPlanForm(f => ({ ...f, max_staff: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                >
                  {editingPlan
                    ? (updatePlanMutation.isPending ? 'Saving…' : 'Save Changes')
                    : (createPlanMutation.isPending ? 'Creating…' : 'Create Plan')}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={cancelPlanForm}>Cancel</Button>
              </div>
            </form>
            {(createPlanMutation.isError || updatePlanMutation.isError) && (
              <p className="text-xs text-destructive mt-2">
                {((createPlanMutation.error || updatePlanMutation.error) as Error)?.message}
              </p>
            )}
          </div>
        )}

        {/* Plans table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Name', 'Price / mo', 'Max Branches', 'Max Staff', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => (
                <tr key={plan.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{plan.name}</td>
                  <td className="px-4 py-3 font-mono">{formatMoney(plan.price)}</td>
                  <td className="px-4 py-3">{plan.max_branches >= 999 ? 'Unlimited' : plan.max_branches}</td>
                  <td className="px-4 py-3">{plan.max_staff >= 999 ? 'Unlimited' : plan.max_staff}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2"
                        title="Edit"
                        onClick={() => startEditPlan(plan)}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground"
                        title={plan.is_active ? 'Deactivate' : 'Activate'}
                        disabled={updatePlanMutation.isPending}
                        onClick={() => updatePlanMutation.mutate({ id: plan.id, data: { is_active: !plan.is_active } })}
                      >
                        {plan.is_active ? <X size={13} /> : <Check size={13} />}
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                        title="Delete"
                        disabled={deletePlanMutation.isPending}
                        onClick={() => deletePlanMutation.mutate(plan.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No plans yet — create one above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Subscriptions', value: subscriptions.filter(s => s.status === 'active').length, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Pending Invoices',     value: pendingPayments.length,  icon: Clock,          color: 'text-yellow-600' },
          { label: 'Overdue',              value: overduePayments.length,  icon: AlertTriangle,  color: 'text-red-600' },
          { label: 'Revenue Collected',    value: formatMoney(paidTotal),  icon: DollarSign,     color: 'text-primary' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className={`mb-1 ${color}`}><Icon size={20} /></div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Assign / change plan */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Assign Plan to Shop</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[140px] bg-background"
            placeholder="Shop ID"
            value={assignShopId}
            onChange={e => setAssignShopId(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px] bg-background"
            value={assignPlanId}
            onChange={e => setAssignPlanId(e.target.value)}
          >
            <option value="">Select plan…</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.price)}/mo</option>
            ))}
          </select>
          <Button
            disabled={!assignShopId || !assignPlanId || assignMutation.isPending}
            onClick={() => assignMutation.mutate({ shop_id: Number(assignShopId), plan_id: Number(assignPlanId) })}
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign'}
          </Button>
        </div>
        {assignMutation.isError && (
          <p className="text-xs text-destructive mt-2">{(assignMutation.error as Error).message}</p>
        )}
      </div>

      {/* Subscriptions table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Subscriptions</h2>
          <Button variant="ghost" size="icon" onClick={() => refetchSubs()}><RefreshCw size={15} /></Button>
        </div>
        {subsLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Shop', 'Plan', 'Price/mo', 'Status', 'Next Due', 'Days Left'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{sub.shop_name}</td>
                    <td className="px-4 py-3">{sub.plan_name}</td>
                    <td className="px-4 py-3">{formatMoney(sub.plan_price)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUB_STATUS_BADGE[sub.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(sub.next_due_at)}</td>
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
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No subscriptions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Payment Invoices</h2>
          <Button variant="ghost" size="icon" onClick={() => refetchPayments()}><RefreshCw size={15} /></Button>
        </div>
        {paymentsLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Shop', 'Plan', 'Amount', 'Due Date', 'Status', 'Paid At', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.shop_name}</td>
                    <td className="px-4 py-3">{p.plan_name}</td>
                    <td className="px-4 py-3 font-mono">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3">{formatDate(p.due_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.paid_at ? formatDate(p.paid_at) : '—'}</td>
                    <td className="px-4 py-3">
                      {p.status === 'pending' && (
                        <>
                          {markingId === p.id ? (
                            <div className="flex gap-2 items-center flex-wrap">
                              <input className="border rounded px-2 py-1 text-xs w-24 bg-background" placeholder="Method" value={payMethod} onChange={e => setPayMethod(e.target.value)} />
                              <input className="border rounded px-2 py-1 text-xs w-28 bg-background" placeholder="Reference" value={payRef} onChange={e => setPayRef(e.target.value)} />
                              <Button size="sm" className="text-xs h-7" onClick={() => markPaidMutation.mutate({ id: p.id })} disabled={markPaidMutation.isPending}>
                                {markPaidMutation.isPending ? '…' : 'Confirm'}
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setMarkingId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setMarkingId(p.id)}>
                              Mark Paid
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No payment records yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Owner view ───────────────────────────────────────────────────────────────
function OwnerPayments() {
  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionRow | null>({
    queryKey: ['subscription-owner'],
    queryFn: subscriptionsApi.getOwner,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<SubscriptionPaymentRow[]>({
    queryKey: ['subscription-payments'],
    queryFn: subscriptionPaymentsApi.getAll,
  });

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Plan card */}
      {subLoading ? (
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      ) : subscription ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-xl p-5 col-span-1 md:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Your Plan</p>
                <p className="text-2xl font-bold">{subscription.plan_name}</p>
                <p className="text-sm text-muted-foreground mt-1">{formatMoney(subscription.plan_price)} / month</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${SUB_STATUS_BADGE[subscription.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {subscription.status}
              </span>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar size={16} />
              <span className="text-xs">Next Due</span>
            </div>
            <p className="text-lg font-semibold">{formatDate(subscription.next_due_at)}</p>
            {subscription.days_until_due !== null && (
              <p className={`text-xs mt-1 ${subscription.days_until_due < 0 ? 'text-red-600' : subscription.days_until_due <= 7 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                {subscription.days_until_due < 0
                  ? `${Math.abs(subscription.days_until_due)} days overdue`
                  : subscription.days_until_due === 0
                  ? 'Due today'
                  : `${subscription.days_until_due} days remaining`}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 border border-dashed rounded-xl p-8 text-center text-muted-foreground">
          <CreditCard className="mx-auto mb-2 opacity-40" size={32} />
          <p className="font-medium">No active subscription</p>
          <p className="text-sm mt-1">Contact your system administrator to set up a plan.</p>
        </div>
      )}

      {/* Summary stat */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Payments Made</p>
          <p className="text-2xl font-bold">{paidCount}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
          <p className="text-2xl font-bold">{formatMoney(totalPaid)}</p>
        </div>
      </div>

      {/* Payment history */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Payment History</h2>
        </div>
        {paymentsLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Plan', 'Amount', 'Due Date', 'Paid On', 'Method', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">{p.plan_name}</td>
                    <td className="px-4 py-3 font-mono">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3">{formatDate(p.due_date)}</td>
                    <td className="px-4 py-3">{p.paid_at ? formatDate(p.paid_at) : '—'}</td>
                    <td className="px-4 py-3 capitalize">{p.payment_method ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No payment history yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Payments() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 space-y-6"
      >
        <div className="flex items-center gap-3">
          <CreditCard className="text-primary" size={24} />
          <div>
            <h1 className="text-2xl font-bold">Payments</h1>
            <p className="text-sm text-muted-foreground">
              {user?.role === 'super_admin'
                ? 'Manage subscriptions and invoices for all shops'
                : 'Your subscription plan and payment history'}
            </p>
          </div>
        </div>

        {user?.role === 'super_admin' ? <AdminPayments /> : <OwnerPayments />}
      </motion.div>
    </AppLayout>
  );
}
