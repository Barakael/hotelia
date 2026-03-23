import { useState, useEffect } from 'react';
import { Shop } from '@/types';
import { shopsApi, ShopCreatePayload, ShopUpdatePayload, settingsApi } from '@/services/api';
import {
  Building2, Plus, Edit2, Trash2, Users, GitBranch, Save, X, Store,
  Phone, Mail, MapPin, Percent, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// ─── Register / Edit Shop form ────────────────────────────────────────────────

const emptyCreate: ShopCreatePayload = {
  name: '', address: '', phone: '', email: '',
  owner_name: '', owner_email: '', owner_password: '',
};

const emptyUpdate: ShopUpdatePayload = { name: '', address: '', phone: '', email: '' };

// ─── Main component ───────────────────────────────────────────────────────────

const AdminSettings = () => {
  const queryClient = useQueryClient();

  // Shops state
  const [showRegister, setShowRegister] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [createForm, setCreateForm] = useState<ShopCreatePayload>(emptyCreate);
  const [editForm, setEditForm] = useState<ShopUpdatePayload>(emptyUpdate);
  const [showPassword, setShowPassword] = useState(false);

  // System settings state
  const [sysForm, setSysForm] = useState({ currency: 'TZS' });

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: shops = [], isLoading: shopsLoading } = useQuery<Shop[]>({
    queryKey: ['shops'],
    queryFn: () => shopsApi.getAll(),
  });

  const { data: sysSettings } = useQuery<Record<string, string>>({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll(),
  });

  useEffect(() => {
    if (sysSettings) {
      setSysForm({
        currency: sysSettings.currency ?? 'TZS',
      });
    }
  }, [sysSettings]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createShop = useMutation({
    mutationFn: (data: ShopCreatePayload) => shopsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      toast.success('Shop registered');
      setShowRegister(false);
      setCreateForm(emptyCreate);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateShop = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShopUpdatePayload }) => shopsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      toast.success('Shop updated');
      setEditingShop(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteShop = useMutation({
    mutationFn: (id: number) => shopsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      toast.success('Shop deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveSettings = useMutation({
    mutationFn: (data: typeof sysForm) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('System settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (shop: Shop) => {
    setEditingShop(shop);
    setEditForm({ name: shop.name, address: shop.address ?? '', phone: shop.phone ?? '', email: shop.email ?? '' });
  };

  const handleDelete = (shop: Shop) => {
    if (confirm(`Delete shop "${shop.name}"? All branches and staff will be removed.`)) {
      deleteShop.mutate(shop.id);
    }
  };

  const handleSaveSettings = () => {
    saveSettings.mutate(sysForm);
  };

  return (
    <Tabs defaultValue="shops" className="space-y-6">
      <TabsList>
        <TabsTrigger value="shops" className="gap-2">
          <Building2 className="w-4 h-4" /> Shops
        </TabsTrigger>
        <TabsTrigger value="system" className="gap-2">
          <Percent className="w-4 h-4" /> System Settings
        </TabsTrigger>
      </TabsList>

      {/* ─── Shops Tab ──────────────────────────────────────────────────────── */}
      <TabsContent value="shops" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {shops.length} shop{shops.length !== 1 ? 's' : ''} registered
          </p>
          <Button onClick={() => setShowRegister(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Register Shop
          </Button>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Shop</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Owner</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Contact</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Branches</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Staff</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shopsLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading…
                    </td>
                  </tr>
                ) : shops.map((shop, i) => (
                  <motion.tr
                    key={shop.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                          <Store className="w-4 h-4 text-accent-foreground" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{shop.name}</div>
                          {shop.address && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{shop.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {shop.owner ? (
                        <div>
                          <div className="text-sm font-medium text-foreground">{shop.owner.name}</div>
                          <div className="text-xs text-muted-foreground">{shop.owner.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No owner</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <div className="space-y-0.5">
                        {shop.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{shop.phone}</div>}
                        {shop.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{shop.email}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                        <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                        {shop.branches_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {shop.staff_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(shop)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit shop"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(shop)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete shop"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {!shopsLoading && shops.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No shops registered yet. Click "Register Shop" to add one.
            </div>
          )}
        </div>
      </TabsContent>

      {/* ─── System Settings Tab ─────────────────────────────────────────────── */}
      <TabsContent value="system" className="space-y-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Currency Settings
            </CardTitle>
            <CardDescription>Default currency for new shops</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sys_currency">Currency Code</Label>
              <Input
                id="sys_currency"
                value={sysForm.currency}
                onChange={e => setSysForm(p => ({ ...p, currency: e.target.value }))}
                placeholder="TZS"
                maxLength={10}
              />
            </div>
            <Button onClick={handleSaveSettings} disabled={saveSettings.isPending} className="gap-2">
              <Save className="w-4 h-4" />
              {saveSettings.isPending ? 'Saving…' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Register Shop Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Shop</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Shop details */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shop Details</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Shop Name *</Label>
                  <Input
                    value={createForm.name}
                    onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Kilimani Supermarket"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    value={createForm.address}
                    onChange={e => setCreateForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="e.g. Kilimani Rd, Nairobi"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      value={createForm.phone}
                      onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+255 712 000 000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={createForm.email}
                      onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="shop@email.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Owner account */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Owner Account</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Owner Full Name *</Label>
                  <Input
                    value={createForm.owner_name}
                    onChange={e => setCreateForm(p => ({ ...p, owner_name: e.target.value }))}
                    placeholder="e.g. Ahmed Hassan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Owner Email *</Label>
                  <Input
                    type="email"
                    value={createForm.owner_email}
                    onChange={e => setCreateForm(p => ({ ...p, owner_email: e.target.value }))}
                    placeholder="owner@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={createForm.owner_password}
                      onChange={e => setCreateForm(p => ({ ...p, owner_password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowRegister(false)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button
                onClick={() => createShop.mutate(createForm)}
                disabled={createShop.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {createShop.isPending ? 'Registering…' : 'Register Shop'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Shop Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!editingShop} onOpenChange={open => { if (!open) setEditingShop(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shop — {editingShop?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Shop Name</Label>
              <Input value={editForm.name ?? ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={editForm.address ?? ''} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editForm.phone ?? ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editForm.email ?? ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setEditingShop(null)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button
                onClick={() => editingShop && updateShop.mutate({ id: editingShop.id, data: editForm })}
                disabled={updateShop.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateShop.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default AdminSettings;
