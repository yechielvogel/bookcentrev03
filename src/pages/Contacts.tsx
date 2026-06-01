import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Download,
  X,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: string | number | null | undefined) {
  if (n == null) return '—';
  return parseFloat(String(n)).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

const ROLE_LABELS: Record<string, string> = {
  holder: 'Holder',
  partner: 'Partner',
  lender: 'Lender',
  borrower: 'Borrower',
};

function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, string> = {
    holder: 'bg-blue-100 text-blue-700 border-blue-200',
    partner: 'bg-purple-100 text-purple-700 border-purple-200',
    lender: 'bg-amber-100 text-amber-700 border-amber-200',
    borrower: 'bg-green-100 text-green-700 border-green-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${variants[role] ?? 'bg-muted text-muted-foreground'}`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function downloadCSV(
  items: Array<{
    name: string;
    email?: string | null;
    phone?: string | null;
    role: string;
    balance?: string | null;
    companyName?: string | null;
    createdAt: string | Date;
  }>,
) {
  const headers = ['Name', 'Email', 'Phone', 'Role', 'Balance', 'Company', 'Created'];
  const rows = items.map((c) =>
    [
      `"${c.name}"`,
      c.email ?? '',
      c.phone ?? '',
      c.role,
      c.balance ?? '0',
      c.companyName ?? '',
      formatDate(c.createdAt),
    ].join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Contacts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const role = searchParams.get('role') ?? '';
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
        next.set('sortDir', col === 'balance' ? 'desc' : 'asc');
        next.set('page', '1');
        return next;
      });
    }
  }

  const { data, isLoading } = trpc.contacts.list.useQuery({
    page,
    pageSize: 20,
    q: q || undefined,
    role: role || undefined,
    sortBy,
    sortDir,
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;
  const hasFilters = !!(q || role);

  function clearFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('q');
      next.delete('role');
      next.set('page', '1');
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search contacts..."
              className="pl-9"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
            />
          </div>

          <Select
            value={role || '__all__'}
            onValueChange={(v) => setParam('role', v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All roles</SelectItem>
              <SelectItem value="holder">Holders</SelectItem>
              <SelectItem value="partner">Partners</SelectItem>
              <SelectItem value="lender">Lenders</SelectItem>
              <SelectItem value="borrower">Borrowers</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => downloadCSV(data?.items ?? [])}
            disabled={(data?.items ?? []).length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2" onClick={() => navigate('/contacts/new')}>
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>
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
                Name <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                Email
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th
                className="text-right px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none hidden md:table-cell"
                onClick={() => toggleSort('balance')}
              >
                Balance <SortIcon col="balance" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                Company
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
              Array.from({ length: 5 }).map((_, i) => (
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
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {hasFilters ? 'No contacts match your filters.' : 'No contacts yet.'}
                  </p>
                  {!hasFilters && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Contacts are created when you add company holders, partners, lenders, or
                      borrowers.
                    </p>
                  )}
                  {!hasFilters && (
                    <Button
                      size="sm"
                      className="mt-4 gap-2"
                      onClick={() => navigate('/contacts/new')}
                    >
                      <Plus className="h-4 w-4" />
                      Add Contact
                    </Button>
                  )}
                  {hasFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 gap-1.5"
                      onClick={clearFilters}
                    >
                      <X className="h-3 w-3" />
                      Clear filters
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              data?.items.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/contacts/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {c.email ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={c.role} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium hidden md:table-cell">
                    {formatCurrency(c.balance)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {c.companyName ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="p-1.5 rounded hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/contacts/${c.id}`);
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
            {data?.total ?? 0} contact{(data?.total ?? 0) !== 1 ? 's' : ''}
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
