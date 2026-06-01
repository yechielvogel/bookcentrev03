import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';

interface Bill {
  id: string;
  name: string;
  amount: string;
  supplierId?: string | null;
  dueDate: string;
  recurring: boolean;
  recurrenceType?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  existing?: Bill;
  onSaved: () => void;
}

export function BillModal({ open, onOpenChange, companyId, existing, onSaved }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('');

  const { data: suppliers } = trpc.bills.listSuppliers.useQuery(undefined, { enabled: open });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setAmount(existing.amount);
      setSupplierId(existing.supplierId ?? '');
      setDueDate(existing.dueDate ? existing.dueDate.toString().split('T')[0] : '');
      setRecurring(existing.recurring);
      setRecurrenceType(existing.recurrenceType ?? '');
    } else {
      setName('');
      setAmount('');
      setSupplierId('');
      setNewSupplierName('');
      setDueDate('');
      setRecurring(false);
      setRecurrenceType('');
    }
  }, [existing, open]);

  const createMutation = trpc.bills.create.useMutation({
    onSuccess: () => {
      toast.success('Bill created');
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = trpc.bills.update.useMutation({
    onSuccess: () => {
      toast.success('Bill updated');
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = name && amount && dueDate && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (existing) {
      updateMutation.mutate({
        id: existing.id,
        name,
        amount,
        supplierId: supplierId || null,
        dueDate,
        recurring,
        recurrenceType: recurring ? recurrenceType || null : null,
      });
    } else {
      createMutation.mutate({
        companyId,
        name,
        amount,
        supplierId: supplierId || undefined,
        supplierName: !supplierId && newSupplierName ? newSupplierName : undefined,
        dueDate,
        recurring,
        recurrenceType: recurring ? recurrenceType || undefined : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Bill' : 'Create Bill'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Bill Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Office Rent"
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select or add supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No supplier</SelectItem>
                {suppliers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!supplierId && !existing && (
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Or type a new supplier name"
                className="mt-2"
                disabled={isPending}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="recurring"
              checked={recurring}
              onCheckedChange={(v) => setRecurring(v === true)}
            />
            <Label htmlFor="recurring" className="cursor-pointer">
              Recurring bill
            </Label>
          </div>

          {recurring && (
            <div className="space-y-1.5">
              <Label>Recurrence</Label>
              <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending ? 'Saving...' : existing ? 'Save' : 'Create Bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
