import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { branchesApi, BranchPayload, OwnerSettingsPayload, settingsApi, subscriptionsApi, subscriptionPaymentsApi, SubscriptionRow, SubscriptionPaymentRow } from '@/services/api';
import { Plus, Edit2, Trash2, Save, X, MapPin, Phone, Mail, Store, GitBranch, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface ApiBranch {
  id: number;
  shop_id: number;
  name: string;
  address?: string;
  phone?: string;
}

interface ApiShopInfo {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  currency: string;
}

// ─── Shop Info Tab ─────────────────────────────────────────────────────────────
function ShopInfoTab() {
  const queryClient = useQueryClient();
  const { data: shop, isLoading } = useQuery<ApiShopInfo>({
    queryKey: ['my-shop'],
    queryFn: () => settingsApi.get(),
  });

  const [form, setForm] = useState<OwnerSettingsPayload>({});
  const [dirty, setDirty] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  if (shop && !hydrated) {
    setForm({ name: shop.name, address: shop.address ?? '', phone: shop.phone ?? '', email: shop.email ?? '', currency: shop.currency });
    setHydrated(true);
  }

  const updateMutation = useMutation({
    mutationFn: (data: OwnerSettingsPayload) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] });
      toast.success('Shop info saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const set = (key: keyof OwnerSettingsPayload) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
    setDirty(true);
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> Shop Name</Label>
        <Input value={form.name ?? ''} onChange={set('name')} placeholder="Your shop name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</Label>
          <Input value={(form.phone as string) ?? ''} onChange={set('phone')} placeholder="+255 712 345 678" />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</Label>
          <Input type="email" value={(form.email as string) ?? ''} onChange={set('email')} placeholder="shop@email.com" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Address</Label>
        <Input value={(form.address as string) ?? ''} onChange={set('address')} placeholder="Street, City" />
      </div>
      <div className="space-y-1.5">
        <Label>Currency</Label>
        <Input value={form.currency ?? 'TZS'} onChange={set('currency')} maxLength={10} placeholder="TZS" />
      </div>
      <Button
        onClick={() => updateMutation.mutate(form)}
        disabled={updateMutation.isPending || !dirty}
        className="gap-2"
      >
        <Save className="w-4 h-4" />
        {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  );
}

// ─── Branches Tab ──────────────────────────────────────────────────────────────
function BranchesTab() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<ApiBranch | null>(null);
  const [form, setForm] = useState<BranchPayload>({ name: '', address: '', phone: '' });

  const { data: branches = [], isLoading } = useQuery<ApiBranch[]>({
    queryKey: ['branches'],
    queryFn: () => branchesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: BranchPayload) => branchesApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); toast.success('Branch added'); closeDialog(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BranchPayload> }) => branchesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); toast.success('Branch updated'); closeDialog(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => branchesApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); toast.success('Branch deleted'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => { setEditingBranch(null); setForm({ name: '', address: '', phone: '' }); setShowDialog(true); };
  const openEdit = (b: ApiBranch) => { setEditingBranch(b); setForm({ name: b.name, address: b.address ?? '', phone: b.phone ?? '' }); setShowDialog(true); };
  const closeDialog = () => { setShowDialog(false); setEditingBranch(null); };
  const handleDelete = (b: ApiBranch) => { if (confirm(`Delete branch "${b.name}"?`)) deleteMutation.mutate(b.id); };
  const set = (key: keyof BranchPayload) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }));
  const submit = () => editingBranch ? updateMutation.mutate({ id: editingBranch.id, data: form }) : createMutation.mutate(form);
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{branches.length} branch{branches.length !== 1 ? 'es' : ''}</p>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Branch</Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Loading…</div>
      ) : branches.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">No branches yet. Add your first branch.</div>
      ) : (
        <div className="space-y-2">
          {branches.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl flex items-center gap-4 p-4"
            >
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{b.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[b.address, b.phone].filter(Boolean).join(' · ') || 'No additional info'}
                </div>
              </div>
              <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(b)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingBranch ? 'Edit Branch' : 'Add Branch'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Branch Name *</Label>
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Dodoma Branch" />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address ?? ''} onChange={set('address')} placeholder="Street, City" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone ?? ''} onChange={set('phone')} placeholder="+255 712 345 678" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={closeDialog}><X className="w-4 h-4 mr-1" /> Cancel</Button>
              <Button onClick={submit} disabled={isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {isPending ? 'Saving…' : editingBranch ? 'Update' : 'Add Branch'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Subscription Tab ─────────────────────────────────────────────────────────
function SubscriptionTab() {
  const { data: subscription } = useQuery<SubscriptionRow | null>({
    queryKey: ['subscription-owner'],
    queryFn: subscriptionsApi.getOwner,
  });
  const { data: paymentHistory = [] } = useQuery<SubscriptionPaymentRow[]>({
    queryKey: ['subscription-payments'],
    queryFn: subscriptionPaymentsApi.getAll,
  });

  return (
    <div className="space-y-6">
      {/* Plan card */}
      {subscription ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-5 col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
            <p className="text-2xl font-bold">{subscription.plan_name}</p>
            <p className="text-sm text-muted-foreground">${subscription.plan_price.toFixed(2)} / month</p>
            <span className={`inline-block mt-3 text-xs px-2 py-0.5 rounded-full font-medium ${
              subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>{subscription.status}</span>
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Next Payment Due</p>
            <p className="text-lg font-bold">
              {subscription.next_due_at
                ? new Date(subscription.next_due_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : '—'}
            </p>
            {subscription.days_until_due !== null && (
              <p className={`text-xs mt-1 ${
                subscription.days_until_due < 0 ? 'text-red-600'
                  : subscription.days_until_due <= 7 ? 'text-yellow-600'
                  : 'text-muted-foreground'
              }`}>
                {subscription.days_until_due < 0
                  ? `${Math.abs(subscription.days_until_due)} days overdue`
                  : subscription.days_until_due === 0
                  ? 'Due today'
                  : `${subscription.days_until_due} days left`}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          No active subscription. Contact your platform administrator.
        </div>
      )}

      {/* Payment history */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Payment History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Due Date</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Paid On</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Method</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">{p.plan_name}</td>
                  <td className="px-4 py-3 font-mono">${p.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">{p.due_date ? new Date(p.due_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 capitalize">{p.payment_method ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'paid'    ? 'bg-green-100 text-green-700' :
                      p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                  </td>
                </tr>
              ))}
              {paymentHistory.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No payment history yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
const Settings = () => {
  const { user } = useAuth();
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your shop details and branches</p>
        </div>

        <Tabs defaultValue="shop" className="space-y-6">
          <TabsList className={`grid w-full ${user?.role === 'owner' ? 'max-w-md grid-cols-3' : 'max-w-sm grid-cols-2'}`}>
            <TabsTrigger value="shop" className="gap-2">
              <Store className="w-4 h-4" /> Shop Info
            </TabsTrigger>
            <TabsTrigger value="branches" className="gap-2">
              <GitBranch className="w-4 h-4" /> Branches
            </TabsTrigger>
            {user?.role === 'owner' && (
              <TabsTrigger value="subscription" className="gap-2">
                <CreditCard className="w-4 h-4" /> Subscription
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="shop">
            <ShopInfoTab />
          </TabsContent>

          <TabsContent value="branches">
            <BranchesTab />
          </TabsContent>

          {user?.role === 'owner' && (
            <TabsContent value="subscription">
              <SubscriptionTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
