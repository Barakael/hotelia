import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi, roomsApi } from '@/services/api';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const Bookings = () => {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    guest_name: '',
    guest_phone: '',
    guest_nationality: '',
    guest_address: '',
    guest_id_type: 'NIDA',
    guest_id_number: '',
    adults: 1,
    children: 0,
    vehicle_plate: '',
    room_id: '',
    check_in_date: new Date().toISOString().slice(0, 10),
    check_out_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    deposit: 0,
  });

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: reservationsApi.getAll,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: () => reservationsApi.create({
      ...form,
      room_id: Number(form.room_id),
      deposit: Number(form.deposit) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      setShow(false);
      toast.success('Reservation created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const action = async (id: number, type: 'check-in' | 'check-out' | 'cancel') => {
    try {
      if (type === 'check-in') await reservationsApi.checkIn(id);
      else if (type === 'check-out') await reservationsApi.checkOut(id, { payment_method: 'cash' });
      else await reservationsApi.cancel(id);
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(type.replace('-', ' ') + ' done');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const availableRooms = rooms.filter((r: any) => ['available', 'cleaning'].includes(r.status));

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Bookings</h1>
            <p className="text-sm text-muted-foreground">Reservations, check-in and check-out</p>
          </div>
          <Button onClick={() => setShow(true)}><Plus className="w-4 h-4 mr-1" /> New booking</Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2.5">Guest</th>
                <th className="px-4 py-2.5">Room</th>
                <th className="px-4 py-2.5">Dates</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Folio</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {reservations.map((r: any) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{r.guest?.name}</p>
                    <p className="text-xs text-muted-foreground">{r.guest?.phone}</p>
                    {r.guest?.id_number && <p className="text-xs text-muted-foreground">{r.guest.id_type}: {r.guest.id_number}</p>}
                  </td>
                  <td className="px-4 py-2.5 font-mono">{r.room?.number}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {r.check_in_date?.slice?.(0, 10) || r.check_in_date}
                    {' → '}
                    {r.check_out_date?.slice?.(0, 10) || r.check_out_date}
                  </td>
                  <td className="px-4 py-2.5 capitalize">{r.status.replace('_', ' ')}</td>
                  <td className="px-4 py-2.5">
                    {r.folio?.id ? (
                      <Link className="text-[#007AAD] underline" to={`/folios/${r.folio.id}`}>
                        #{r.folio.id}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-1">
                    {r.status === 'booked' && (
                      <>
                        <Button size="sm" onClick={() => action(r.id, 'check-in')}>Check in</Button>
                        <Button size="sm" variant="ghost" onClick={() => action(r.id, 'cancel')}>Cancel</Button>
                      </>
                    )}
                    {r.status === 'checked_in' && (
                      <Button size="sm" onClick={() => action(r.id, 'check-out')}>Check out</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={show} onOpenChange={setShow}>
        <DialogContent className="max-w-2xl w-[calc(100%-1.5rem)] max-h-[min(92vh,720px)] overflow-y-auto p-5 sm:p-6 gap-3 top-[50%] translate-y-[-50%]">
          <DialogHeader className="pb-1">
            <DialogTitle>New reservation</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
            <div className="sm:col-span-2">
              <Label>Guest name</Label>
              <Input value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.guest_phone} onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} />
            </div>
            <div>
              <Label>Nationality <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={form.guest_nationality} onChange={e => setForm(f => ({ ...f, guest_nationality: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={form.guest_address} onChange={e => setForm(f => ({ ...f, guest_address: e.target.value }))} />
            </div>
            <div>
              <Label>ID type</Label>
              <Input value={form.guest_id_type} onChange={e => setForm(f => ({ ...f, guest_id_type: e.target.value }))} />
            </div>
            <div>
              <Label>ID number</Label>
              <Input value={form.guest_id_number} onChange={e => setForm(f => ({ ...f, guest_id_number: e.target.value }))} />
            </div>
            <div>
              <Label>Adults</Label>
              <Input type="number" min={1} value={form.adults} onChange={e => setForm(f => ({ ...f, adults: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Children <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="number" min={0} value={form.children} onChange={e => setForm(f => ({ ...f, children: Number(e.target.value) }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Vehicle plate <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={form.vehicle_plate} onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value }))} placeholder="T 123 ABC" />
            </div>
            <div className="sm:col-span-2">
              <Label>Room</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.room_id}
                onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
              >
                <option value="">Select…</option>
                {availableRooms.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.number} — {r.room_type?.name} ({formatCurrency(r.room_type?.base_rate || 0)}/night)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Check-in</Label>
              <Input type="date" value={form.check_in_date} onChange={e => setForm(f => ({ ...f, check_in_date: e.target.value }))} />
            </div>
            <div>
              <Label>Check-out</Label>
              <Input type="date" value={form.check_out_date} onChange={e => setForm(f => ({ ...f, check_out_date: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Deposit <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="number" value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: Number(e.target.value) }))} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-1 sticky bottom-0 bg-background">
              <Button variant="outline" onClick={() => setShow(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!form.guest_name || !form.room_id}>
                Book
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Bookings;
