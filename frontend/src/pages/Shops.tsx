import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { shopsApi, ShopPayload, ShopUpdatePayload } from '@/services/api';
import { Search, Plus, Edit2, Trash2, Store, Users, GitBranch, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ApiShop {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  currency: string;
  branches_count: number;
  staff_count: number;
  owner?: { id: number; name: string; email: string } | null;
  created_at?: string;
}

const emptyRegisterForm: ShopPayload = {
  name: '', address: '', phone: '', email: '', currency: 'TZS',
  owner_name: '', owner_email: '', owner_password: '',
};

const emptyEditForm: ShopUpdatePayload = {
  name: '', address: '', phone: '', email: '', currency: 'TZS',
};

const Shops = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [editingShop, setEditingShop] = useState<ApiShop | null>(null);
  const [registerForm, setRegisterForm] = useState<ShopPayload>(emptyRegisterForm);
  const [editForm, setEditForm] = useState<ShopUpdatePayload>(emptyEditForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: shops = [], isLoading } = useQuery<ApiShop[]>({
    queryKey: ['shops'],
    queryFn: () => shopsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: ShopPayload) => shopsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      toast.success('Shop registered successfully');
      setShowRegister(false);
      setRegisterForm(emptyRegisterForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShopUpdatePayload }) => shopsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      toast.success('Shop updated');
      setEditingShop(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => shopsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      toast.success('Shop deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = shops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.owner?.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase() ?? '')
  );

  const openEdit = (shop: ApiShop) => {
    setEditingShop(shop);
    setEditForm({
      name: shop.name, address: shop.address ?? '', phone: shop.phone ?? '',
      email: shop.email ?? '', currency: shop.currency,
    });
  };

  const handleDelete = (shop: ApiShop) => {
    if (confirm(`Delete shop "${shop.name}" and all its data? This cannot be undone.`)) {
      deleteMutation.mutate(shop.id);
    }
  };

  const setReg = (key: keyof ShopPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRegisterForm(prev => ({ ...prev, [key]: e.target.value }));

  const setEdit = (key: keyof ShopUpdatePayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Shops</h1>
            <p className="text-sm text-muted-foreground">
              {shops.length} registered shop{shops.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setShowRegister(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Register Shop
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search shops or owners…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Shop Cards */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No shops found</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((shop, i) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card rounded-xl overflow-hidden"
              >
                {/* Main row */}
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg pos-gradient flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{shop.name}</span>
                      
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Owner: <span className="font-medium">{shop.owner?.name ?? '—'}</span>
                      {shop.email && <span className="ml-2">{shop.email}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3.5 h-3.5" /> {shop.branches_count} branch{shop.branches_count !== 1 ? 'es' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {shop.staff_count} cashier{shop.staff_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button onClick={() => openEdit(shop)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(shop)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === shop.id ? null : shop.id)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                    >
                      {expandedId === shop.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {expandedId === shop.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Address</div>
                          <div className="text-foreground">{shop.address || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Phone</div>
                          <div className="text-foreground">{shop.phone || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Owner Email</div>
                          <div className="text-foreground">{shop.owner?.email || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Registered</div>
                          <div className="text-foreground">
                            {shop.created_at ? new Date(shop.created_at).toLocaleDateString() : '—'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Register Shop Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Shop</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Shop details section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Shop Details</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Shop Name *</Label>
                  <Input value={registerForm.name} onChange={setReg('name')} placeholder="e.g. Baraka Supermarket" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={registerForm.phone as string} onChange={setReg('phone')} placeholder="+255 712 345 678" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={registerForm.email as string} onChange={setReg('email')} placeholder="shop@email.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={registerForm.address as string} onChange={setReg('address')} placeholder="e.g. Kariakoo, Dar es Salaam" />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input value={registerForm.currency as string} onChange={setReg('currency')} placeholder="TZS" maxLength={10} />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Owner Account</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Owner Full Name *</Label>
                  <Input value={registerForm.owner_name} onChange={setReg('owner_name')} placeholder="e.g. John Mwamba" />
                </div>
                <div className="space-y-1.5">
                  <Label>Owner Email *</Label>
                  <Input type="email" value={registerForm.owner_email} onChange={setReg('owner_email')} placeholder="owner@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <Input type="password" value={registerForm.owner_password} onChange={setReg('owner_password')} placeholder="••••••••" autoComplete="new-password" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowRegister(false)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(registerForm)}
                disabled={createMutation.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {createMutation.isPending ? 'Registering…' : 'Register Shop'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Shop Dialog */}
      <Dialog open={!!editingShop} onOpenChange={open => !open && setEditingShop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shop — {editingShop?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Shop Name</Label>
              <Input value={editForm.name ?? ''} onChange={setEdit('name')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editForm.phone ?? ''} onChange={setEdit('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editForm.email ?? ''} onChange={setEdit('email')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={editForm.address ?? ''} onChange={setEdit('address')} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={editForm.currency ?? ''} onChange={setEdit('currency')} maxLength={10} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditingShop(null)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button
                onClick={() => editingShop && updateMutation.mutate({ id: editingShop.id, data: editForm })}
                disabled={updateMutation.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Shops;
