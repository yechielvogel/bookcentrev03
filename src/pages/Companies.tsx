import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Building2, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function formatDate(d: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(d));
}

type SortBy = 'name' | 'balance' | 'createdAt';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortBy, sortDir }: { col: SortBy; sortBy: SortBy; sortDir: SortDir }) {
  if (col !== sortBy) return null;
  return sortDir === 'asc' ? (
    <ChevronUp className="h-3 w-3 inline ml-1" />
  ) : (
    <ChevronDown className="h-3 w-3 inline ml-1" />
  );
}

export default function Companies() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const sortBy = (searchParams.get('sortBy') as SortBy) ?? 'name';
  const sortDir = (searchParams.get('sortDir') as SortDir) ?? 'asc';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      if (key !== 'page') next.set('page', '1');
      return next;
    });
  }

  function toggleSort(col: SortBy) {
    if (sortBy === col) {
      setParam('sortDir', sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('sortBy', col);
        next.set('sortDir', 'asc');
        next.set('page', '1');
        return next;
      });
    }
  }

  const { data, isLoading } = trpc.companies.listWithStats.useQuery({
    page,
    pageSize: 20,
    q: q || undefined,
    sortBy,
    sortDir,
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search companies..."
            className="pl-9"
            value={q}
            onChange={(e) => setParam('q', e.target.value)}
          />
        </div>
        <Button className="gap-2 shrink-0" onClick={() => navigate('/companies/new')}>
          <Plus className="h-4 w-4" />
          Create Company
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th
                className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                onClick={() => toggleSort('name')}
              >
                Company Name <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                Holder
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                Partners
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                Bank Accounts
              </th>
              <th
                className="text-right px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none hidden md:table-cell"
                onClick={() => toggleSort('balance')}
              >
                Balance <SortIcon col="balance" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none hidden xl:table-cell"
                onClick={() => toggleSort('createdAt')}
              >
                Created <SortIcon col="createdAt" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <Building2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {q ? 'No companies match your search.' : 'No companies yet.'}
                  </p>
                  {!q && (
                    <Button
                      size="sm"
                      className="mt-4 gap-2"
                      onClick={() => navigate('/companies/new')}
                    >
                      <Plus className="h-4 w-4" />
                      Create Company
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              data?.items.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/companies/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {c.holderName ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.partnerCount > 0 ? (
                      <Badge variant="secondary">{c.partnerCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.bankAccountCount > 0 ? (
                      <Badge variant="secondary">{c.bankAccountCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium hidden md:table-cell">
                    {formatCurrency(c.totalBalance)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="p-1.5 rounded hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/companies/${c.id}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} compan{(data?.total ?? 0) !== 1 ? 'ies' : 'y'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}
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
              onClick={() => setParam('page', String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
