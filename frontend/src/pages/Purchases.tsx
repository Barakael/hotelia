import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi, suppliersApi } from '@/services/api';
import { useStore } from '@/contexts/StoreContext';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, PackageCheck } from 'lucide-react';

const Purchases = () => {
  const qc = useQueryClient();
  const { products } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [lines, setLines] = useState<{ product_id: number; qty: number; unit_cost: number; name: string }[]>([]);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '' });
  const [showSupplier, setShowSupplier] = useState(false);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: purchasesApi.getAll,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: suppliersApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setShowForm(false);
      setLines([]);
      toast.success('Purchase created (draft)');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const receiveMutation = useMutation({
    mutationFn: purchasesApi.receive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock received');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSupplierMutation = useMutation({
    mutationFn: () => suppliersApi.create(newSupplier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setShowSupplier(false);
      setNewSupplier({ name: '', phone: '' });
      toast.success('Supplier added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addLine = () => {
    const p = products.find(x => x.id === productId);
    if (!p || qty < 1) return;
    setLines(prev => [...prev, { product_id: Number(p.id), qty, unit_cost: unitCost, name: p.name }]);
    setProductId('');
    setQty(1);
    setUnitCost(0);
  };

  const submit = () => {
    if (!supplierId || lines.length === 0) {
      toast.error('Select supplier and add items');
      return;
    }
    createMutation.mutate({
      supplier_id: Number(supplierId),
      items: lines.map(({ product_id, qty, unit_cost }) => ({ product_id, qty, unit_cost })),
    });
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Purchases (Manunuzi)</h1>
            <p className="text-sm text-muted-foreground">Receive stock from suppliers</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowSupplier(true)}>Add supplier</Button>
            <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New purchase</Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Supplier</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && purchases.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No purchases yet</td></tr>
              )}
              {purchases.map((p: any) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="px-4 py-2.5 font-mono">{p.id}</td>
                  <td className="px-4 py-2.5">{p.supplier?.name}</td>
                  <td className="px-4 py-2.5">{formatCurrency(p.total)}</td>
                  <td className="px-4 py-2.5">
                    <span className={p.status === 'received' ? 'text-[#007AAD]' : 'text-muted-foreground'}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {p.status === 'draft' && (
                      <Button size="sm" onClick={() => receiveMutation.mutate(p.id)}>
                        <PackageCheck className="w-3.5 h-3.5 mr-1" /> Receive
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New purchase</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Supplier</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">Select…</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 sm:col-span-1">
                <Label>Product</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Qty</Label>
                <Input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} />
              </div>
              <div>
                <Label>Unit cost</Label>
                <Input type="number" min={0} value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} />
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={addLine}>Add line</Button>
            {lines.length > 0 && (
              <ul className="text-sm space-y-1 border rounded-md p-2">
                {lines.map((l, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{l.name} × {l.qty}</span>
                    <span>{formatCurrency(l.qty * l.unit_cost)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button onClick={submit} disabled={createMutation.isPending}>Save draft</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSupplier} onOpenChange={setShowSupplier}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add supplier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={newSupplier.name} onChange={e => setNewSupplier(s => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={newSupplier.phone} onChange={e => setNewSupplier(s => ({ ...s, phone: e.target.value }))} />
            </div>
            <Button onClick={() => addSupplierMutation.mutate()} disabled={!newSupplier.name}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Purchases;
