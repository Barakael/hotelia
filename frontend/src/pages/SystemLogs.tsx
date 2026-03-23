import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { activityLogsApi, ActivityLogEntry, PaginatedResponse } from '@/services/api';
import { ScrollText, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'user_created', label: 'User Created' },
  { value: 'user_deleted', label: 'User Deleted' },
  { value: 'shop_created', label: 'Shop Created' },
  { value: 'shop_deleted', label: 'Shop Deleted' },
];

const ACTION_BADGE: Record<string, string> = {
  login:        'bg-info/10 text-info',
  user_created: 'bg-primary/10 text-primary',
  user_deleted: 'bg-destructive/10 text-destructive',
  shop_created: 'bg-primary/10 text-primary',
  shop_deleted: 'bg-destructive/10 text-destructive',
};

export default function SystemLogs() {
  const [page, setPage]       = useState(1);
  const [action, setAction]   = useState('');
  const [date, setDate]       = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery<PaginatedResponse<ActivityLogEntry>>({
    queryKey: ['activity-logs', page, action, date],
    queryFn:  () => activityLogsApi.getAll({ page, action: action || undefined, date: date || undefined }),
    placeholderData: prev => prev,
  });

  const logs       = (data?.data ?? []).filter(log => log.action !== 'sale_created');
  const totalPages = data?.last_page ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ScrollText className="w-6 h-6 text-primary" /> System Logs
            </h1>
            <p className="text-sm text-muted-foreground">All platform activity — logins, user & shop events</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 self-start">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setPage(1); }}
              className="pl-9"
              placeholder="Filter by date"
            />
          </div>
          <select
            value={action}
            onChange={e => { setAction(e.target.value); setPage(1); }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No logs found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_BADGE[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground max-w-xs truncate">{log.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.user ? (
                          <span>
                            {log.user.name}
                            <span className="ml-1 text-[10px] opacity-60">({log.user.role})</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ip_address ?? '—'}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Page {data?.current_page ?? 1} of {totalPages} · {data?.total ?? 0} entries
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
