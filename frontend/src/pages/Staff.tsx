import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { branchesApi, staffApi, StaffPayload } from '@/services/api';
import { Plus, Edit2, Trash2, Save, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface ApiBranch {
  id: number;
  name: string;
}

interface ApiStaff {
  id: number;
  name: string;
  email: string;
  role?: string;
  branch_id?: number;
  branch?: { id: number; name: string } | null;
}

const Staff = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ApiStaff | null>(null);
  const [form, setForm] = useState<StaffPayload>({ name: '', email: '', password: '', role: 'storekeeper', branch_id: 0 });

  const { data: staff = [], isLoading } = useQuery<ApiStaff[]>({
    queryKey: ['staff'],
    queryFn: () => staffApi.getAll(),
  });

  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['branches'],
    queryFn: () => branchesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: StaffPayload) => staffApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); toast.success('Staff added'); closeDialog(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StaffPayload> }) => staffApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); toast.success('Cashier updated'); closeDialog(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => staffApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); toast.success('Cashier removed'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingStaff(null);
    setForm({ name: '', email: '', password: '', role: 'storekeeper', branch_id: branches[0]?.id ?? 0 });
    setShowDialog(true);
  };
  const openEdit = (s: ApiStaff) => {
    setEditingStaff(s);
    setForm({ name: s.name, email: s.email, password: '', role: s.role, branch_id: s.branch_id ?? 0 });
    setShowDialog(true);
  };
  const closeDialog = () => { setShowDialog(false); setEditingStaff(null); };
  const handleDelete = (s: ApiStaff) => { if (confirm(`Remove cashier "${s.name}"?`)) deleteMutation.mutate(s.id); };
  const set = (key: keyof StaffPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  const submit = () => {
    if (editingStaff) {
      const payload: Partial<StaffPayload> = { name: form.name, email: form.email, branch_id: form.branch_id };
      if (form.password) payload.password = form.password;
      updateMutation.mutate({ id: editingStaff.id, data: payload });
    } else {
      createMutation.mutate(form);
    }
  };
  const isPending = createMutation.isPending || updateMutation.isPending;

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.branch?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Staff</h1>
            <p className="text-sm text-muted-foreground">
              {staff.length} staff
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Cashier
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or branch…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            {staff.length === 0 ? 'No cashiers yet. Add your first cashier.' : 'No results found.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card rounded-xl flex items-center gap-4 p-4"
              >
                <div className="w-10 h-10 rounded-full pos-gradient flex items-center justify-center shrink-0 text-sm font-bold text-white">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {s.email}
                    {s.branch && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                        {s.branch.name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEdit(s)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit staff' : 'Add staff'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Amina Hassan" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={set('email')} placeholder="cashier@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>{editingStaff ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
              <Input
                type="password"
                value={form.password ?? ''}
                onChange={set('password')}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Desk *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.role || 'storekeeper'}
                onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="storekeeper">Storekeeper</option>
                <option value="receptionist">Hotel reception</option>
                <option value="bar">Bar</option>
                <option value="fnb">Restaurant & BBQ</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              {branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No branches found. Add a branch in Settings first.
                </p>
              ) : (
                <Select
                  value={String(form.branch_id || '')}
                  onValueChange={v => setForm(prev => ({ ...prev, branch_id: Number(v) }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select branch…" /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={closeDialog}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button onClick={submit} disabled={isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {isPending ? 'Saving…' : editingStaff ? 'Update' : 'Add staff'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Staff;
