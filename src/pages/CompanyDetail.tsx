import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, FileText, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { BankAccountModal } from '@/components/companies/BankAccountModal';
import { BillModal } from '@/components/companies/BillModal';
import { PartnerModal } from '@/components/companies/PartnerModal';

function formatCurrency(v: string | number | null | undefined) {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(d));
}

// ─── Details Section ──────────────────────────────────────────────────────────

function DetailsSection({
  company,
}: {
  company: NonNullable<ReturnType<typeof useCompany>['data']>;
}) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(company.name);
  const [description, setDescription] = useState(company.description ?? '');
  const [registeredAddress, setRegisteredAddress] = useState(company.registeredAddress ?? '');

  const holder = company.contacts.find((c) => c.role === 'holder');

  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success('Company details updated');
      setEditing(false);
      utils.companies.getById.invalidate({ id: company.id });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleSave() {
    updateMutation.mutate({
      id: company.id,
      name,
      description: description || undefined,
      registeredAddress: registeredAddress || undefined,
    });
  }

  function handleCancel() {
    setName(company.name);
    setDescription(company.description ?? '');
    setRegisteredAddress(company.registeredAddress ?? '');
    setEditing(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Company Details</h3>
        {!editing ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-7"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 h-7" onClick={handleCancel}>
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-7"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Save className="h-3.5 w-3.5" /> {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Company Name</p>
          {editing ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          ) : (
            <p className="text-sm font-medium">{company.name}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Description</p>
          {editing ? (
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-sm"
              placeholder="Optional"
            />
          ) : (
            <p className="text-sm">
              {company.description || <span className="text-muted-foreground/50">—</span>}
            </p>
          )}
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground mb-1">Registered Address</p>
          {editing ? (
            <Input
              value={registeredAddress}
              onChange={(e) => setRegisteredAddress(e.target.value)}
              className="h-8 text-sm"
              placeholder="Optional"
            />
          ) : (
            <p className="text-sm">
              {company.registeredAddress || <span className="text-muted-foreground/50">—</span>}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Company Holder</p>
          <p className="text-sm">
            {holder?.name ?? <span className="text-muted-foreground/50">—</span>}
          </p>
        </div>
        {holder && (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Holder Email</p>
              <p className="text-sm">
                {holder.email ?? <span className="text-muted-foreground/50">—</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Holder Phone</p>
              <p className="text-sm">
                {holder.phone ?? <span className="text-muted-foreground/50">—</span>}
              </p>
            </div>
          </>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Created</p>
          <p className="text-sm">{formatDate(company.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Bank Accounts Section ────────────────────────────────────────────────────

function BankAccountsSection({
  company,
}: {
  company: NonNullable<ReturnType<typeof useCompany>['data']>;
}) {
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<
    (typeof company.bankAccounts)[0] | undefined
  >(undefined);

  const deleteMutation = trpc.bankAccounts.delete.useMutation({
    onSuccess: () => {
      toast.success('Bank account deleted');
      utils.companies.getById.invalidate({ id: company.id });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bank Accounts</h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-7"
          onClick={() => {
            setEditingAccount(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add account
        </Button>
      </div>

      {company.bankAccounts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No bank accounts yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {company.bankAccounts.map((ba) => (
            <div key={ba.id} className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{ba.bankName}</p>
                  <p className="text-xs text-muted-foreground">{ba.accountHolderName}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                    onClick={() => {
                      setEditingAccount(ba);
                      setModalOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete bank account "${ba.bankName} – ${ba.accountNumber}"?`)) {
                        deleteMutation.mutate({ id: ba.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-y-1 text-xs">
                <span className="text-muted-foreground">Account</span>
                <span>{ba.accountNumber}</span>
                <span className="text-muted-foreground">Sort code</span>
                <span>{ba.sortCode}</span>
                <span className="text-muted-foreground">Balance</span>
                <span className="font-medium">{formatCurrency(ba.balance)}</span>
              </div>
              {ba.adminNote && (
                <p className="text-xs text-muted-foreground italic">{ba.adminNote}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <BankAccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        companyId={company.id}
        existing={editingAccount}
        onSaved={() => utils.companies.getById.invalidate({ id: company.id })}
      />
    </div>
  );
}

// ─── Bills Section ────────────────────────────────────────────────────────────

interface BillItem {
  id: string;
  companyId: string;
  supplierId: string | null;
  supplierName: string | null;
  name: string;
  amount: string;
  dueDate: string;
  recurring: boolean;
  recurrenceType: string | null;
  recurrenceConfig?: unknown;
  status: string;
  paidDate: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

function BillsSection({ companyId }: { companyId: string }) {
  const utils = trpc.useUtils();
  const { data: bills } = trpc.bills.listByCompany.useQuery({ companyId });
  const [modalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillItem | undefined>(undefined);
  const [billTab, setBillTab] = useState('upcoming');

  const deleteMutation = trpc.bills.delete.useMutation({
    onSuccess: () => {
      toast.success('Bill deleted');
      utils.bills.listByCompany.invalidate({ companyId });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const today = new Date();
  const upcoming = bills?.filter((b) => b.status !== 'paid' && !b.recurring) ?? [];
  const paid = bills?.filter((b) => b.status === 'paid') ?? [];
  const recurring = bills?.filter((b) => b.recurring) ?? [];

  const totalDebt = upcoming.reduce((sum, b) => sum + parseFloat(b.amount), 0);

  function billList(items: BillItem[]) {
    if (!items || items.length === 0) {
      return <p className="text-sm text-muted-foreground py-6 text-center">No bills.</p>;
    }
    return (
      <div className="space-y-2">
        {items.map((b) => {
          const due = new Date(b.dueDate);
          const overdue = due < today && b.status !== 'paid';
          return (
            <div
              key={b.id}
              className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => {
                setEditingBill(b);
                setBillModalOpen(true);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  {b.supplierName && (
                    <p className="text-xs text-muted-foreground">{b.supplierName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold">{formatCurrency(b.amount)}</span>
                  <button
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete bill "${b.name}"?`)) deleteMutation.mutate({ id: b.id });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                >
                  Due {formatDate(b.dueDate)}
                </span>
                {b.recurring && b.recurrenceType && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {b.recurrenceType}
                  </Badge>
                )}
                {b.status === 'paid' && b.paidDate && (
                  <span className="text-xs text-green-700">Paid {formatDate(b.paidDate)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Bills</h3>
          {totalDebt > 0 && (
            <p className="text-xl font-bold text-destructive mt-0.5">{formatCurrency(totalDebt)}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-7"
          onClick={() => {
            setEditingBill(undefined);
            setBillModalOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Create bill
        </Button>
      </div>

      <Tabs value={billTab} onValueChange={setBillTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({paid.length})</TabsTrigger>
          <TabsTrigger value="recurring">Recurring ({recurring.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-3">
          {billList(upcoming)}
        </TabsContent>
        <TabsContent value="paid" className="mt-3">
          {billList(paid)}
        </TabsContent>
        <TabsContent value="recurring" className="mt-3">
          {billList(recurring)}
        </TabsContent>
      </Tabs>

      <BillModal
        open={modalOpen}
        onOpenChange={setBillModalOpen}
        companyId={companyId}
        existing={editingBill}
        onSaved={() => utils.bills.listByCompany.invalidate({ companyId })}
      />
    </div>
  );
}

// ─── Partners Section ─────────────────────────────────────────────────────────

function PartnersSection({
  company,
}: {
  company: NonNullable<ReturnType<typeof useCompany>['data']>;
}) {
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<(typeof company.contacts)[0] | undefined>(
    undefined,
  );

  const partners = company.contacts.filter((c) => c.role === 'partner');

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success('Partner removed');
      utils.companies.getById.invalidate({ id: company.id });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Partners</h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-7"
          onClick={() => {
            setEditingPartner(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add partner
        </Button>
      </div>

      {partners.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No partners yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {partners.map((p) => (
            <div key={p.id} className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                  {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                    onClick={() => {
                      setEditingPartner(p);
                      setModalOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remove partner "${p.name}"?`)) {
                        deleteMutation.mutate({ id: p.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-y-1 text-xs">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-medium">{formatCurrency(p.balance)}</span>
                {p.partnerShare && (
                  <>
                    <span className="text-muted-foreground">Share</span>
                    <span>{p.partnerShare}%</span>
                  </>
                )}
                {p.investmentAmount && (
                  <>
                    <span className="text-muted-foreground">Investment</span>
                    <span>{formatCurrency(p.investmentAmount)}</span>
                  </>
                )}
                {p.partnerDividendAmount && (
                  <>
                    <span className="text-muted-foreground">Dividend</span>
                    <span>
                      {formatCurrency(p.partnerDividendAmount)} /{' '}
                      {p.partnerDividendFrequency ?? '—'}
                    </span>
                  </>
                )}
              </div>
              {p.adminNote && <p className="text-xs text-muted-foreground italic">{p.adminNote}</p>}
            </div>
          ))}
        </div>
      )}

      <PartnerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        companyId={company.id}
        existing={editingPartner}
        onSaved={() => utils.companies.getById.invalidate({ id: company.id })}
      />
    </div>
  );
}

// ─── Transactions Section ─────────────────────────────────────────────────────

function TransactionsSection({
  companyId,
  bankAccounts,
}: {
  companyId: string;
  bankAccounts: { id: string; label?: string; bankName: string; accountNumber: string }[];
}) {
  const navigate = useNavigate();
  const [bankFilter, setBankFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.transactions.list.useQuery({
    companyId,
    bankAccountId: bankFilter || undefined,
    page,
    pageSize: 15,
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Transactions</h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5"
          onClick={() => navigate(`/transactions?companyId=${companyId}`)}
        >
          <FileText className="h-3.5 w-3.5" /> View all
        </Button>
      </div>

      {bankAccounts.length > 1 && (
        <select
          className="text-sm border border-border rounded-md px-3 py-1.5 bg-background"
          value={bankFilter}
          onChange={(e) => {
            setBankFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All bank accounts</option>
          {bankAccounts.map((b) => (
            <option key={b.id} value={b.id}>
              {b.bankName} – {b.accountNumber}
            </option>
          ))}
        </select>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">
                Bank
              </th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-3 py-2">
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No transactions found.
                </td>
              </tr>
            ) : (
              data?.items.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatDate(t.transactionDate)}
                  </td>
                  <td className="px-3 py-2 max-w-[200px] truncate">{t.description}</td>
                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                    {t.bankAccountLabel}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${parseFloat(t.amount) < 0 ? 'text-destructive' : 'text-green-700'}`}
                  >
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        t.status === 'queued'
                          ? 'secondary'
                          : t.status === 'processed'
                            ? 'default'
                            : 'outline'
                      }
                      className="capitalize text-xs"
                    >
                      {t.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
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
      )}
    </div>
  );
}

// ─── Hook & Main Page ─────────────────────────────────────────────────────────

function useCompany(id: string) {
  return trpc.companies.getById.useQuery({ id });
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: company, isLoading } = useCompany(id!);

  const deleteMutation = trpc.companies.delete.useMutation({
    onSuccess: () => {
      toast.success('Company deleted');
      utils.companies.listWithStats.invalidate();
      navigate('/companies');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Company not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/companies')}>
          Back to Companies
        </Button>
      </div>
    );
  }

  const totalBalance = company.bankAccounts.reduce(
    (sum, b) => sum + parseFloat(b.balance ?? '0'),
    0,
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            className="p-1.5 rounded hover:bg-muted shrink-0"
            onClick={() => navigate('/companies')}
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{company.name}</h1>
            <p className="text-2xl font-bold text-primary mt-0.5">{formatCurrency(totalBalance)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/reporting?companyId=${id}`)}
          >
            <BarChart2 className="h-4 w-4 mr-1.5" /> Reporting
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (
                confirm(`Delete company "${company.name}" and all its data? This cannot be undone.`)
              ) {
                deleteMutation.mutate({ id: company.id });
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="bankAccounts">
            Bank Accounts {company.bankAccounts.length > 0 && `(${company.bankAccounts.length})`}
          </TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="partners">
            Partners{' '}
            {company.contacts.filter((c) => c.role === 'partner').length > 0 &&
              `(${company.contacts.filter((c) => c.role === 'partner').length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <DetailsSection company={company} />
        </TabsContent>

        <TabsContent value="bankAccounts" className="mt-6">
          <BankAccountsSection company={company} />
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <TransactionsSection companyId={company.id} bankAccounts={company.bankAccounts} />
        </TabsContent>

        <TabsContent value="bills" className="mt-6">
          <BillsSection companyId={company.id} />
        </TabsContent>

        <TabsContent value="partners" className="mt-6">
          <PartnersSection company={company} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
