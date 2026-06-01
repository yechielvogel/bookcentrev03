import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, X, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { getErrorMessage, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// ── helpers ───────────────────────────────────────────────────────────────────

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

const ROLE_LABELS: Record<string, string> = {
  holder: 'Company Holder',
  partner: 'Partner',
  lender: 'Lender',
  borrower: 'Borrower',
};

const ROLE_COLORS: Record<string, string> = {
  holder: 'bg-blue-100 text-blue-700 border-blue-200',
  partner: 'bg-purple-100 text-purple-700 border-purple-200',
  lender: 'bg-amber-100 text-amber-700 border-amber-200',
  borrower: 'bg-green-100 text-green-700 border-green-200',
};

// ── types ─────────────────────────────────────────────────────────────────────

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: string;
  companyId: string | null;
  companyName: string | null;
  balance: string | null;
  openingBalance: string | null;
  partnerShare: string | null;
  partnerDividendAmount: string | null;
  partnerDividendFrequency: string | null;
  investmentAmount: string | null;
  amountLentBorrowed: string | null;
  dateLentBorrowed: string | Date | null;
  adminNote: string | null;
  createdAt: string | Date;
};

// ── edit state ────────────────────────────────────────────────────────────────

function initEditState(c: Contact) {
  return {
    name: c.name,
    email: c.email ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    partnerShare: c.partnerShare ?? '',
    partnerDividendAmount: c.partnerDividendAmount ?? '',
    partnerDividendFrequency: c.partnerDividendFrequency ?? '',
    investmentAmount: c.investmentAmount ?? '',
    amountLentBorrowed: c.amountLentBorrowed ?? '',
    dateLentBorrowed: c.dateLentBorrowed
      ? new Date(c.dateLentBorrowed).toISOString().slice(0, 10)
      : '',
    adminNote: c.adminNote ?? '',
  };
}

// ── transactions table ────────────────────────────────────────────────────────

function RecentTransactions({ contactId }: { contactId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = trpc.transactions.list.useQuery({
    page: 1,
    pageSize: 5,
    relationId: contactId,
    sortBy: 'date',
    sortDir: 'desc',
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No transactions linked to this contact yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((tx) => {
        const amount = parseFloat(tx.amount);
        const isCredit = amount >= 0;
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{tx.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(tx.transactionDate)} · {tx.companyName}
              </p>
            </div>
            <span
              className={cn(
                'text-sm font-semibold shrink-0 tabular-nums',
                isCredit ? 'text-green-600' : 'text-red-600',
              )}
            >
              {isCredit ? '+' : ''}
              {formatCurrency(tx.amount)}
            </span>
          </div>
        );
      })}
      {(data?.total ?? 0) > 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-2 mt-1"
          onClick={() => navigate(`/transactions?relationId=${contactId}`)}
        >
          View all {data?.total} transactions
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<ReturnType<typeof initEditState> | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: contact, isLoading } = trpc.contacts.getById.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  // Keep edit state in sync when contact loads/changes
  useEffect(() => {
    if (contact) setEditState(initEditState(contact as Contact));
  }, [contact]);

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success('Contact updated');
      utils.contacts.getById.invalidate({ id: id! });
      utils.contacts.list.invalidate();
      setIsEditing(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success('Contact deleted');
      utils.contacts.list.invalidate();
      utils.contacts.listAll.invalidate();
      navigate('/contacts');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleSave() {
    if (!editState || !contact) return;
    updateMutation.mutate({
      id: contact.id,
      name: editState.name.trim() || contact.name,
      email: editState.email.trim() || null,
      phone: editState.phone.trim() || null,
      address: editState.address.trim() || null,
      partnerShare: editState.partnerShare || null,
      partnerDividendAmount: editState.partnerDividendAmount || null,
      partnerDividendFrequency: editState.partnerDividendFrequency || null,
      investmentAmount: editState.investmentAmount || null,
      amountLentBorrowed: editState.amountLentBorrowed || null,
      dateLentBorrowed: editState.dateLentBorrowed || null,
      adminNote: editState.adminNote.trim() || null,
    });
  }

  function handleCancelEdit() {
    if (contact) setEditState(initEditState(contact as Contact));
    setIsEditing(false);
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground">Contact not found.</p>
        <Button variant="outline" onClick={() => navigate('/contacts')}>
          Back to Contacts
        </Button>
      </div>
    );
  }

  const c = contact as Contact;
  const isPending = updateMutation.isPending;

  function field(
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { type?: string; placeholder?: string },
  ) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        {isEditing ? (
          <Input
            type={opts?.type ?? 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={opts?.placeholder}
            disabled={isPending}
            className="h-8"
          />
        ) : (
          <p className="text-sm py-1 min-h-[28px]">
            {value || <span className="text-muted-foreground/50">—</span>}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-muted shrink-0"
            onClick={() => navigate('/contacts')}
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{c.name}</h1>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                  ROLE_COLORS[c.role] ?? 'bg-muted text-muted-foreground',
                )}
              >
                {ROLE_LABELS[c.role] ?? c.role}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Balance:{' '}
              <span className="font-medium text-foreground">{formatCurrency(c.balance)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCancelEdit}
                disabled={isPending}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={!editState?.name.trim() || isPending}
              >
                <Check className="h-4 w-4" />
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Contact details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Full Name {isEditing && <span className="text-destructive">*</span>}
            </Label>
            {isEditing ? (
              <Input
                value={editState?.name ?? ''}
                onChange={(e) => setEditState((s) => s && { ...s, name: e.target.value })}
                disabled={isPending}
                className="h-8"
              />
            ) : (
              <p className="text-sm py-1">{c.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field(
              'Email',
              editState?.email ?? '',
              (v) => setEditState((s) => s && { ...s, email: v }),
              { type: 'email', placeholder: 'email@example.com' },
            )}
            {field(
              'Phone',
              editState?.phone ?? '',
              (v) => setEditState((s) => s && { ...s, phone: v }),
              { placeholder: '+44...' },
            )}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Address</Label>
              {isEditing ? (
                <Input
                  value={editState?.address ?? ''}
                  onChange={(e) => setEditState((s) => s && { ...s, address: e.target.value })}
                  disabled={isPending}
                  className="h-8"
                />
              ) : (
                <p className="text-sm py-1 min-h-[28px]">
                  {c.address || <span className="text-muted-foreground/50">—</span>}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-specific details */}
      {(c.role === 'holder' || c.role === 'partner') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {c.role === 'holder' ? 'Company Information' : 'Partnership Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {c.companyName && (
              <div className="space-y-1.5">
                <Label className="text-xs">Company</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm py-1">{c.companyName}</p>
                  {c.companyId && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => navigate(`/companies/${c.companyId}`)}
                    >
                      View →
                    </button>
                  )}
                </div>
              </div>
            )}

            {c.role === 'partner' && (
              <div className="grid grid-cols-2 gap-4">
                {field(
                  'Share %',
                  editState?.partnerShare ?? '',
                  (v) => setEditState((s) => s && { ...s, partnerShare: v }),
                  { type: 'number', placeholder: '0.00' },
                )}
                {field(
                  'Investment Amount',
                  editState?.investmentAmount ?? '',
                  (v) => setEditState((s) => s && { ...s, investmentAmount: v }),
                  { type: 'number', placeholder: '0.00' },
                )}
                {field(
                  'Dividend Amount',
                  editState?.partnerDividendAmount ?? '',
                  (v) => setEditState((s) => s && { ...s, partnerDividendAmount: v }),
                  { type: 'number', placeholder: '0.00' },
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Dividend Frequency</Label>
                  {isEditing ? (
                    <Select
                      value={editState?.partnerDividendFrequency ?? ''}
                      onValueChange={(v) =>
                        setEditState((s) => s && { ...s, partnerDividendFrequency: v })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm py-1 capitalize min-h-[28px]">
                      {c.partnerDividendFrequency || (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(c.role === 'lender' || c.role === 'borrower') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {c.role === 'lender' ? 'Lending Details' : 'Borrowing Details'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {field(
                `Amount ${c.role === 'lender' ? 'Lent' : 'Borrowed'}`,
                editState?.amountLentBorrowed ?? '',
                (v) => setEditState((s) => s && { ...s, amountLentBorrowed: v }),
                { type: 'number', placeholder: '0.00' },
              )}
              {field(
                `Date ${c.role === 'lender' ? 'Lent' : 'Borrowed'}`,
                editState?.dateLentBorrowed ?? '',
                (v) => setEditState((s) => s && { ...s, dateLentBorrowed: v }),
                { type: 'date' },
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Opening Balance</Label>
                <p className="text-sm py-1">{formatCurrency(c.openingBalance)}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Current Balance</Label>
                <p className="text-sm py-1 font-medium">{formatCurrency(c.balance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin Note</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editState?.adminNote ?? ''}
              onChange={(e) => setEditState((s) => s && { ...s, adminNote: e.target.value })}
              placeholder="Internal note..."
              disabled={isPending}
            />
          ) : (
            <p className="text-sm py-1 min-h-[40px] whitespace-pre-wrap">
              {c.adminNote || <span className="text-muted-foreground/50">No note</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => navigate(`/transactions?relationId=${c.id}`)}
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RecentTransactions contactId={c.id} />
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{c.name}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id: c.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
