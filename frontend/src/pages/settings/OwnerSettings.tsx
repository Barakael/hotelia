import { useState, useEffect } from 'react';
import { Branch } from '@/types';
import { myShopApi, ShopUpdatePayload, BranchPayload, StaffPayload } from '@/services/api';
import {
  Store, GitBranch, Users, Save, X, Plus, Edit2, Trash2,
  MapPin, Phone, Mail, RefreshCw, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiShop {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  branches_count?: number;
  staff_count?: number;
}

interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
  branch_id: number | null;
  branch?: { id: number; name: string } | null;
  created_at: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

const OwnerSettings = () => {
  const queryClient = useQueryClient();

  // ── Shop overview form ────────────────────────────────────────────────────
  const [shopForm, setShopForm] = useState<ShopUpdatePayload>({
    name: '', address: '', phone: '', email: '',
  });

  // ── Branch dialog ─────────────────────────────────────────────────────────
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState<BranchPayload>({ name: '', address: '', phone: '' });

  // ── Staff dialog ──────────────────────────────────────────────────────────
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [staffForm, setStaffForm] = useState<StaffPayload>({ name: '', email: '', password: '', branch_id: null });
  const [showPassword, setShowPassword] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: myShop, isLoading: shopLoading, isError: shopError } = useQuery<ApiShop>({
    queryKey: ['my-shop'],
    queryFn: () => myShopApi.get(),
    retry: false,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['my-shop-branches'],
    queryFn: () => myShopApi.getBranches(),
    enabled: !!myShop,
  });

  const { data: staff = [] } = useQuery<StaffUser[]>({
    queryKey: ['my-shop-staff'],
    queryFn: () => myShopApi.getStaff(),
    enabled: !!myShop,
  });

  // Sync shop form when data loads
  useEffect(() => {
    if (myShop) {
      setShopForm({
        name: myShop.name,
        address: myShop.address ?? '',
        phone: myShop.phone ?? '',
        email: myShop.email ?? '',
      });
    }
  }, [myShop]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateShop = useMutation({
    mutationFn: (data: ShopUpdatePayload) => myShopApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] });
      toast.success('Shop details saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createBranch = useMutation({
    mutationFn: (data: BranchPayload) => myShopApi.createBranch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop-branches'] });
      toast.success('Branch added');
      setShowBranchDialog(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateBranch = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BranchPayload> }) =>
      myShopApi.updateBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop-branches'] });
      toast.success('Branch updated');
      setShowBranchDialog(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteBranch = useMutation({
    mutationFn: (id: number) => myShopApi.deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop-branches', 'my-shop-staff'] });
      toast.success('Branch deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createStaff = useMutation({
    mutationFn: (data: StaffPayload) => myShopApi.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop-staff'] });
      toast.success('Cashier added');
      setShowStaffDialog(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStaff = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StaffPayload> }) =>
      myShopApi.updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop-staff'] });
      toast.success('Cashier updated');
      setShowStaffDialog(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteStaff = useMutation({
    mutationFn: (id: number) => myShopApi.deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop-staff'] });
      toast.success('Staff member removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Branch helpers ────────────────────────────────────────────────────────
  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({ name: '', address: '', phone: '' });
    setShowBranchDialog(true);
  };

  const openEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setBranchForm({ name: b.name, address: b.address ?? '', phone: b.phone ?? '' });
    setShowBranchDialog(true);
  };

  const saveBranch = () => {
    if (!branchForm.name) { toast.error('Branch name is required'); return; }
    if (editingBranch) {
      updateBranch.mutate({ id: editingBranch.id, data: branchForm });
    } else {
      createBranch.mutate(branchForm);
    }
  };

  // ── Staff helpers ─────────────────────────────────────────────────────────
  const openAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({ name: '', email: '', password: '', branch_id: null });
    setShowPassword(false);
    setShowStaffDialog(true);
  };

  const openEditStaff = (s: StaffUser) => {
    setEditingStaff(s);
    setStaffForm({ name: s.name, email: s.email, password: '', branch_id: s.branch_id });
    setShowPassword(false);
    setShowStaffDialog(true);
  };

  const saveStaff = () => {
    if (!staffForm.name || !staffForm.email) { toast.error('Name and email are required'); return; }
    if (!editingStaff && !staffForm.password) { toast.error('Password is required for new staff'); return; }

    if (editingStaff) {
      const payload: Partial<StaffPayload> = { name: staffForm.name, email: staffForm.email, branch_id: staffForm.branch_id };
      if (staffForm.password) payload.password = staffForm.password;
      updateStaff.mutate({ id: editingStaff.id, data: payload });
    } else {
      createStaff.mutate(staffForm);
    }
  };

  // ── No shop state ─────────────────────────────────────────────────────────
  if (shopLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading your shop…
      </div>
    );
  }

  if (shopError || !myShop) {
    return (
      <Card className="max-w-md">
        <CardContent className="pt-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">No shop linked to your account</p>
            <p className="text-sm text-muted-foreground mt-1">
              A super admin needs to register your shop and assign you as the owner first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isBranchBusy = createBranch.isPending || updateBranch.isPending;
  const isStaffBusy = createStaff.isPending || updateStaff.isPending;

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview" className="gap-2">
          <Store className="w-4 h-4" /> My Shop
        </TabsTrigger>
        <TabsTrigger value="branches" className="gap-2">
          <GitBranch className="w-4 h-4" /> Branches
          {branches.length > 0 && (
            <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{branches.length}</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="staff" className="gap-2">
          <Users className="w-4 h-4" /> Staff
          {staff.length > 0 && (
            <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{staff.length}</span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ─── Overview Tab ─────────────────────────────────────────────────── */}
      <TabsContent value="overview" className="space-y-4 max-w-lg">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <GitBranch className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xl font-bold text-foreground">{myShop.branches_count ?? branches.length}</p>
                <p className="text-xs text-muted-foreground">Branches</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <Users className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xl font-bold text-foreground">{myShop.staff_count ?? staff.length}</p>
                <p className="text-xs text-muted-foreground">Cashiers</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="w-4 h-4" /> Shop Details
            </CardTitle>
            <CardDescription>Update your shop's public information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="shop_name">Shop Name</Label>
              <Input
                id="shop_name"
                value={shopForm.name ?? ''}
                onChange={e => setShopForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shop_address" className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Address
              </Label>
              <Input
                id="shop_address"
                value={shopForm.address ?? ''}
                onChange={e => setShopForm(p => ({ ...p, address: e.target.value }))}
                placeholder="e.g. Samora Ave, Dar es Salaam"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shop_phone" className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </Label>
                <Input
                  id="shop_phone"
                  value={shopForm.phone ?? ''}
                  onChange={e => setShopForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+255 712 000 000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shop_email" className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <Input
                  id="shop_email"
                  type="email"
                  value={shopForm.email ?? ''}
                  onChange={e => setShopForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="shop@email.com"
                />
              </div>
            </div>
            <Button
              onClick={() => updateShop.mutate(shopForm)}
              disabled={updateShop.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {updateShop.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Branches Tab ─────────────────────────────────────────────────── */}
      <TabsContent value="branches" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {branches.length} branch{branches.length !== 1 ? 'es' : ''}
          </p>
          <Button onClick={openAddBranch} className="gap-2">
            <Plus className="w-4 h-4" /> Add Branch
          </Button>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Branch Name</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Address</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Phone</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Staff</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch, i) => (
                  <motion.tr
                    key={branch.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-sm font-medium text-foreground">{branch.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{branch.address || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{branch.phone || '—'}</td>
                    <td className="px-4 py-3 text-center text-sm text-foreground font-medium">
                      {branch.staff_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditBranch(branch)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete branch "${branch.name}"?`)) deleteBranch.mutate(branch.id);
                          }}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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
          {branches.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No branches yet. Add your first branch above.
            </div>
          )}
        </div>
      </TabsContent>

      {/* ─── Staff Tab ────────────────────────────────────────────────────── */}
      <TabsContent value="staff" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {staff.length} cashier{staff.length !== 1 ? 's' : ''}
          </p>
          <Button onClick={openAddStaff} className="gap-2">
            <Plus className="w-4 h-4" /> Add Cashier
          </Button>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Cashier</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Branch</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Joined</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Users className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.email}</td>
                    <td className="px-4 py-3">
                      {s.branch ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          <GitBranch className="w-3 h-3" />{s.branch.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditStaff(s)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove "${s.name}" from your shop?`)) deleteStaff.mutate(s.id);
                          }}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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
          {staff.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No cashiers yet. Add your first staff member above.
            </div>
          )}
        </div>
      </TabsContent>

      {/* ─── Branch Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Branch Name *</Label>
              <Input
                value={branchForm.name}
                onChange={e => setBranchForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Dodoma Branch"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={branchForm.address ?? ''}
                onChange={e => setBranchForm(p => ({ ...p, address: e.target.value }))}
                placeholder="e.g. Jamatini Rd, Dodoma"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={branchForm.phone ?? ''}
                onChange={e => setBranchForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+255 712 000 000"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowBranchDialog(false)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button onClick={saveBranch} disabled={isBranchBusy} className="gap-2">
                <Save className="w-4 h-4" />
                {isBranchBusy ? 'Saving…' : editingBranch ? 'Update Branch' : 'Add Branch'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Staff Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Cashier' : 'Add New Cashier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                value={staffForm.name}
                onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Fatima Said"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={staffForm.email}
                onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))}
                placeholder="fatima@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select
                value={staffForm.branch_id != null ? String(staffForm.branch_id) : 'none'}
                onValueChange={v => setStaffForm(p => ({ ...p, branch_id: v === 'none' ? null : Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned —</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {branches.length === 0 && (
                <p className="text-xs text-muted-foreground">Add branches first to assign staff to them.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                {editingStaff ? 'New Password' : 'Password *'}
                {editingStaff && (
                  <span className="ml-1 text-xs text-muted-foreground">(leave blank to keep current)</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={staffForm.password ?? ''}
                  onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))}
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
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowStaffDialog(false)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button onClick={saveStaff} disabled={isStaffBusy} className="gap-2">
                <Save className="w-4 h-4" />
                {isStaffBusy ? 'Saving…' : editingStaff ? 'Update Cashier' : 'Add Cashier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default OwnerSettings;
