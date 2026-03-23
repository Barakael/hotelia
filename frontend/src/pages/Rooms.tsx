import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsApi } from '@/services/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
// Button used for mark-available action

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  reserved: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  occupied: 'bg-[#007AAD]/15 text-[#007AAD] border-[#007AAD]/30',
  cleaning: 'bg-sky-500/15 text-sky-800 border-sky-500/30',
  out_of_service: 'bg-red-500/15 text-red-700 border-red-500/30',
};

const Rooms = () => {
  const qc = useQueryClient();
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => roomsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Room board</h1>
            <p className="text-sm text-muted-foreground">Live status of all rooms</p>
          </div>
          <Link
            to="/bookings"
            className="inline-flex h-10 items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            Bookings
          </Link>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {rooms.map((room: any) => (
              <div
                key={room.id}
                className={cn(
                  'rounded-xl border p-3 shadow-sm bg-card',
                  STATUS_COLORS[room.status] || 'border-border'
                )}
              >
                <p className="text-2xl font-bold tabular-nums">{room.number}</p>
                <p className="text-xs opacity-80">{room.room_type?.name ?? '—'}</p>
                <p className="text-xs font-medium mt-1 capitalize">{room.status.replace(/_/g, ' ')}</p>
                {room.status === 'cleaning' && (
                  <Button
                    size="sm"
                    className="mt-2 w-full h-7 text-xs"
                    onClick={() => statusMutation.mutate({ id: room.id, status: 'available' })}
                  >
                    Mark available
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Rooms;
