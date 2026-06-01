import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ArrowLeftRight,
  ChevronUp,
  ChevronDown,
  Flag,
  X,
  Download,
  Play,
  Pencil,
  Trash2,
  StickyNote,
  Check,
  Tag,
  PackagePlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { getErrorMessage, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProcessModal, type TxItem } from '@/components/transactions/ProcessModal';

// ── helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(n: string | number) {
  return parseFloat(String(n)).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
}

type SortBy = 'date' | 'amount' | 'description';
type SortDir = 'asc' | 'desc';

type Transaction = {
  id: string;
  uploadId: string | null;
  transactionDate: string | Date;
  description: string;
  amount: string;
  runningBalance: string | null;
  status: string;
  notes: string | null;
  flagReason: string | null;
  companyId: string;
  bankAccountId: string;
  categoryId: string | null;
  relationId: string | null;
  supplierId: string | null;
  bankAccountLabel: string;
  companyName: string;
  categoryName: string | null;
  categoryType: string | null;
  relationName: string | null;
  supplierName: string | null;
};

// ── export helper ────────────────────────────────────────────────────────────

function downloadCSV(items: Transaction[]) {
  const headers = [
    'Date',
    'Description',
    'Amount',
    'Running Balance',
    'Company',
    'Bank Account',
    'Category',
    'Category Type',
    'Status',
    'Relation',
    'Supplier',
    'Notes',
    'Flag Reason',
  ];
  const rows = items.map((t) =>
    [
      formatDate(t.transactionDate),
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.runningBalance ?? '',
      t.companyName,
      t.bankAccountLabel,
      t.categoryName ?? '',
      t.categoryType ?? '',
      t.status,
      t.relationName ?? '',
      t.supplierName ?? '',
      t.notes ? `"${t.notes.replace(/"/g, '""')}"` : '',
      t.flagReason ? `"${t.flagReason.replace(/"/g, '""')}"` : '',
    ].join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ col, sortBy, sortDir }: { col: SortBy; sortBy: SortBy; sortDir: SortDir }) {
  if (col !== sortBy) return null;
  return sortDir === 'asc' ? (
    <ChevronUp className="h-3 w-3 inline ml-0.5" />
  ) : (
    <ChevronDown className="h-3 w-3 inline ml-0.5" />
  );
}

// ── status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'processed')
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
        Processed
      </Badge>
    );
  if (status === 'flagged')
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
        Flagged
      </Badge>
    );
  return <Badge variant="secondary">Queued</Badge>;
}

// ── inline edit cells ─────────────────────────────────────────────────────────

const CATEGORY_TYPES = [
  'expense',
  'income',
  'transfer',
  'maaser',
  'dividend',
  'loan',
  'bill',
  'other',
] as const;

function InlineCategoryCell({ tx }: { tx: Transaction }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');

  const { data: categories } = trpc.categories.list.useQuery(undefined, { enabled: open });

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      setOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createCatMutation = trpc.categories.create.useMutation({
    onSuccess: (cat) => {
      utils.categories.list.invalidate();
      updateMutation.mutate({ id: tx.id, categoryId: cat.id });
      setCreating(false);
      setNewName('');
      setNewType('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const filtered = (categories ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSearch('');
          setCreating(false);
          setNewName('');
          setNewType('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <button className="group flex min-w-[90px] max-w-[160px] items-start text-left rounded px-1.5 py-1 hover:bg-muted/60 hover:outline hover:outline-1 hover:outline-dashed hover:outline-border transition-colors w-full">
          {tx.categoryName ? (
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{tx.categoryName}</p>
              <p className="text-xs text-muted-foreground capitalize">{tx.categoryType}</p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/50 italic">Add category...</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        {creating ? (
          <div className="p-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">New Category</p>
            <Input
              autoFocus
              placeholder="Category name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
            />
            <div className="flex gap-1 flex-wrap">
              {CATEGORY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded border transition-colors',
                    newType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted',
                  )}
                  onClick={() => setNewType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-6 text-xs px-2"
                disabled={!newName.trim() || !newType || createCatMutation.isPending}
                onClick={() => createCatMutation.mutate({ name: newName.trim(), type: newType })}
              >
                {createCatMutation.isPending ? '...' : 'Add'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-1.5 border-b">
              <Input
                autoFocus
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="max-h-52 overflow-y-auto p-1">
              {filtered.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted flex items-center justify-between gap-2 transition-colors',
                    tx.categoryId === cat.id && 'bg-primary/10',
                  )}
                  onClick={() => updateMutation.mutate({ id: tx.id, categoryId: cat.id })}
                  disabled={updateMutation.isPending}
                >
                  <span className="truncate">{cat.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-muted-foreground text-[10px] capitalize">{cat.type}</span>
                    {tx.categoryId === cat.id && <Check className="h-3 w-3 text-primary" />}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-3">
                  {search ? 'No matches' : 'No categories yet'}
                </p>
              )}
            </div>
            <div className="p-1 border-t flex items-center">
              {tx.categoryId && (
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-destructive px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                  onClick={() => updateMutation.mutate({ id: tx.id, categoryId: null })}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="text-[11px] text-primary hover:underline ml-auto px-2 py-1"
                onClick={() => setCreating(true)}
              >
                + Create new
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function InlineSupplierCell({ tx }: { tx: Transaction }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: suppliers } = trpc.suppliers.list.useQuery(undefined, { enabled: open });

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      setOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createSupplierMutation = trpc.suppliers.create.useMutation({
    onSuccess: (s) => {
      utils.suppliers.list.invalidate();
      updateMutation.mutate({ id: tx.id, supplierId: s.id });
      setCreating(false);
      setNewName('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const filtered = (suppliers ?? []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSearch('');
          setCreating(false);
          setNewName('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <button className="flex min-w-[80px] max-w-[140px] items-center text-left rounded px-1.5 py-1 hover:bg-muted/60 hover:outline hover:outline-1 hover:outline-dashed hover:outline-border transition-colors w-full">
          {tx.supplierName ? (
            <span className="text-xs font-medium truncate">{tx.supplierName}</span>
          ) : (
            <span className="text-xs text-muted-foreground/50 italic">Add supplier...</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        {creating ? (
          <div className="p-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">New Supplier</p>
            <div className="flex gap-1">
              <Input
                autoFocus
                placeholder="Supplier name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim())
                    createSupplierMutation.mutate({ name: newName.trim() });
                  if (e.key === 'Escape') setCreating(false);
                }}
              />
              <Button
                size="sm"
                className="h-7 px-2 text-xs shrink-0"
                disabled={!newName.trim() || createSupplierMutation.isPending}
                onClick={() => createSupplierMutation.mutate({ name: newName.trim() })}
              >
                {createSupplierMutation.isPending ? '...' : 'Add'}
              </Button>
            </div>
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:underline"
              onClick={() => setCreating(false)}
            >
              ← Back
            </button>
          </div>
        ) : (
          <>
            <div className="p-1.5 border-b">
              <Input
                autoFocus
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted flex items-center justify-between gap-2 transition-colors',
                    tx.supplierId === s.id && 'bg-primary/10',
                  )}
                  onClick={() => updateMutation.mutate({ id: tx.id, supplierId: s.id })}
                  disabled={updateMutation.isPending}
                >
                  <span className="truncate">{s.name}</span>
                  {tx.supplierId === s.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-3">
                  {search ? 'No matches' : 'No suppliers yet'}
                </p>
              )}
            </div>
            <div className="p-1 border-t flex items-center">
              {tx.supplierId && (
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-destructive px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                  onClick={() => updateMutation.mutate({ id: tx.id, supplierId: null })}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="text-[11px] text-primary hover:underline ml-auto px-2 py-1"
                onClick={() => setCreating(true)}
              >
                + Create new
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

const RELATION_ROLES = ['partner', 'lender', 'borrower'] as const;

function InlineRelationCell({ tx }: { tx: Transaction }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<(typeof RELATION_ROLES)[number]>('partner');

  const { data: contacts } = trpc.contacts.listAll.useQuery(undefined, { enabled: open });

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      setOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const filtered = (contacts ?? []).filter(
    (c) => c.role === role && c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <button className="flex min-w-[70px] max-w-[130px] items-center text-left rounded px-1.5 py-1 hover:bg-muted/60 hover:outline hover:outline-1 hover:outline-dashed hover:outline-border transition-colors w-full">
          {tx.relationName ? (
            <span className="text-xs font-medium truncate">{tx.relationName}</span>
          ) : (
            <span className="text-xs text-muted-foreground/50 italic">Add relation...</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <div className="p-1.5 border-b space-y-1.5">
          <div className="flex gap-1">
            {RELATION_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                className={cn(
                  'flex-1 text-[11px] py-0.5 rounded border capitalize transition-colors',
                  role === r
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted',
                )}
                onClick={() => {
                  setRole(r);
                  setSearch('');
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <Input
            autoFocus
            placeholder={`Search ${role}s...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="max-h-44 overflow-y-auto p-1">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted flex items-center justify-between gap-2 transition-colors',
                tx.relationId === c.id && 'bg-primary/10',
              )}
              onClick={() => updateMutation.mutate({ id: tx.id, relationId: c.id })}
              disabled={updateMutation.isPending}
            >
              <span className="truncate">{c.name}</span>
              {tx.relationId === c.id && <Check className="h-3 w-3 text-primary shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-center text-muted-foreground py-3">
              No {role}s found
            </p>
          )}
        </div>
        {tx.relationId && (
          <div className="p-1 border-t">
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-destructive px-2 py-1 rounded hover:bg-muted/50 transition-colors"
              onClick={() => updateMutation.mutate({ id: tx.id, relationId: null })}
            >
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function InlineNotesCell({ tx }: { tx: Transaction }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(tx.notes ?? '');

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      setOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function save() {
    updateMutation.mutate({ id: tx.id, notes: notes.trim() || null });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setNotes(tx.notes ?? '');
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={cn(
            'p-1 rounded transition-colors',
            tx.notes
              ? 'text-primary hover:bg-primary/10'
              : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted',
          )}
          title={tx.notes ? 'Edit note' : 'Add note'}
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 space-y-2" align="end">
        <p className="text-xs font-medium text-muted-foreground">Note</p>
        <Textarea
          autoFocus
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note..."
          className="text-xs min-h-[72px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        <div className="flex gap-1 justify-end">
          {tx.notes && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive hover:text-destructive px-2"
              onClick={() => updateMutation.mutate({ id: tx.id, notes: null })}
              disabled={updateMutation.isPending}
            >
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs px-2"
            onClick={save}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? '...' : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InlineFlagCell({ tx }: { tx: Transaction }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      setOpen(false);
      setReason('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // Unflagging is instant — no popover needed
  if (tx.status === 'flagged') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="p-1 rounded text-amber-500 hover:bg-amber-50 transition-colors"
            onClick={() => updateMutation.mutate({ id: tx.id, status: 'queued', flagReason: null })}
            disabled={updateMutation.isPending}
          >
            <Flag className="h-3.5 w-3.5 fill-current" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {tx.flagReason ? `Flagged: ${tx.flagReason}` : 'Flagged — click to unflag'}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setReason(''); }}>
      <PopoverTrigger asChild>
        <button
          className="p-1 rounded text-muted-foreground/40 hover:text-amber-500 hover:bg-amber-50 transition-colors"
          title="Flag transaction"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 space-y-2" align="end">
        <p className="text-xs font-medium text-muted-foreground">Flag reason (optional)</p>
        <Input
          autoFocus
          placeholder="Reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-7 text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              updateMutation.mutate({ id: tx.id, status: 'flagged', flagReason: reason.trim() || null });
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs px-2 bg-amber-500 hover:bg-amber-600"
            onClick={() =>
              updateMutation.mutate({ id: tx.id, status: 'flagged', flagReason: reason.trim() || null })
            }
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? '...' : 'Flag'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── bulk assign popovers ───────────────────────────────────────────────────────

function BulkCategoryPopover({
  selectedIds,
  onDone,
}: {
  selectedIds: string[];
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');

  const { data: categories } = trpc.categories.list.useQuery(undefined, { enabled: open });

  const bulkUpdateMutation = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: (res) => {
      toast.success(`Category set on ${res.updated} transaction${res.updated !== 1 ? 's' : ''}`);
      utils.transactions.list.invalidate();
      setOpen(false);
      onDone();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createCatMutation = trpc.categories.create.useMutation({
    onSuccess: (cat) => {
      utils.categories.list.invalidate();
      bulkUpdateMutation.mutate({ ids: selectedIds, categoryId: cat.id });
      setCreating(false);
      setNewName('');
      setNewType('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const filtered = (categories ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSearch('');
          setCreating(false);
          setNewName('');
          setNewType('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Tag className="h-3.5 w-3.5" />
          Assign Category
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        {creating ? (
          <div className="p-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">New Category</p>
            <Input
              autoFocus
              placeholder="Category name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
            />
            <div className="flex gap-1 flex-wrap">
              {CATEGORY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded border transition-colors',
                    newType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted',
                  )}
                  onClick={() => setNewType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-6 text-xs px-2"
                disabled={!newName.trim() || !newType || createCatMutation.isPending}
                onClick={() => createCatMutation.mutate({ name: newName.trim(), type: newType })}
              >
                {createCatMutation.isPending ? '...' : 'Add & Assign'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-1.5 border-b">
              <Input
                autoFocus
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="max-h-52 overflow-y-auto p-1">
              {filtered.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted flex items-center justify-between gap-2 transition-colors"
                  onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, categoryId: cat.id })}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="text-muted-foreground text-[10px] capitalize shrink-0">{cat.type}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-3">
                  {search ? 'No matches' : 'No categories yet'}
                </p>
              )}
            </div>
            <div className="p-1 border-t">
              <button
                type="button"
                className="text-[11px] text-primary hover:underline px-2 py-1"
                onClick={() => setCreating(true)}
              >
                + Create new
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function BulkSupplierPopover({
  selectedIds,
  onDone,
}: {
  selectedIds: string[];
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: suppliers } = trpc.suppliers.list.useQuery(undefined, { enabled: open });

  const bulkUpdateMutation = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: (res) => {
      toast.success(`Supplier set on ${res.updated} transaction${res.updated !== 1 ? 's' : ''}`);
      utils.transactions.list.invalidate();
      setOpen(false);
      onDone();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const filtered = (suppliers ?? []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <PackagePlus className="h-3.5 w-3.5" />
          Assign Supplier
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <div className="p-1.5 border-b">
          <Input
            autoFocus
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors"
              onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, supplierId: s.id })}
              disabled={bulkUpdateMutation.isPending}
            >
              {s.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-center text-muted-foreground py-3">No suppliers</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BulkRelationPopover({
  selectedIds,
  onDone,
}: {
  selectedIds: string[];
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<(typeof RELATION_ROLES)[number]>('partner');

  const { data: contacts } = trpc.contacts.listAll.useQuery(undefined, { enabled: open });

  const bulkUpdateMutation = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: (res) => {
      toast.success(`Relation set on ${res.updated} transaction${res.updated !== 1 ? 's' : ''}`);
      utils.transactions.list.invalidate();
      setOpen(false);
      onDone();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const filtered = (contacts ?? []).filter(
    (c) => c.role === role && c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Users className="h-3.5 w-3.5" />
          Assign Relation
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <div className="p-1.5 border-b space-y-1.5">
          <div className="flex gap-1">
            {RELATION_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                className={cn(
                  'flex-1 text-[11px] py-0.5 rounded border capitalize transition-colors',
                  role === r
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted',
                )}
                onClick={() => { setRole(r); setSearch(''); }}
              >
                {r}
              </button>
            ))}
          </div>
          <Input
            autoFocus
            placeholder={`Search ${role}s...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="max-h-44 overflow-y-auto p-1">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors"
              onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, relationId: c.id })}
              disabled={bulkUpdateMutation.isPending}
            >
              {c.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-center text-muted-foreground py-3">No {role}s found</p>
          )}
        </div>
        <div className="p-1 border-t">
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-destructive px-2 py-1 rounded hover:bg-muted/50 transition-colors"
            onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, relationId: null })}
            disabled={bulkUpdateMutation.isPending}
          >
            Clear relation
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BulkNotesPopover({
  selectedIds,
  onDone,
}: {
  selectedIds: string[];
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const bulkUpdateMutation = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: (res) => {
      toast.success(`Note set on ${res.updated} transaction${res.updated !== 1 ? 's' : ''}`);
      utils.transactions.list.invalidate();
      setOpen(false);
      onDone();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setNotes('');
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <StickyNote className="h-3.5 w-3.5" />
          Set Note
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 space-y-2" align="start">
        <p className="text-xs font-medium text-muted-foreground">Note (applies to all selected)</p>
        <Textarea
          autoFocus
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note..."
          className="text-xs min-h-[72px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
              bulkUpdateMutation.mutate({ ids: selectedIds, notes: notes.trim() || null });
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-destructive hover:text-destructive px-2"
            onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, notes: null })}
            disabled={bulkUpdateMutation.isPending}
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, notes: notes.trim() || null })}
            disabled={bulkUpdateMutation.isPending}
          >
            {bulkUpdateMutation.isPending ? '...' : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BulkFlagPopover({
  selectedIds,
  onDone,
}: {
  selectedIds: string[];
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const bulkUpdateMutation = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.updated} transaction${res.updated !== 1 ? 's' : ''} flagged`);
      utils.transactions.list.invalidate();
      setOpen(false);
      onDone();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setReason('');
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-amber-600 hover:text-amber-600">
          <Flag className="h-3.5 w-3.5" />
          Flag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 space-y-2" align="start">
        <p className="text-xs font-medium text-muted-foreground">Flag reason (optional)</p>
        <Input
          autoFocus
          placeholder="Reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-7 text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              bulkUpdateMutation.mutate({ ids: selectedIds, status: 'flagged', flagReason: reason.trim() || null });
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs px-2 bg-amber-500 hover:bg-amber-600"
            onClick={() =>
              bulkUpdateMutation.mutate({ ids: selectedIds, status: 'flagged', flagReason: reason.trim() || null })
            }
            disabled={bulkUpdateMutation.isPending}
          >
            {bulkUpdateMutation.isPending ? '...' : 'Flag All'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── remaining modals ──────────────────────────────────────────────────────────

function EditModal({
  tx,
  onClose,
  onSaved,
}: {
  tx: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [companyId, setCompanyId] = useState(tx.companyId);
  const [bankAccountId, setBankAccountId] = useState(tx.bankAccountId);

  const { data: companiesData } = trpc.companies.listAll.useQuery();
  const { data: bankAccountsData } = trpc.bankAccounts.listByCompany.useQuery(
    { companyId },
    { enabled: !!companyId },
  );

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast.success('Transaction updated');
      utils.transactions.list.invalidate();
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground truncate">{tx.description}</p>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select
              value={companyId}
              onValueChange={(v) => {
                setCompanyId(v);
                setBankAccountId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company..." />
              </SelectTrigger>
              <SelectContent>
                {(companiesData ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Bank Account</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId} disabled={!companyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank account..." />
              </SelectTrigger>
              <SelectContent>
                {(bankAccountsData ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.bankName} – {b.accountNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              updateMutation.mutate({
                id: tx.id,
                companyId,
                bankAccountId: bankAccountId || undefined,
              })
            }
            disabled={!companyId || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirm({
  tx,
  onClose,
  onDeleted,
}: {
  tx: Transaction;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast.success('Transaction deleted');
      utils.transactions.list.invalidate();
      utils.dashboard.stats.invalidate();
      onDeleted();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Transaction</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{' '}
          <span className="font-medium text-foreground">{tx.description}</span>? This cannot be
          undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate({ id: tx.id })}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkDeleteConfirm({
  count,
  ids,
  onClose,
  onDeleted,
}: {
  count: number;
  ids: string[];
  onClose: () => void;
  onDeleted: () => void;
}) {
  const utils = trpc.useUtils();
  const bulkDeleteMutation = trpc.transactions.bulkDelete.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.deleted} transaction${res.deleted !== 1 ? 's' : ''} deleted`);
      utils.transactions.list.invalidate();
      utils.dashboard.stats.invalidate();
      onDeleted();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Transactions</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{' '}
          <span className="font-medium text-foreground">{count} transactions</span>? This cannot be
          undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => bulkDeleteMutation.mutate({ ids })}
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${count}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Transactions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get('tab') ?? 'queued';
  const q = searchParams.get('q') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const companyId = searchParams.get('companyId') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const sortBy = (searchParams.get('sortBy') as SortBy) ?? 'date';
  const sortDir = (searchParams.get('sortDir') as SortDir) ?? 'desc';

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [processQueue, setProcessQueue] = useState<TxItem[]>([]);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      if (key !== 'page') next.set('page', '1');
      return next;
    });
    setSelectedIds(new Set());
  }

  function toggleSort(col: SortBy) {
    if (sortBy === col) {
      setParam('sortDir', sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('sortBy', col);
        next.set('sortDir', col === 'date' ? 'desc' : 'asc');
        next.set('page', '1');
        return next;
      });
    }
    setSelectedIds(new Set());
  }

  const { data, isLoading } = trpc.transactions.list.useQuery({
    page,
    pageSize: 20,
    status: tab === 'all' ? undefined : tab,
    q: q || undefined,
    companyId: companyId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy,
    sortDir,
  });

  const { data: companiesData } = trpc.companies.listAll.useQuery();

  const items: Transaction[] = (data?.items ?? []) as Transaction[];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;
  const selectedList = [...selectedIds];
  const singleTx =
    selectedIds.size === 1 ? (items.find((t) => selectedIds.has(t.id)) ?? null) : null;

  function toggleSelectAll() {
    if (items.every((t) => selectedIds.has(t.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((t) => t.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openProcess() {
    let queue: TxItem[];
    if (selectedIds.size > 0) {
      queue = items.filter((t) => selectedIds.has(t.id) && t.status === 'queued') as TxItem[];
    } else {
      queue = items.filter((t) => t.status === 'queued') as TxItem[];
    }
    if (queue.length === 0) {
      toast.error('No queued transactions to process');
      return;
    }
    setProcessQueue(queue);
    setProcessModalOpen(true);
  }

  const hasActiveFilters = !!(q || companyId || dateFrom || dateTo);

  function clearFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('q');
      next.delete('companyId');
      next.delete('dateFrom');
      next.delete('dateTo');
      next.set('page', '1');
      return next;
    });
    setSelectedIds(new Set());
  }

  const allPageSelected = items.length > 0 && items.every((t) => selectedIds.has(t.id));
  const somePageSelected = items.some((t) => selectedIds.has(t.id));

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Tabs + action buttons */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setParam('tab', v);
              setSelectedIds(new Set());
            }}
          >
            <TabsList>
              <TabsTrigger value="queued">Queued</TabsTrigger>
              <TabsTrigger value="processed">Processed</TabsTrigger>
              <TabsTrigger value="flagged">Flagged</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => downloadCSV(items)}
              disabled={items.length === 0}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            {tab === 'queued' && (
              <Button size="sm" className="gap-2" onClick={openProcess}>
                <Play className="h-4 w-4" />
                Process
              </Button>
            )}
          </div>
        </div>

        {/* Filter / selection bar */}
        {selectedIds.size === 0 ? (
          /* Filter bar */
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search transactions..."
                className="pl-9"
                value={q}
                onChange={(e) => setParam('q', e.target.value)}
              />
            </div>

            <Select
              value={companyId || '__all__'}
              onValueChange={(v) => setParam('companyId', v === '__all__' ? '' : v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All companies</SelectItem>
                {(companiesData ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="w-[140px]"
              value={dateFrom}
              onChange={(e) => setParam('dateFrom', e.target.value)}
            />
            <Input
              type="date"
              className="w-[140px]"
              value={dateTo}
              onChange={(e) => setParam('dateTo', e.target.value)}
            />

            <Select
              value={`${sortBy}:${sortDir}`}
              onValueChange={(v) => {
                const [sb, sd] = v.split(':') as [SortBy, SortDir];
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('sortBy', sb);
                  next.set('sortDir', sd);
                  next.set('page', '1');
                  return next;
                });
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date:desc">Date (newest)</SelectItem>
                <SelectItem value="date:asc">Date (oldest)</SelectItem>
                <SelectItem value="amount:desc">Amount (highest)</SelectItem>
                <SelectItem value="amount:asc">Amount (lowest)</SelectItem>
                <SelectItem value="description:asc">Description (A–Z)</SelectItem>
                <SelectItem value="description:desc">Description (Z–A)</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={clearFilters}
              >
                <X className="h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>
        ) : selectedIds.size === 1 && singleTx ? (
          /* Single-select action bar */
          <div className="flex items-center gap-2 flex-wrap rounded-lg border border-border bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground mr-1">1 selected</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              onClick={openProcess}
              disabled={singleTx.status !== 'queued'}
            >
              <Play className="h-3.5 w-3.5" />
              Process
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => setEditTx(singleTx)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteTx(singleTx)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            </div>
          </div>
        ) : (
          /* Bulk action bar */
          <div className="flex items-center gap-2 flex-wrap rounded-lg border border-border bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <BulkCategoryPopover
              selectedIds={selectedList}
              onDone={() => setSelectedIds(new Set())}
            />
            <BulkSupplierPopover
              selectedIds={selectedList}
              onDone={() => setSelectedIds(new Set())}
            />
            <BulkRelationPopover
              selectedIds={selectedList}
              onDone={() => setSelectedIds(new Set())}
            />
            <BulkNotesPopover
              selectedIds={selectedList}
              onDone={() => setSelectedIds(new Set())}
            />
            <BulkFlagPopover
              selectedIds={selectedList}
              onDone={() => setSelectedIds(new Set())}
            />
            {tab === 'queued' && (
              <Button size="sm" variant="outline" className="gap-2 h-8" onClick={openProcess}>
                <Play className="h-3.5 w-3.5" />
                Process
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-2 h-8 text-destructive hover:text-destructive"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={allPageSelected}
                    data-state={somePageSelected && !allPageSelected ? 'indeterminate' : undefined}
                    onCheckedChange={toggleSelectAll}
                    disabled={items.length === 0}
                  />
                </th>
                <th
                  className="text-left px-3 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort('date')}
                >
                  Date <SortIcon col="date" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th
                  className="text-left px-3 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort('description')}
                >
                  Description <SortIcon col="description" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th
                  className="text-right px-3 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort('amount')}
                >
                  Amount <SortIcon col="amount" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th className="text-right px-3 py-3 font-medium text-muted-foreground hidden xl:table-cell">
                  Balance
                </th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Company / Account
                </th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Category
                </th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden xl:table-cell">
                  Supplier
                </th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden xl:table-cell">
                  Relation
                </th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                  Status
                </th>
                <th className="w-20 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center">
                    <ArrowLeftRight className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {hasActiveFilters || q
                        ? 'No transactions match your filters.'
                        : tab === 'queued'
                          ? 'No queued transactions.'
                          : tab === 'processed'
                            ? 'No processed transactions.'
                            : 'No flagged transactions.'}
                    </p>
                    {tab === 'queued' && !hasActiveFilters && !q && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Upload a bank statement from the Dashboard to get started.
                      </p>
                    )}
                    {(hasActiveFilters || q) && (
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
                items.map((tx) => {
                  const amountNum = parseFloat(tx.amount);
                  const isCredit = amountNum >= 0;
                  const isSelected = selectedIds.has(tx.id);

                  return (
                    <tr
                      key={tx.id}
                      className={cn(
                        'group border-b border-border last:border-0 hover:bg-muted/20 transition-colors',
                        isSelected && 'bg-primary/5',
                      )}
                    >
                      <td className="w-10 px-3 py-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(tx.id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap text-xs">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <p className="truncate text-sm font-medium">{tx.description}</p>
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap text-sm',
                          isCredit ? 'text-green-600' : 'text-red-600',
                        )}
                      >
                        {isCredit ? '+' : ''}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground tabular-nums whitespace-nowrap text-xs hidden xl:table-cell">
                        {tx.runningBalance ? formatCurrency(tx.runningBalance) : '—'}
                      </td>
                      <td className="px-3 py-2 hidden lg:table-cell">
                        <p className="font-medium text-xs truncate max-w-[130px]">
                          {tx.companyName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[130px]">
                          {tx.bankAccountLabel}
                        </p>
                      </td>
                      {/* Inline-editable: Category */}
                      <td className="px-2 py-1.5 hidden md:table-cell">
                        <InlineCategoryCell tx={tx} />
                      </td>
                      {/* Inline-editable: Supplier */}
                      <td className="px-2 py-1.5 hidden xl:table-cell">
                        <InlineSupplierCell tx={tx} />
                      </td>
                      {/* Inline-editable: Relation */}
                      <td className="px-2 py-1.5 hidden xl:table-cell">
                        <InlineRelationCell tx={tx} />
                      </td>
                      <td className="px-3 py-2 hidden sm:table-cell">
                        <StatusBadge status={tx.status} />
                      </td>
                      {/* Per-row actions */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-0.5 justify-end">
                          <InlineNotesCell tx={tx} />
                          <InlineFlagCell tx={tx} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="p-1 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                onClick={() => setDeleteTx(tx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                                onClick={() => {
                                  if (tx.uploadId) navigate(`/transactions?uploadId=${tx.uploadId}`);
                                }}
                              >
                                <Users className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>View upload</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data?.total ?? 0} transaction{(data?.total ?? 0) !== 1 ? 's' : ''}
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

        {/* Modals */}
        {processModalOpen && processQueue.length > 0 && (
          <ProcessModal
            open={processModalOpen}
            onOpenChange={setProcessModalOpen}
            txQueue={processQueue}
            onAllDone={() => setSelectedIds(new Set())}
          />
        )}
        {editTx && (
          <EditModal
            tx={editTx}
            onClose={() => setEditTx(null)}
            onSaved={() => setSelectedIds(new Set())}
          />
        )}
        {deleteTx && (
          <DeleteConfirm
            tx={deleteTx}
            onClose={() => setDeleteTx(null)}
            onDeleted={() => setSelectedIds(new Set())}
          />
        )}
        {bulkDeleteOpen && (
          <BulkDeleteConfirm
            count={selectedIds.size}
            ids={selectedList}
            onClose={() => setBulkDeleteOpen(false)}
            onDeleted={() => setSelectedIds(new Set())}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
