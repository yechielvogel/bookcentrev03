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

interface Partner {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  partnerShare?: string | null;
  partnerDividendAmount?: string | null;
  partnerDividendFrequency?: string | null;
  investmentAmount?: string | null;
  openingBalance?: string | null;
  adminNote?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  existing?: Partner;
  onSaved: () => void;
}

export function PartnerModal({ open, onOpenChange, companyId, existing, onSaved }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [partnerShare, setPartnerShare] = useState('');
  const [dividendAmount, setDividendAmount] = useState('');
  const [dividendFrequency, setDividendFrequency] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setEmail(existing.email ?? '');
      setPhone(existing.phone ?? '');
      setPartnerShare(existing.partnerShare ?? '');
      setDividendAmount(existing.partnerDividendAmount ?? '');
      setDividendFrequency(existing.partnerDividendFrequency ?? '');
      setInvestmentAmount(existing.investmentAmount ?? '');
      setOpeningBalance(existing.openingBalance ?? '0');
      setAdminNote(existing.adminNote ?? '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setPartnerShare('');
      setDividendAmount('');
      setDividendFrequency('');
      setInvestmentAmount('');
      setOpeningBalance('0');
      setAdminNote('');
    }
  }, [existing, open]);

  const utils = trpc.useUtils();

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success('Partner added. New contact created in Contacts.');
      onSaved();
      onOpenChange(false);
      utils.contacts.listByCompany.invalidate({ companyId });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success('Partner updated');
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = name.trim().length > 0 && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (existing) {
      updateMutation.mutate({
        id: existing.id,
        name,
        email: email || null,
        phone: phone || null,
        partnerShare: partnerShare || null,
        partnerDividendAmount: dividendAmount || null,
        partnerDividendFrequency: dividendFrequency || null,
        investmentAmount: investmentAmount || null,
        adminNote: adminNote || null,
      });
    } else {
      createMutation.mutate({
        name,
        email: email || undefined,
        phone: phone || undefined,
        role: 'partner',
        companyId,
        partnerShare: partnerShare || undefined,
        partnerDividendAmount: dividendAmount || undefined,
        partnerDividendFrequency: dividendFrequency || undefined,
        investmentAmount: investmentAmount || undefined,
        openingBalance: openingBalance || '0',
        adminNote: adminNote || undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Partner' : 'Add Partner'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>
                Partner Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@example.com"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44..."
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Share %</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={partnerShare}
                onChange={(e) => setPartnerShare(e.target.value)}
                placeholder="e.g. 25"
                disabled={isPending}
              />
            </div>
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
            <div className="space-y-1.5">
              <Label>Investment Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                placeholder="0.00"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dividend Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={dividendAmount}
                onChange={(e) => setDividendAmount(e.target.value)}
                placeholder="0.00"
                disabled={isPending}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Dividend Frequency</Label>
              <Select value={dividendFrequency} onValueChange={setDividendFrequency}>
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
            <div className="col-span-2 space-y-1.5">
              <Label>Admin Note</Label>
              <Input
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Internal note"
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending ? 'Saving...' : existing ? 'Save' : 'Add Partner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
