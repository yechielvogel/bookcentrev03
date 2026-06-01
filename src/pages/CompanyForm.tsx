import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BankAccountDraft {
  bankName: string;
  accountNumber: string;
  sortCode: string;
  accountHolderName: string;
  openingBalance: string;
}

function BankAccountDraftCard({
  draft,
  index,
  onChange,
  onRemove,
}: {
  draft: BankAccountDraft;
  index: number;
  onChange: (d: BankAccountDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3 relative">
      <button
        type="button"
        className="absolute top-3 right-3 p-1 rounded hover:bg-muted text-muted-foreground"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-sm font-medium">Bank Account {index + 1}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Bank Name *</Label>
          <Input
            value={draft.bankName}
            onChange={(e) => onChange({ ...draft, bankName: e.target.value })}
            placeholder="e.g. Barclays"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Account Holder Name *</Label>
          <Input
            value={draft.accountHolderName}
            onChange={(e) => onChange({ ...draft, accountHolderName: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Account Number *</Label>
          <Input
            value={draft.accountNumber}
            onChange={(e) => onChange({ ...draft, accountNumber: e.target.value })}
            placeholder="12345678"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Sort Code *</Label>
          <Input
            value={draft.sortCode}
            onChange={(e) => onChange({ ...draft, sortCode: e.target.value })}
            placeholder="00-00-00"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Opening Balance</Label>
          <Input
            type="number"
            step="0.01"
            value={draft.openingBalance}
            onChange={(e) => onChange({ ...draft, openingBalance: e.target.value })}
            placeholder="0.00"
          />
        </div>
      </div>
    </div>
  );
}

export default function CompanyForm() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  // Holder
  const [holderName, setHolderName] = useState('');
  const [holderEmail, setHolderEmail] = useState('');
  const [holderPhone, setHolderPhone] = useState('');
  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccountDraft[]>([]);

  const createCompany = trpc.companies.create.useMutation();
  const createContact = trpc.contacts.create.useMutation();
  const createBankAccount = trpc.bankAccounts.create.useMutation();

  const isPending =
    createCompany.isPending || createContact.isPending || createBankAccount.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const company = await createCompany.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        registeredAddress: registeredAddress.trim() || undefined,
      });

      if (holderName.trim()) {
        await createContact.mutateAsync({
          name: holderName.trim(),
          email: holderEmail.trim() || undefined,
          phone: holderPhone.trim() || undefined,
          role: 'holder',
          companyId: company.id,
        });
      }

      for (const ba of bankAccounts) {
        if (ba.bankName && ba.accountNumber && ba.sortCode && ba.accountHolderName) {
          await createBankAccount.mutateAsync({
            companyId: company.id,
            bankName: ba.bankName,
            accountNumber: ba.accountNumber,
            sortCode: ba.sortCode,
            accountHolderName: ba.accountHolderName,
            openingBalance: ba.openingBalance || '0',
          });
        }
      }

      toast.success('Company created successfully');
      utils.companies.listWithStats.invalidate();
      utils.companies.listAll.invalidate();
      navigate(`/companies/${company.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function addBankAccount() {
    setBankAccounts((prev) => [
      ...prev,
      { bankName: '', accountNumber: '', sortCode: '', accountHolderName: '', openingBalance: '0' },
    ]);
  }

  const canSubmit = name.trim().length > 0 && !isPending;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="p-1.5 rounded hover:bg-muted"
          onClick={() => navigate('/companies')}
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="text-lg font-semibold">Create Company</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Book Centre Ltd"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Registered Address</Label>
              <Input
                id="address"
                value={registeredAddress}
                onChange={(e) => setRegisteredAddress(e.target.value)}
                placeholder="Optional address"
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Company Holder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Holder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The company holder will also be added as a contact.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="holderName">Holder Name</Label>
                <Input
                  id="holderName"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Full name"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="holderEmail">Email</Label>
                <Input
                  id="holderEmail"
                  type="email"
                  value={holderEmail}
                  onChange={(e) => setHolderEmail(e.target.value)}
                  placeholder="holder@example.com"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="holderPhone">Phone</Label>
                <Input
                  id="holderPhone"
                  value={holderPhone}
                  onChange={(e) => setHolderPhone(e.target.value)}
                  placeholder="+44..."
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bankAccounts.length > 0 && (
              <div className="space-y-3">
                {bankAccounts.map((ba, i) => (
                  <BankAccountDraftCard
                    key={i}
                    draft={ba}
                    index={i}
                    onChange={(d) =>
                      setBankAccounts((prev) => prev.map((x, idx) => (idx === i ? d : x)))
                    }
                    onRemove={() => setBankAccounts((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="gap-2 w-full"
              onClick={addBankAccount}
            >
              <Plus className="h-4 w-4" />
              Add bank account
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/companies')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isPending ? 'Creating...' : 'Create Company'}
          </Button>
        </div>
      </form>
    </div>
  );
}
