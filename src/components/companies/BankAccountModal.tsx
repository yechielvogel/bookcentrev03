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

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  sortCode: string;
  accountHolderName: string;
  openingBalance: string;
  adminNote?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  existing?: BankAccount;
  onSaved: () => void;
}

export function BankAccountModal({ open, onOpenChange, companyId, existing, onSaved }: Props) {
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    if (existing) {
      setBankName(existing.bankName);
      setAccountNumber(existing.accountNumber);
      setSortCode(existing.sortCode);
      setAccountHolderName(existing.accountHolderName);
      setOpeningBalance(existing.openingBalance ?? '0');
      setAdminNote(existing.adminNote ?? '');
    } else {
      setBankName('');
      setAccountNumber('');
      setSortCode('');
      setAccountHolderName('');
      setOpeningBalance('0');
      setAdminNote('');
    }
  }, [existing, open]);

  const createMutation = trpc.bankAccounts.create.useMutation({
    onSuccess: () => {
      toast.success('Bank account added');
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = trpc.bankAccounts.update.useMutation({
    onSuccess: () => {
      toast.success('Bank account updated');
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = bankName && accountNumber && sortCode && accountHolderName && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (existing) {
      updateMutation.mutate({
        id: existing.id,
        bankName,
        accountNumber,
        sortCode,
        accountHolderName,
        adminNote: adminNote || null,
      });
    } else {
      createMutation.mutate({
        companyId,
        bankName,
        accountNumber,
        sortCode,
        accountHolderName,
        openingBalance: openingBalance || '0',
        adminNote: adminNote || undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Bank Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Barclays"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Account Holder Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Account Number <span className="text-destructive">*</span>
              </Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="12345678"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Sort Code <span className="text-destructive">*</span>
              </Label>
              <Input
                value={sortCode}
                onChange={(e) => setSortCode(e.target.value)}
                placeholder="00-00-00"
                disabled={isPending}
              />
            </div>
            {!existing && (
              <div className="space-y-1.5">
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  disabled={isPending}
                />
              </div>
            )}
            <div className={`space-y-1.5 ${!existing ? '' : 'col-span-2'}`}>
              <Label>Admin Note</Label>
              <Input
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Optional note"
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
