import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockIssuesApi, stockMovementsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const Issues = () => {
  const { user } = useAuth();
  const { products } = useStore();
  const qc = useQueryClient();
  const canIssue = user?.role === 'owner' || user?.role === 'storekeeper';
  const [show, setShow] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [note, setNote] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [lines, setLines] = useState<{ product_id: number; qty: number; name: string }[]>([]);
  const [countProduct, setCountProduct] = useState('');
  const [counted, setCounted] = useState(0);
  const [countNote, setCountNote] = useState('');

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['stock-issues'],
    queryFn: stockIssuesApi.getAll,
  });

  const { data: outlets = [] } = useQuery({
    queryKey: ['issue-outlets'],
    queryFn: stockIssuesApi.outlets,
    enabled: canIssue,
  });

  const { data: receivers = [] } = useQuery({
    queryKey: ['issue-receivers'],
    queryFn: stockIssuesApi.receivers,
    enabled: canIssue,
  });

  const createMutation = useMutation({
    mutationFn: stockIssuesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-issues'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setShow(false);
      setLines([]);
      toast.success('Issue sent. Waiting for acknowledgment.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ack = useMutation({
    mutationFn: stockIssuesApi.acknowledge,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-issues'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock acknowledged');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: stockIssuesApi.reject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-issues'] });
      toast.success('Issue rejected');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reconcile = useMutation({
    mutationFn: stockMovementsApi.reconcile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setShowCount(false);
      toast.success('Count posted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredReceivers = receivers.filter((r: { role: string }) => {
    const outlet = outlets.find((o: { id: number; outlet_type: string }) => o.id === Number(branchId));
    if (!outlet) return true;
    if (outlet.outlet_type === 'bar') return r.role === 'bar';
    return r.role === 'fnb';
  });

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-black">{canIssue ? 'Stock issues' : 'Incoming stock'}</h1>
            <p className="text-sm text-black/60">
              {canIssue
                ? 'Send stock to a desk. It leaves the store only after they acknowledge.'
                : 'Acknowledge stock assigned to your desk.'}
            </p>
          </div>
          {canIssue && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowCount(true)}>Reconcile</Button>
              <Button onClick={() => setShow(true)}><Plus className="w-4 h-4 mr-1" /> Issue stock</Button>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm text-black">
            <thead>
              <tr className="border-b text-left text-black/60">
                <th className="px-4 py-2.5">To</th>
                <th className="px-4 py-2.5">Receiver</th>
                <th className="px-4 py-2.5">Items</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center">Loading…</td></tr>}
              {issues.map((issue: {
                id: number;
                status: string;
                branch?: { name: string };
                receiver?: { name: string };
                items?: { qty: number; product?: { name: string } }[];
              }) => (
                <tr key={issue.id} className="border-b border-black/5">
                  <td className="px-4 py-2.5">{issue.branch?.name}</td>
                  <td className="px-4 py-2.5">{issue.receiver?.name}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {(issue.items || []).map(i => `${i.product?.name} × ${i.qty}`).join(', ')}
                  </td>
                  <td className="px-4 py-2.5 capitalize">{issue.status}</td>
                  <td className="px-4 py-2.5 text-right space-x-1">
                    {issue.status === 'pending' && !canIssue && (
                      <>
                        <Button size="sm" onClick={() => ack.mutate(issue.id)}>Acknowledge</Button>
                        <Button size="sm" variant="ghost" onClick={() => reject.mutate(issue.id)}>Reject</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={show} onOpenChange={setShow}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue from store</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Outlet</Label>
              <select className="w-full h-10 rounded-md border px-3 text-sm" value={branchId} onChange={e => setBranchId(e.target.value)}>
                <option value="">Select…</option>
                {outlets.map((o: { id: number; name: string }) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Receiver (must acknowledge)</Label>
              <select className="w-full h-10 rounded-md border px-3 text-sm" value={receiverId} onChange={e => setReceiverId(e.target.value)}>
                <option value="">Select…</option>
                {filteredReceivers.map((r: { id: number; name: string; role: string }) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.role})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label>Product</Label>
                <select className="w-full h-10 rounded-md border px-3 text-sm" value={productId} onChange={e => setProductId(e.target.value)}>
                  <option value="">Select sellable…</option>
                  {products.filter(p => p.isSellableTransfer).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.stock} in store)</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Only products marked “Can transfer to outlet stock” appear here. Tools and supplies stay in the store.
                </p>
              </div>
              <div>
                <Label>Qty</Label>
                <Input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} />
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={() => {
              const p = products.find(x => x.id === productId);
              if (!p || !p.isSellableTransfer) {
                toast.error('Only sellable-transfer products can be issued');
                return;
              }
              setLines(prev => [...prev, { product_id: Number(p.id), qty, name: p.name }]);
              setProductId('');
            }}>Add line</Button>
            <ul className="text-sm">
              {lines.map((l, i) => <li key={i}>{l.name} × {l.qty}</li>)}
            </ul>
            <div>
              <Label>Note</Label>
              <Input value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <Button
              disabled={!branchId || !receiverId || lines.length === 0}
              onClick={() => createMutation.mutate({
                to_branch_id: Number(branchId),
                issued_to: Number(receiverId),
                note: note || undefined,
                items: lines.map(({ product_id, qty }) => ({ product_id, qty })),
              })}
            >
              Send for acknowledgment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCount} onOpenChange={setShowCount}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reconcile store count</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Product</Label>
              <select className="w-full h-10 rounded-md border px-3 text-sm" value={countProduct} onChange={e => setCountProduct(e.target.value)}>
                <option value="">Select…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (book {p.stock})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Counted quantity</Label>
              <Input type="number" min={0} value={counted} onChange={e => setCounted(Number(e.target.value))} />
            </div>
            <div>
              <Label>Note</Label>
              <Input value={countNote} onChange={e => setCountNote(e.target.value)} />
            </div>
            <Button
              disabled={!countProduct}
              onClick={() => reconcile.mutate({
                product_id: Number(countProduct),
                counted_qty: counted,
                note: countNote || undefined,
              })}
            >
              Post variance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Issues;
