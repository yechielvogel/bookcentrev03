import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Upload,
  Search,
  Layers,
  Building2,
  TrendingDown,
  TrendingUp,
  FileBarChart,
  Wallet,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadModal } from '@/components/dashboard/UploadModal';
import { MaaserModal } from '@/components/dashboard/MaaserModal';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDateTime(iso: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

type UploadStatus = 'all' | 'pending' | 'failed' | 'success';

const STATUS_LABELS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', variant: 'secondary' },
  success: { label: 'Success', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [maaserOpen, setMaaserOpen] = useState(false);
  const [tab, setTab] = useState<UploadStatus>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();

  const { data: uploadsData, isLoading: uploadsLoading } = trpc.uploads.list.useQuery({
    page,
    pageSize: 20,
    status: tab,
    q: search || undefined,
  });

  const cancelUpload = trpc.uploads.cancelUpload.useMutation({
    onSuccess: () => {
      toast.success('Upload cancelled');
      utils.uploads.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleTabChange(value: string) {
    setTab(value as UploadStatus);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleImported() {
    utils.uploads.list.invalidate();
    utils.dashboard.stats.invalidate();
  }

  const totalPages = uploadsData ? Math.ceil(uploadsData.total / uploadsData.pageSize) : 1;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {/* Queued Transactions */}
        <button
          className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
          onClick={() => navigate('/transactions?status=queued')}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-md bg-muted">
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {statsLoading ? (
            <div className="h-7 bg-muted animate-pulse rounded w-16 mb-1" />
          ) : (
            <p className="text-2xl font-bold">{stats?.queuedTransactions ?? 0}</p>
          )}
          <p className="text-sm text-muted-foreground">Queued Transactions</p>
        </button>

        {/* Total Balance */}
        <button
          className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
          onClick={() => navigate('/companies')}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-md bg-muted">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {statsLoading ? (
            <div className="h-7 bg-muted animate-pulse rounded w-28 mb-1" />
          ) : (
            <p className="text-2xl font-bold">{formatCurrency(stats?.totalBalance ?? 0)}</p>
          )}
          <p className="text-sm text-muted-foreground">Total Balance</p>
        </button>

        {/* Total Debt */}
        <button
          className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
          onClick={() => navigate('/contacts?role=lender')}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-md bg-muted">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {statsLoading ? (
            <div className="h-7 bg-muted animate-pulse rounded w-28 mb-1" />
          ) : (
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(stats?.totalDebt ?? 0)}
            </p>
          )}
          <p className="text-sm text-muted-foreground">Total Debt</p>
        </button>

        {/* Total Owed */}
        <button
          className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
          onClick={() => navigate('/contacts?role=borrower')}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-md bg-muted">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {statsLoading ? (
            <div className="h-7 bg-muted animate-pulse rounded w-28 mb-1" />
          ) : (
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(stats?.totalOwed ?? 0)}
            </p>
          )}
          <p className="text-sm text-muted-foreground">Total Owed</p>
        </button>

        {/* Reports */}
        <button
          className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
          onClick={() => navigate('/reporting')}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-md bg-muted">
              <FileBarChart className="h-4 w-4 text-muted-foreground" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {statsLoading ? (
            <div className="h-7 bg-muted animate-pulse rounded w-10 mb-1" />
          ) : (
            <p className="text-2xl font-bold">{stats?.reportsCount ?? 0}</p>
          )}
          <p className="text-sm text-muted-foreground">Reports (last 30 days)</p>
        </button>

        {/* Maaser — visually distinct */}
        <button
          className="text-left rounded-lg border-2 border-primary/30 bg-primary/5 p-4 hover:border-primary/60 hover:bg-primary/10 transition-all"
          onClick={() => setMaaserOpen(true)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-primary font-medium">View details →</span>
          </div>
          <p className="text-sm font-medium text-primary">Outstanding Maaser</p>
          <p className="text-xs text-primary/70 mt-0.5">Click to view full details</p>
        </button>
      </div>

      {/* Upload area */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Bank Statements</h2>
            <p className="text-sm text-muted-foreground">
              Upload and manage bank statement imports
            </p>
          </div>
          <Button className="gap-2" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload Statement
          </Button>
        </div>

        {/* Search + tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
              <TabsTrigger value="success">Success</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or company..."
              className="pl-9"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  File name
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                  Uploaded
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                  Company
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                  Bank account
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Txns</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                  Dupes
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                  Errors
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {uploadsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : uploadsData?.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    {search
                      ? 'No uploads match your search.'
                      : 'No uploads yet. Upload your first bank statement above.'}
                  </td>
                </tr>
              ) : (
                uploadsData?.items.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/transactions?uploadId=${u.id}`)}
                  >
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{u.fileName}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {formatDateTime(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{u.companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {u.bankAccountLabel}
                    </td>
                    <td className="px-4 py-3 text-right">{u.transactionsFound ?? 0}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {u.duplicatesDetected ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {u.errorsDetected ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={STATUS_LABELS[u.status]?.variant ?? 'outline'}
                        className="capitalize"
                      >
                        {STATUS_LABELS[u.status]?.label ?? u.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `Cancel and delete "${u.fileName}"? This will also remove all its transactions.`,
                            )
                          ) {
                            cancelUpload.mutate({ id: u.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {uploadsData?.total ?? 0} upload
              {(uploadsData?.total ?? 0) !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} onImported={handleImported} />
      <MaaserModal open={maaserOpen} onOpenChange={setMaaserOpen} />
    </div>
  );
}
