import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, UserPayload } from '@/services/api';
import { UserRole } from '@/types';
import { Search, Plus, Edit2, Trash2, Users as UsersIcon, Save, X, ShieldCheck, Store, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

const emptyForm: UserPayload = { name: '', email: '', role: 'cashier', password: '' };

const roleConfig: Record<UserRole, { label: string; className: string; Icon: React.FC<{ className?: string }> }> = {
  super_admin: { label: 'Super Admin', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', Icon: ShieldCheck },
  owner:       { label: 'Owner',       className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',     Icon: Store },
  cashier:     { label: 'Cashier',     className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', Icon: User },
};

const Users = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [form, setForm] = useState<UserPayload>(emptyForm);

  const { data: users = [], isLoading } = useQuery<ApiUser[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: UserPayload) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserPayload> }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (u: ApiUser) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, password: '' });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.email || !form.role) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!editingUser && !form.password) {
      toast.error('Password is required for new users');
      return;
    }

    if (editingUser) {
      const payload: Partial<UserPayload> = { name: form.name, email: form.email, role: form.role };
      if (form.password) payload.password = form.password;
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (u: ApiUser) => {
    if (confirm(`Delete user "${u.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(u.id);
    }
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
            <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Add User
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Joined</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">Loading…</td>
                  </tr>
                ) : filtered.map((u, i) => {
                  const { label, className, Icon } = roleConfig[u.role] ?? roleConfig.cashier;
                  const isSelf = u.id === Number(currentUser?.id);
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                            <UsersIcon className="w-4 h-4 text-accent-foreground" />
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {u.name}
                            {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${className}`}>
                          <Icon className="w-3 h-3" />
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Edit user"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isSelf}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No users found</div>
          )}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={v => setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{editingUser ? 'New Password' : 'Password'} {editingUser && <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}</Label>
              <Input
                type="password"
                value={form.password ?? ''}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={isBusy} className="gap-2">
                <Save className="w-4 h-4" />
                {isBusy ? 'Saving…' : editingUser ? 'Update User' : 'Add User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Users;
