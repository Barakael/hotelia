import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi, roomsApi } from '@/services/api';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const Services = () => {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    service_type_id: '',
    party_name: '',
    phone: '',
    starts_at: new Date().toISOString().slice(0, 16),
    amount: '',
    payment_method: 'cash',
    folio_id: '',
  });

  const { data: types = [] } = useQuery({
    queryKey: ['service-types'],
    queryFn: servicesApi.getTypes,
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['service-bookings'],
    queryFn: servicesApi.getBookings,
  });

  const { data: occupied = [] } = useQuery({
    queryKey: ['occupied-rooms'],
    queryFn: roomsApi.occupiedWithFolios,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        service_type_id: Number(form.service_type_id),
        party_name: form.party_name,
        phone: form.phone || undefined,
        starts_at: form.starts_at,
        payment_method: form.payment_method,
      };
      if (form.amount) payload.amount = Number(form.amount);
      if (form.payment_method === 'room') payload.folio_id = Number(form.folio_id);
      return servicesApi.createBooking(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-bookings'] });
      setShow(false);
      toast.success('Service booked');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Conference & Shuttle</h1>
            <p className="text-sm text-muted-foreground">Book and bill hotel services</p>
          </div>
          <Button onClick={() => setShow(true)}><Plus className="w-4 h-4 mr-1" /> New booking</Button>
        </div>

        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2.5">Service</th>
                <th className="px-4 py-2.5">Party</th>
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {bookings.map((b: any) => (
                <tr key={b.id} className="border-b border-border/40">
                  <td className="px-4 py-2.5">{b.service_type?.name}</td>
                  <td className="px-4 py-2.5">{b.party_name}</td>
                  <td className="px-4 py-2.5 text-xs">{new Date(b.starts_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5">{formatCurrency(b.amount)}</td>
                  <td className="px-4 py-2.5 capitalize">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={show} onOpenChange={setShow}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book service</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Service</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.service_type_id}
                onChange={e => {
                  const t = types.find((x: any) => String(x.id) === e.target.value);
                  setForm(f => ({
                    ...f,
                    service_type_id: e.target.value,
                    amount: t ? String(t.default_price) : f.amount,
                  }));
                }}
              >
                <option value="">Select…</option>
                {types.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Party name</Label>
              <Input value={form.party_name} onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))} />
            </div>
            <div>
              <Label>Starts at</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Payment</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              >
                <option value="cash">Cash</option>
                <option value="mobile">Mobile</option>
                <option value="card">Card</option>
                <option value="room">Charge to room</option>
              </select>
            </div>
            {form.payment_method === 'room' && (
              <div>
                <Label>Occupied room</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.folio_id}
                  onChange={e => setForm(f => ({ ...f, folio_id: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {occupied.map((r: any) => (
                    <option key={r.folio_id} value={r.folio_id}>
                      Room {r.number} — {r.guest_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.service_type_id || !form.party_name}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Services;
