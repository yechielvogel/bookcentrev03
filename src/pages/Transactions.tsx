import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ArrowLeftRight,
  ChevronUp,
  ChevronDown,
  Tag,
  Users,
  Building2,
  FileText,
  Flag,
  X,
  Download,
  Play,
  Pencil,
  Trash2,
  UserPlus,
  PackagePlus,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { getErrorMessage, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

// ── action modals ─────────────────────────────────────────────────────────────

// Categorise modal
function CategoriseModal({
  tx,
  onClose,
  onSaved,
}: {
  tx: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [categoryId, setCategoryId] = useState(tx.categoryId ?? '');
  const [createCatOpen, setCreateCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('');

  const { data: categoriesData } = trpc.categories.list.useQuery(undefined);

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast.success('Category updated');
      utils.transactions.list.invalidate();
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createCatMutation = trpc.categories.create.useMutation({
    onSuccess: (cat) => {
      utils.categories.list.invalidate();
      setCategoryId(cat.id);
      setCreateCatOpen(false);
      setNewCatName('');
      setNewCatType('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Categorise Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground truncate">{tx.description}</p>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  if (v === '__create__') {
                    setCreateCatOpen(true);
                    return;
                  }
                  setCategoryId(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__create__">+ Create new category</SelectItem>
                  {(categoriesData ?? []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                      <span className="text-muted-foreground ml-1 text-xs">({cat.type})</span>
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
              onClick={() => updateMutation.mutate({ id: tx.id, categoryId: categoryId || null })}
              disabled={!categoryId || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createCatOpen} onOpenChange={setCreateCatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Office Supplies"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={newCatType} onValueChange={setNewCatType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="maaser">Maaser</SelectItem>
                  <SelectItem value="dividend">Dividend</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="bill">Bill Payment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCatOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createCatMutation.mutate({ name: newCatName.trim(), type: newCatType })
              }
              disabled={!newCatName.trim() || !newCatType || createCatMutation.isPending}
            >
              {createCatMutation.isPending ? 'Creating...' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Edit modal
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

// Relation modal
function RelationModal({
  tx,
  onClose,
  onSaved,
}: {
  tx: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [relationRole, setRelationRole] = useState('partner');
  const [relationId, setRelationId] = useState(tx.relationId ?? '');
  const { data: contactsData } = trpc.contacts.listAll.useQuery(undefined);

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast.success('Relation updated');
      utils.transactions.list.invalidate();
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const filteredContacts = (contactsData ?? []).filter((c) => c.role === relationRole);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Relation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground truncate">{tx.description}</p>
          <div className="space-y-1.5">
            <Label>Relation Type</Label>
            <Select
              value={relationRole}
              onValueChange={(v) => {
                setRelationRole(v);
                setRelationId('');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="lender">Lender</SelectItem>
                <SelectItem value="borrower">Borrower</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contact</Label>
            <Select value={relationId} onValueChange={setRelationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select contact..." />
              </SelectTrigger>
              <SelectContent>
                {filteredContacts.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No {relationRole}s found
                  </SelectItem>
                ) : (
                  filteredContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate({ id: tx.id, relationId: relationId || null })}
            disabled={!relationId || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Supplier modal
function SupplierModal({
  tx,
  onClose,
  onSaved,
}: {
  tx: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [supplierId, setSupplierId] = useState(tx.supplierId ?? '');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: suppliersData } = trpc.suppliers.list.useQuery(undefined);

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast.success('Supplier updated');
      utils.transactions.list.invalidate();
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createSupplierMutation = trpc.suppliers.create.useMutation({
    onSuccess: (s) => {
      utils.suppliers.list.invalidate();
      setSupplierId(s.id);
      setCreating(false);
      setNewName('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground truncate">{tx.description}</p>
          {creating ? (
            <div className="space-y-1.5">
              <Label>New Supplier Name</Label>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter supplier name"
                />
                <Button
                  size="sm"
                  onClick={() => createSupplierMutation.mutate({ name: newName.trim() })}
                  disabled={!newName.trim() || createSupplierMutation.isPending}
                >
                  Add
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCreating(false)}>
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {(suppliersData ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setCreating(true)}
              >
                + Create new supplier
              </button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate({ id: tx.id, supplierId: supplierId || null })}
            disabled={!supplierId || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Note modal
function NoteModal({
  tx,
  onClose,
  onSaved,
}: {
  tx: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState(tx.notes ?? '');

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast.success('Note saved');
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
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground truncate">{tx.description}</p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note..."
            disabled={updateMutation.isPending}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate({ id: tx.id, notes: notes.trim() || null })}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Flag modal
function FlagModal({
  tx,
  onClose,
  onSaved,
}: {
  tx: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const isFlagged = tx.status === 'flagged';
  const [reason, setReason] = useState(tx.flagReason ?? '');

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast.success(isFlagged ? 'Transaction unflagged' : 'Transaction flagged');
      utils.transactions.list.invalidate();
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleSave() {
    if (isFlagged) {
      updateMutation.mutate({ id: tx.id, status: 'queued', flagReason: null });
    } else {
      updateMutation.mutate({ id: tx.id, status: 'flagged', flagReason: reason.trim() || null });
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isFlagged ? 'Unflag Transaction' : 'Flag Transaction'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground truncate">{tx.description}</p>
          {isFlagged ? (
            <p className="text-sm">
              This will remove the flag and return the transaction to <strong>queued</strong>{' '}
              status.
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for flagging..."
                disabled={updateMutation.isPending}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={isFlagged ? 'outline' : 'default'}
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : isFlagged ? 'Unflag' : 'Flag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete confirm
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

// Bulk delete confirm
function BulkDeleteConfirm({
  count,
  onClose,
  onDeleted,
  ids,
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

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [processQueue, setProcessQueue] = useState<TxItem[]>([]);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [categorizeTx, setCategorizeTx] = useState<Transaction | null>(null);
  const [relationTx, setRelationTx] = useState<Transaction | null>(null);
  const [supplierTx, setSupplierTx] = useState<Transaction | null>(null);
  const [noteTx, setNoteTx] = useState<Transaction | null>(null);
  const [flagTx, setFlagTx] = useState<Transaction | null>(null);
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

  // Select/deselect all on current page
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

        {/* Filter / action / bulk bar */}
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
              placeholder="From"
            />
            <Input
              type="date"
              className="w-[140px]"
              value={dateTo}
              onChange={(e) => setParam('dateTo', e.target.value)}
              placeholder="To"
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
          <div className="flex items-center gap-1 flex-wrap rounded-lg border border-border bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground mr-2">1 selected</span>
            <ActionButton
              icon={<Play className="h-4 w-4" />}
              label="Process"
              onClick={openProcess}
              disabled={singleTx.status !== 'queued'}
            />
            <ActionButton
              icon={<Pencil className="h-4 w-4" />}
              label="Edit"
              onClick={() => setEditTx(singleTx)}
            />
            <ActionButton
              icon={<Tag className="h-4 w-4" />}
              label="Categorise"
              onClick={() => setCategorizeTx(singleTx)}
            />
            <ActionButton
              icon={<UserPlus className="h-4 w-4" />}
              label="Relation"
              onClick={() => setRelationTx(singleTx)}
            />
            <ActionButton
              icon={<PackagePlus className="h-4 w-4" />}
              label="Supplier"
              onClick={() => setSupplierTx(singleTx)}
            />
            <ActionButton
              icon={<StickyNote className="h-4 w-4" />}
              label="Note"
              onClick={() => setNoteTx(singleTx)}
            />
            <ActionButton
              icon={<Flag className="h-4 w-4" />}
              label={singleTx.status === 'flagged' ? 'Unflag' : 'Flag'}
              onClick={() => setFlagTx(singleTx)}
            />
            <ActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete"
              onClick={() => setDeleteTx(singleTx)}
              destructive
            />
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
            {tab === 'queued' && (
              <Button size="sm" variant="outline" className="gap-2 h-8" onClick={openProcess}>
                <Play className="h-3.5 w-3.5" />
                Process Selected
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
                <th className="text-right px-3 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Balance
                </th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Company / Account
                </th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden xl:table-cell">
                  Category
                </th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                  Status
                </th>
                <th className="w-28 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
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
                        'border-b border-border last:border-0 hover:bg-muted/30',
                        isSelected && 'bg-primary/5',
                      )}
                    >
                      <td className="w-10 px-3 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(tx.id)}
                        />
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="px-3 py-3 max-w-[240px]">
                        <p className="truncate font-medium">{tx.description}</p>
                      </td>
                      <td
                        className={cn(
                          'px-3 py-3 text-right font-medium tabular-nums whitespace-nowrap',
                          isCredit ? 'text-green-600' : 'text-red-600',
                        )}
                      >
                        {isCredit ? '+' : ''}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground tabular-nums whitespace-nowrap hidden lg:table-cell">
                        {tx.runningBalance ? formatCurrency(tx.runningBalance) : '—'}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <p className="font-medium text-xs truncate max-w-[140px]">
                          {tx.companyName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {tx.bankAccountLabel}
                        </p>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell">
                        {tx.categoryName ? (
                          <div>
                            <p className="text-xs font-medium">{tx.categoryName}</p>
                            <p className="text-xs text-muted-foreground">{tx.categoryType}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {tx.relationName && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="p-1 rounded text-muted-foreground">
                                  <Users className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{tx.relationName}</TooltipContent>
                            </Tooltip>
                          )}
                          {tx.supplierName && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="p-1 rounded text-muted-foreground">
                                  <Building2 className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{tx.supplierName}</TooltipContent>
                            </Tooltip>
                          )}
                          {tx.notes && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="p-1 rounded text-muted-foreground">
                                  <FileText className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[200px]">{tx.notes}</TooltipContent>
                            </Tooltip>
                          )}
                          {tx.status === 'flagged' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="p-1 rounded text-amber-500">
                                  <Flag className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{tx.flagReason ?? 'Flagged'}</TooltipContent>
                            </Tooltip>
                          )}
                          <button
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                            onClick={() => {
                              if (tx.uploadId) {
                                navigate(`/transactions?uploadId=${tx.uploadId}`);
                              }
                            }}
                            title="View upload"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          </button>
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
        {categorizeTx && (
          <CategoriseModal
            tx={categorizeTx}
            onClose={() => setCategorizeTx(null)}
            onSaved={() => setSelectedIds(new Set())}
          />
        )}
        {relationTx && (
          <RelationModal
            tx={relationTx}
            onClose={() => setRelationTx(null)}
            onSaved={() => setSelectedIds(new Set())}
          />
        )}
        {supplierTx && (
          <SupplierModal
            tx={supplierTx}
            onClose={() => setSupplierTx(null)}
            onSaved={() => setSelectedIds(new Set())}
          />
        )}
        {noteTx && (
          <NoteModal
            tx={noteTx}
            onClose={() => setNoteTx(null)}
            onSaved={() => setSelectedIds(new Set())}
          />
        )}
        {flagTx && (
          <FlagModal
            tx={flagTx}
            onClose={() => setFlagTx(null)}
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

// ── action button helper ──────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors',
            destructive
              ? 'text-destructive hover:bg-destructive/10 disabled:opacity-40'
              : 'text-foreground hover:bg-muted disabled:opacity-40',
          )}
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="sm:hidden">{label}</TooltipContent>
    </Tooltip>
  );
}
