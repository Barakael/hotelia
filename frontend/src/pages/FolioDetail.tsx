import { useParams, Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { foliosApi } from '@/services/api';
import { formatCurrency } from '@/data/mockData';

const FolioDetail = () => {
  const { id } = useParams();
  const { data: folio, isLoading } = useQuery({
    queryKey: ['folio', id],
    queryFn: () => foliosApi.getOne(Number(id)),
    enabled: !!id,
  });

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4 max-w-2xl">
        <Link to="/bookings" className="text-sm text-[#007AAD]">← Bookings</Link>
        <h1 className="text-xl font-bold">Folio #{id}</h1>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}

        {folio && (
          <>
            <div className="rounded-xl border bg-card p-4 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Guest:</span> {folio.reservation?.guest?.name}</p>
              <p><span className="text-muted-foreground">Phone:</span> {folio.reservation?.guest?.phone || '—'}</p>
              <p><span className="text-muted-foreground">ID:</span> {folio.reservation?.guest?.id_type} {folio.reservation?.guest?.id_number}</p>
              <p><span className="text-muted-foreground">Nationality:</span> {folio.reservation?.guest?.nationality || '—'}</p>
              <p><span className="text-muted-foreground">Party:</span> {folio.reservation?.adults || 1} adult(s), {folio.reservation?.children || 0} child(ren)</p>
              <p><span className="text-muted-foreground">Room:</span> {folio.reservation?.room?.number}</p>
              <p><span className="text-muted-foreground">Status:</span> {folio.status}</p>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              <h2 className="px-4 py-2.5 font-semibold border-b text-sm">Charges</h2>
              <ul className="divide-y">
                {(folio.charges || []).map((c: any) => (
                  <li key={c.id} className="px-4 py-2.5 flex justify-between text-sm">
                    <span>{c.description} <span className="text-xs text-muted-foreground">({c.source})</span></span>
                    <span className="font-medium">{formatCurrency(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              <h2 className="px-4 py-2.5 font-semibold border-b text-sm">Payments</h2>
              <ul className="divide-y">
                {(folio.payments || []).length === 0 && (
                  <li className="px-4 py-2.5 text-sm text-muted-foreground">No payments yet</li>
                )}
                {(folio.payments || []).map((p: any) => (
                  <li key={p.id} className="px-4 py-2.5 flex justify-between text-sm">
                    <span>{p.method} {p.reference ? `· ${p.reference}` : ''}</span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>Charges</span><span>{formatCurrency(folio.charges_total)}</span></div>
              <div className="flex justify-between"><span>Payments</span><span>{formatCurrency(folio.payments_total)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Balance</span>
                <span className="text-[#007AAD]">{formatCurrency(folio.balance)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default FolioDetail;
