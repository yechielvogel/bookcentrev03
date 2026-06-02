import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export interface TxItem {
  id: string;
  transactionDate: string | Date;
  description: string;
  amount: string;
  status: string;
  companyName: string;
  bankAccountLabel: string;
  categoryId: string | null;
  relationId: string | null;
  supplierId: string | null;
  notes: string | null;
  flagReason: string | null;
  categoryName: string | null;
}

interface ProcessState {
  categoryId: string;
  relationRole: string;
  relationId: string;
  supplierId: string;
  notes: string;
  flag: boolean;
  flagReason: string;
  showRelation: boolean;
  showSupplier: boolean;
  showNote: boolean;
  showFlag: boolean;
}

function defaultState(tx: TxItem): ProcessState {
  return {
    categoryId: tx.categoryId ?? '',
    relationRole: 'partner',
    relationId: tx.relationId ?? '',
    supplierId: tx.supplierId ?? '',
    notes: tx.notes ?? '',
    flag: false,
    flagReason: tx.flagReason ?? '',
    showRelation: !!tx.relationId,
    showSupplier: !!tx.supplierId,
    showNote: !!tx.notes,
    showFlag: false,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  txQueue: TxItem[];
  onAllDone: (count: number) => void;
}

export function ProcessModal({ open, onOpenChange, txQueue, onAllDone }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<ProcessState>(() =>
    defaultState(txQueue[0] ?? ({} as TxItem)),
  );
  const [processedCount, setProcessedCount] = useState(0);

  // Create category sub-dialog
  const [createCatOpen, setCreateCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('');

  const utils = trpc.useUtils();
  const currentTx = txQueue[currentIndex];

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setProcessedCount(0);
      if (txQueue[0]) setState(defaultState(txQueue[0]));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (txQueue[currentIndex]) setState(defaultState(txQueue[currentIndex]));
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: categoriesData } = trpc.categories.list.useQuery(undefined, { enabled: open });
  const { data: contactsData } = trpc.contacts.listAll.useQuery(undefined, { enabled: open });
  const { data: suppliersData } = trpc.suppliers.list.useQuery(undefined, { enabled: open });

  const processMutation = trpc.transactions.process.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createCatMutation = trpc.categories.create.useMutation({
    onSuccess: (cat) => {
      utils.categories.list.invalidate();
      setState((s) => ({ ...s, categoryId: cat.id }));
      setCreateCatOpen(false);
      setNewCatName('');
      setNewCatType('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (!currentTx) return null;

  const isSingle = txQueue.length === 1;
  const isLast = currentIndex === txQueue.length - 1;
  const isPending = processMutation.isPending || createCatMutation.isPending;

  const filteredContacts = (contactsData ?? []).filter((c) => c.role === state.relationRole);

  async function handleProcess(advance: boolean, finish: boolean) {
    if (!state.categoryId) {
      toast.error('Category must be selected for transaction to be processed');
      return;
    }

    try {
      await processMutation.mutateAsync({
        id: currentTx.id,
        categoryId: state.categoryId,
        relationId: state.showRelation && state.relationId ? state.relationId : null,
        supplierId: state.showSupplier && state.supplierId ? state.supplierId : null,
        notes: state.showNote && state.notes ? state.notes : null,
        flag: state.showFlag && state.flag,
        flagReason: state.showFlag && state.flag ? state.flagReason : null,
      });

      const newCount = processedCount + 1;
      setProcessedCount(newCount);

      if (finish || isSingle || (!advance && !finish)) {
        toast.success(`${newCount} transaction${newCount !== 1 ? 's' : ''} processed successfully`);
        onAllDone(newCount);
        onOpenChange(false);
      } else if (advance && !isLast) {
        setCurrentIndex((i) => i + 1);
      } else {
        // last item in queue when advancing
        toast.success(`${newCount} transaction${newCount !== 1 ? 's' : ''} processed successfully`);
        onAllDone(newCount);
        onOpenChange(false);
      }
    } catch {
      // error handled by onError
    }
  }

  const amountNum = parseFloat(currentTx.amount);
  const isCredit = amountNum >= 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Process Transaction</DialogTitle>
              {txQueue.length > 1 && (
                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} / {txQueue.length}
                </span>
              )}
            </div>
          </DialogHeader>

          {/* Transaction header */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
            <p className="font-medium text-sm truncate">{currentTx.description}</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground truncate">
                {new Date(currentTx.transactionDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
                {' · '}
                {currentTx.companyName} · {currentTx.bankAccountLabel}
              </span>
              <span
                className={cn(
                  'font-semibold text-sm shrink-0',
                  isCredit ? 'text-green-600' : 'text-red-600',
                )}
              >
                {isCredit ? '+' : ''}
                {amountNum.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={state.categoryId}
                onValueChange={(v) => {
                  if (v === '__create__') {
                    setCreateCatOpen(true);
                    return;
                  }
                  setState((s) => ({ ...s, categoryId: v }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category..." />
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

            {/* Optional section toggles */}
            <div className="flex flex-wrap gap-3">
              {!state.showRelation && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setState((s) => ({ ...s, showRelation: true }))}
                >
                  + Add Relation
                </button>
              )}
              {!state.showSupplier && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setState((s) => ({ ...s, showSupplier: true }))}
                >
                  + Add Supplier
                </button>
              )}
              {!state.showNote && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setState((s) => ({ ...s, showNote: true }))}
                >
                  + Add Note
                </button>
              )}
              {!state.showFlag && (
                <button
                  type="button"
                  className="text-xs text-amber-600 hover:underline"
                  onClick={() => setState((s) => ({ ...s, showFlag: true, flag: true }))}
                >
                  + Flag Transaction
                </button>
              )}
            </div>

            {/* Relation */}
            {state.showRelation && (
              <div className="p-3 rounded-lg border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Relation</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setState((s) => ({ ...s, showRelation: false, relationId: '' }))}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={state.relationRole}
                      onValueChange={(v) =>
                        setState((s) => ({ ...s, relationRole: v, relationId: '' }))
                      }
                    >
                      <SelectTrigger className="h-8">
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
                    <Label className="text-xs">Contact</Label>
                    <Select
                      value={state.relationId}
                      onValueChange={(v) => setState((s) => ({ ...s, relationId: v }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredContacts.length === 0 ? (
                          <SelectItem value="__none__" disabled>
                            No {state.relationRole}s found
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
              </div>
            )}

            {/* Supplier */}
            {state.showSupplier && (
              <div className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Supplier</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setState((s) => ({ ...s, showSupplier: false, supplierId: '' }))}
                  >
                    Remove
                  </button>
                </div>
                <Select
                  value={state.supplierId}
                  onValueChange={(v) => setState((s) => ({ ...s, supplierId: v }))}
                >
                  <SelectTrigger className="h-8">
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
              </div>
            )}

            {/* Note */}
            {state.showNote && (
              <div className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Note</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setState((s) => ({ ...s, showNote: false, notes: '' }))}
                  >
                    Remove
                  </button>
                </div>
                <Textarea
                  className="min-h-[60px]"
                  value={state.notes}
                  onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Add a note..."
                  disabled={isPending}
                />
              </div>
            )}

            {/* Flag */}
            {state.showFlag && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-amber-700">Flag Transaction</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setState((s) => ({ ...s, showFlag: false, flag: false, flagReason: '' }))
                    }
                  >
                    Remove
                  </button>
                </div>
                <Input
                  value={state.flagReason}
                  onChange={(e) => setState((s) => ({ ...s, flagReason: e.target.value }))}
                  placeholder="Reason for flagging (optional)..."
                  disabled={isPending}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            {isSingle ? (
              <Button
                onClick={() => handleProcess(false, false)}
                disabled={!state.categoryId || isPending}
              >
                {isPending ? 'Processing...' : 'Process'}
              </Button>
            ) : isLast ? (
              <Button
                onClick={() => handleProcess(false, true)}
                disabled={!state.categoryId || isPending}
              >
                {isPending ? 'Processing...' : 'Process & Finish'}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleProcess(false, false)}
                  disabled={!state.categoryId || isPending}
                >
                  Process
                </Button>
                <Button
                  onClick={() => handleProcess(true, false)}
                  disabled={!state.categoryId || isPending}
                >
                  {isPending ? 'Processing...' : 'Process & Next'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category sub-dialog */}
      <Dialog open={createCatOpen} onOpenChange={setCreateCatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Office Supplies"
                disabled={createCatMutation.isPending}
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
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="charity">Charity</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateCatOpen(false)}
              disabled={createCatMutation.isPending}
            >
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
