import { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  FileDown,
  MoreVertical,
  Printer,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportType = 'transactions' | 'companies' | 'contacts' | 'maaser';

interface ReportFilters {
  q?: string;
  companyId?: string;
  bankAccountId?: string;
  status?: string;
  categoryId?: string;
  datePreset?: string;
  dateFrom?: string;
  dateTo?: string;
  role?: string;
}

interface TxItem {
  id: string;
  transactionDate: string | Date;
  description: string;
  amount: string;
  runningBalance?: string | null;
  status: string;
  notes?: string | null;
  companyName: string;
  bankAccountLabel: string;
  categoryName?: string | null;
  categoryType?: string | null;
  relationName?: string | null;
  supplierName?: string | null;
}

interface CompanyItem {
  id: string;
  name: string;
  description?: string | null;
  registeredAddress?: string | null;
  createdAt: string | Date;
}

interface ContactItem {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  balance?: string | null;
  companyName?: string | null;
  createdAt: string | Date;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLUMNS_BY_TYPE: Record<ReportType, string[]> = {
  transactions: [
    'date',
    'description',
    'amount',
    'balance',
    'company',
    'account',
    'category',
    'categoryType',
    'relation',
    'supplier',
    'status',
    'notes',
  ],
  companies: ['name', 'description', 'address', 'created'],
  contacts: ['name', 'email', 'phone', 'role', 'balance', 'company', 'created'],
  maaser: ['date', 'description', 'amount', 'company', 'category'],
};

const DEFAULT_COLUMNS: Record<ReportType, string[]> = {
  transactions: ['date', 'description', 'amount', 'company', 'category', 'status'],
  companies: ['name', 'description', 'created'],
  contacts: ['name', 'email', 'role', 'balance', 'company'],
  maaser: ['date', 'description', 'amount', 'company', 'category'],
};

const COLUMN_LABELS: Record<string, string> = {
  date: 'Date',
  description: 'Description',
  amount: 'Amount',
  balance: 'Running Balance',
  company: 'Company',
  account: 'Bank Account',
  category: 'Category',
  categoryType: 'Category Type',
  relation: 'Relation',
  supplier: 'Supplier',
  status: 'Status',
  notes: 'Notes',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  role: 'Role',
  address: 'Address',
  created: 'Created',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: string | number | null | undefined) {
  if (n == null) return '—';
  return parseFloat(String(n)).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDateRange(filters: ReportFilters): { dateFrom?: string; dateTo?: string } {
  const { datePreset, dateFrom, dateTo } = filters;
  if (!datePreset || datePreset === 'all' || datePreset === 'custom') {
    return { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
  }
  const days = datePreset === 'last30' ? 30 : datePreset === 'last60' ? 60 : 90;
  const now = new Date();
  return {
    dateFrom: new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}

function getFilterSummary(rtype: string, filters: ReportFilters): string {
  const parts: string[] = [rtype.charAt(0).toUpperCase() + rtype.slice(1)];
  if (filters.companyId) parts.push('Company filter');
  if (filters.datePreset && filters.datePreset !== 'all') {
    parts.push(
      filters.datePreset === 'custom'
        ? 'Custom date range'
        : `Last ${filters.datePreset.replace('last', '')} days`,
    );
  } else if (filters.dateFrom || filters.dateTo) {
    parts.push('Date range');
  }
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.categoryId) parts.push('Category filter');
  if (filters.role) parts.push(`Role: ${filters.role}`);
  if (filters.q) parts.push(`Search: "${filters.q}"`);
  return parts.join(' · ');
}

// ── Page component ────────────────────────────────────────────────────────────

export default function Reporting() {
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [columns, setColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [isGenerated, setIsGenerated] = useState(false);
  const [reportTitle, setReportTitle] = useState<string | null>(null);

  // Modal states
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Dropdown data
  const { data: allCompanies } = trpc.companies.listAll.useQuery();
  const { data: allBankAccounts } = trpc.bankAccounts.listAll.useQuery();
  const { data: allCategories } = trpc.categories.list.useQuery();
  const { data: templates } = trpc.reportTemplates.list.useQuery();
  const utils = trpc.useUtils();

  // Derived date range for queries
  const { dateFrom, dateTo } = getDateRange(filters);

  // Report queries (always called, enabled only when appropriate)
  const txQuery = trpc.transactions.list.useQuery(
    {
      page,
      pageSize: 50,
      companyId: filters.companyId,
      bankAccountId: filters.bankAccountId,
      status: filters.status,
      dateFrom,
      dateTo,
      categoryId: filters.categoryId,
      q: filters.q,
      sortBy: 'date',
      sortDir: 'desc',
    },
    { enabled: isGenerated && reportType === 'transactions' },
  );

  const maaserQuery = trpc.transactions.list.useQuery(
    {
      page,
      pageSize: 50,
      companyId: filters.companyId,
      dateFrom,
      dateTo,
      categoryType: 'Maaser',
      sortBy: 'date',
      sortDir: 'desc',
    },
    { enabled: isGenerated && reportType === 'maaser' },
  );

  const companiesQuery = trpc.companies.list.useQuery(
    { page, pageSize: 50, q: filters.q },
    { enabled: isGenerated && reportType === 'companies' },
  );

  const contactsQuery = trpc.contacts.list.useQuery(
    { page, pageSize: 50, q: filters.q, role: filters.role, sortBy: 'name', sortDir: 'asc' },
    { enabled: isGenerated && reportType === 'contacts' },
  );

  // Mutations
  const createTemplate = trpc.reportTemplates.create.useMutation({
    onSuccess: (data) => {
      toast.success('Template saved');
      setShowSaveTemplate(false);
      setSaveTemplateName('');
      if (!reportTitle) setReportTitle(data.name);
      utils.reportTemplates.list.invalidate();
    },
  });

  const updateTemplate = trpc.reportTemplates.update.useMutation({
    onSuccess: () => {
      setRenameId(null);
      utils.reportTemplates.list.invalidate();
    },
  });

  const duplicateTemplate = trpc.reportTemplates.duplicate.useMutation({
    onSuccess: () => utils.reportTemplates.list.invalidate(),
  });

  const markUsed = trpc.reportTemplates.markUsed.useMutation();

  const deleteTemplate = trpc.reportTemplates.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      utils.reportTemplates.list.invalidate();
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  function setFilter<K extends keyof ReportFilters>(key: K, val: ReportFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  }

  function handleReportTypeChange(type: ReportType) {
    setReportType(type);
    setFilters({});
    setColumns(DEFAULT_COLUMNS[type]);
    setPage(1);
    setIsGenerated(false);
    setReportTitle(null);
  }

  function clearFilters() {
    setFilters({});
    setPage(1);
  }

  function applyTemplate(t: {
    id: string;
    name: string;
    reportType: string;
    filters?: unknown;
    columns?: unknown;
  }) {
    const rtype = t.reportType as ReportType;
    setReportType(rtype);
    setFilters((t.filters as ReportFilters) ?? {});
    setColumns((t.columns as string[]) ?? DEFAULT_COLUMNS[rtype]);
    setPage(1);
    setIsGenerated(true);
    setReportTitle(t.name);
    setShowLibrary(false);
    markUsed.mutate({ id: t.id });
  }

  function handleSaveTemplate() {
    if (!reportType || !saveTemplateName.trim()) return;
    createTemplate.mutate({
      name: saveTemplateName.trim(),
      reportType,
      filters: filters as Record<string, unknown>,
      columns,
    });
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const currentData =
    reportType === 'transactions'
      ? txQuery.data
      : reportType === 'maaser'
        ? maaserQuery.data
        : reportType === 'companies'
          ? companiesQuery.data
          : reportType === 'contacts'
            ? contactsQuery.data
            : null;

  const isLoading =
    (reportType === 'transactions' && txQuery.isLoading) ||
    (reportType === 'maaser' && maaserQuery.isLoading) ||
    (reportType === 'companies' && companiesQuery.isLoading) ||
    (reportType === 'contacts' && contactsQuery.isLoading);

  const totalItems = currentData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / 50));
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '');
  const availableCols = reportType ? COLUMNS_BY_TYPE[reportType] : [];

  // ── CSV export ───────────────────────────────────────────────────────────────

  function exportCSV() {
    if (!currentData || !reportType) return;
    const headers = columns.map((c) => COLUMN_LABELS[c] ?? c).join(',');
    const rows = (currentData.items as unknown[]).map((item) =>
      columns
        .map((col) => {
          let val = '';
          if (reportType === 'transactions' || reportType === 'maaser') {
            const tx = item as TxItem;
            if (col === 'date') val = formatDate(tx.transactionDate);
            else if (col === 'description') val = tx.description;
            else if (col === 'amount') val = String(tx.amount);
            else if (col === 'balance') val = String(tx.runningBalance ?? '');
            else if (col === 'company') val = tx.companyName;
            else if (col === 'account') val = tx.bankAccountLabel;
            else if (col === 'category') val = tx.categoryName ?? '';
            else if (col === 'categoryType') val = tx.categoryType ?? '';
            else if (col === 'relation') val = tx.relationName ?? '';
            else if (col === 'supplier') val = tx.supplierName ?? '';
            else if (col === 'status') val = tx.status;
            else if (col === 'notes') val = tx.notes ?? '';
          } else if (reportType === 'companies') {
            const co = item as CompanyItem;
            if (col === 'name') val = co.name;
            else if (col === 'description') val = co.description ?? '';
            else if (col === 'address') val = co.registeredAddress ?? '';
            else if (col === 'created') val = formatDate(co.createdAt);
          } else if (reportType === 'contacts') {
            const ct = item as ContactItem;
            if (col === 'name') val = ct.name;
            else if (col === 'email') val = ct.email ?? '';
            else if (col === 'phone') val = ct.phone ?? '';
            else if (col === 'role') val = ct.role;
            else if (col === 'balance') val = String(ct.balance ?? '');
            else if (col === 'company') val = ct.companyName ?? '';
            else if (col === 'created') val = formatDate(ct.createdAt);
          }
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(','),
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Table cell renderer ──────────────────────────────────────────────────────

  function renderCell(item: unknown, col: string): React.ReactNode {
    if (reportType === 'transactions' || reportType === 'maaser') {
      const tx = item as TxItem;
      const amt = parseFloat(String(tx.amount));
      switch (col) {
        case 'date':
          return formatDate(tx.transactionDate);
        case 'description':
          return (
            <span className="truncate max-w-xs block" title={tx.description}>
              {tx.description}
            </span>
          );
        case 'amount':
          return (
            <span className={amt < 0 ? 'text-red-600' : 'text-green-700 font-medium'}>
              {formatCurrency(tx.amount)}
            </span>
          );
        case 'balance':
          return formatCurrency(tx.runningBalance);
        case 'company':
          return tx.companyName;
        case 'account':
          return tx.bankAccountLabel;
        case 'category':
          return tx.categoryName ?? '—';
        case 'categoryType':
          return tx.categoryType ?? '—';
        case 'relation':
          return tx.relationName ?? '—';
        case 'supplier':
          return tx.supplierName ?? '—';
        case 'status':
          return <span className="capitalize">{tx.status}</span>;
        case 'notes':
          return (
            <span className="text-muted-foreground text-xs truncate max-w-xs block">
              {tx.notes ?? '—'}
            </span>
          );
        default:
          return '—';
      }
    }
    if (reportType === 'companies') {
      const co = item as CompanyItem;
      switch (col) {
        case 'name':
          return <span className="font-medium">{co.name}</span>;
        case 'description':
          return co.description ?? '—';
        case 'address':
          return co.registeredAddress ?? '—';
        case 'created':
          return formatDate(co.createdAt);
        default:
          return '—';
      }
    }
    if (reportType === 'contacts') {
      const ct = item as ContactItem;
      switch (col) {
        case 'name':
          return <span className="font-medium">{ct.name}</span>;
        case 'email':
          return ct.email ?? '—';
        case 'phone':
          return ct.phone ?? '—';
        case 'role':
          return <span className="capitalize">{ct.role}</span>;
        case 'balance':
          return formatCurrency(ct.balance);
        case 'company':
          return ct.companyName ?? '—';
        case 'created':
          return formatDate(ct.createdAt);
        default:
          return '—';
      }
    }
    return '—';
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 items-start">
      {/* ── Filter Sidebar ──────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 space-y-4 sticky top-6">
        {/* Report on */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Report on
          </Label>
          <Select
            value={reportType ?? ''}
            onValueChange={(v) => handleReportTypeChange(v as ReportType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select report type…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="transactions">Transactions</SelectItem>
              <SelectItem value="companies">Companies</SelectItem>
              <SelectItem value="contacts">Contacts</SelectItem>
              <SelectItem value="maaser">Maaser</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions filters */}
        {reportType === 'transactions' && (
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Filters
            </Label>
            <Input
              placeholder="Search description…"
              value={filters.q ?? ''}
              onChange={(e) => setFilter('q', e.target.value || undefined)}
            />
            <Select
              value={filters.companyId ?? '__all__'}
              onValueChange={(v) => {
                setFilter('companyId', v === '__all__' ? undefined : v);
                setFilter('bankAccountId', undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All companies</SelectItem>
                {allCompanies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.bankAccountId ?? '__all__'}
              onValueChange={(v) => setFilter('bankAccountId', v === '__all__' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All accounts</SelectItem>
                {(allBankAccounts ?? [])
                  .filter((b) => !filters.companyId || b.companyId === filters.companyId)
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status ?? '__all__'}
              onValueChange={(v) => setFilter('status', v === '__all__' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.categoryId ?? '__all__'}
              onValueChange={(v) => setFilter('categoryId', v === '__all__' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
                {allCategories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => setFilter('dateFrom', e.target.value || undefined)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={(e) => setFilter('dateTo', e.target.value || undefined)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Maaser filters */}
        {reportType === 'maaser' && (
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Filters
            </Label>
            <Select
              value={filters.companyId ?? '__all__'}
              onValueChange={(v) => setFilter('companyId', v === '__all__' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All companies</SelectItem>
                {allCompanies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.datePreset ?? 'all'}
              onValueChange={(v) => setFilter('datePreset', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
                <SelectItem value="last60">Last 60 days</SelectItem>
                <SelectItem value="last90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            {filters.datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom ?? ''}
                    onChange={(e) => setFilter('dateFrom', e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo ?? ''}
                    onChange={(e) => setFilter('dateTo', e.target.value || undefined)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Companies filters */}
        {reportType === 'companies' && (
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Filters
            </Label>
            <Input
              placeholder="Search companies…"
              value={filters.q ?? ''}
              onChange={(e) => setFilter('q', e.target.value || undefined)}
            />
          </div>
        )}

        {/* Contacts filters */}
        {reportType === 'contacts' && (
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Filters
            </Label>
            <Input
              placeholder="Search contacts…"
              value={filters.q ?? ''}
              onChange={(e) => setFilter('q', e.target.value || undefined)}
            />
            <Select
              value={filters.role ?? '__all__'}
              onValueChange={(v) => setFilter('role', v === '__all__' ? undefined : v)}
            >
              <SelectTrigger>
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
          </div>
        )}

        {/* Show columns */}
        {reportType && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Show columns
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between" size="sm">
                  {columns.length} column{columns.length !== 1 ? 's' : ''} selected
                  <ChevronDown className="h-4 w-4 ml-1 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52">
                {availableCols.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col}
                    checked={columns.includes(col)}
                    onCheckedChange={(checked) =>
                      setColumns(checked ? [...columns, col] : columns.filter((c) => c !== col))
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    {COLUMN_LABELS[col] ?? col}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Cancel filters */}
        {hasFilters && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline"
            onClick={clearFilters}
          >
            Cancel all filters
          </button>
        )}

        {/* CTA buttons */}
        <div className="space-y-2 pt-1">
          <Button
            className="w-full"
            disabled={!reportType}
            onClick={() => {
              setPage(1);
              setIsGenerated(true);
            }}
          >
            Generate Report
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowLibrary(true)}>
            <BookOpen className="h-4 w-4" />
            Use Template
          </Button>
        </div>
      </div>

      {/* ── Report Area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {!isGenerated ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No report generated yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {reportType
                ? 'Click "Generate Report" to see results'
                : 'Select a report type and click "Generate Report"'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Report header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                {reportTitle && <h2 className="text-base font-semibold">{reportTitle}</h2>}
                <p className="text-sm text-muted-foreground">
                  {isLoading ? 'Loading…' : `${totalItems} result${totalItems !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setSaveTemplateName(reportTitle ?? '');
                    setShowSaveTemplate(true);
                  }}
                >
                  <Save className="h-4 w-4" />
                  Save Template
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <FileDown className="h-4 w-4" />
                      Export
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportCSV}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV file
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-2" />
                      PDF (Print)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-x-auto bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {COLUMN_LABELS[col] ?? col}
                      </th>
                    ))}
                    {columns.length === 0 && (
                      <th className="px-4 py-3 text-muted-foreground text-sm font-normal">
                        No columns selected
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {(columns.length > 0 ? columns : ['_']).map((col) => (
                          <td key={col} className="px-4 py-3">
                            <div className="h-4 bg-muted animate-pulse rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : !currentData?.items.length ? (
                    <tr>
                      <td
                        colSpan={Math.max(columns.length, 1)}
                        className="px-4 py-16 text-center text-sm text-muted-foreground"
                      >
                        {reportType === 'maaser'
                          ? 'No Maaser transactions found. Make sure you have categories with type "Maaser".'
                          : 'No results match the current filters.'}
                      </td>
                    </tr>
                  ) : (
                    (currentData.items as unknown[]).map((item, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        {columns.map((col) => (
                          <td key={col} className="px-4 py-3 whitespace-nowrap">
                            {renderCell(item, col)}
                          </td>
                        ))}
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
                  {totalItems} result{totalItems !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
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
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Template Library ─────────────────────────────────────────────────── */}
      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Library</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2 py-2 pr-1">
            {!templates?.length ? (
              <p className="text-sm text-center text-muted-foreground py-8">
                No saved templates yet.
              </p>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between rounded-lg border border-border p-3 hover:bg-muted/30 cursor-pointer"
                  onClick={() => applyTemplate(t)}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {getFilterSummary(t.reportType, (t.filters as ReportFilters) ?? {})}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {t.useCount} use{t.useCount !== 1 ? 's' : ''} ·{' '}
                      {t.lastUsedAt ? `Last used ${formatDate(t.lastUsedAt)}` : 'Never used'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameId(t.id);
                          setRenameName(t.name);
                        }}
                      >
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateTemplate.mutate({ id: t.id });
                        }}
                      >
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(t.id);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLibrary(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Template ─────────────────────────────────────────────────────── */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Template name</Label>
            <Input
              placeholder="e.g. Monthly Maaser Report"
              value={saveTemplateName}
              onChange={(e) => setSaveTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!saveTemplateName.trim() || createTemplate.isPending}
            >
              {createTemplate.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rename Template ───────────────────────────────────────────────────── */}
      <Dialog open={!!renameId} onOpenChange={(open) => !open && setRenameId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>New name</Label>
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                renameId &&
                updateTemplate.mutate({ id: renameId, name: renameName })
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => renameId && updateTemplate.mutate({ id: renameId, name: renameName })}
              disabled={!renameName.trim() || updateTemplate.isPending}
            >
              {updateTemplate.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Template ───────────────────────────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this template? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteTemplate.mutate({ id: deleteId })}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
