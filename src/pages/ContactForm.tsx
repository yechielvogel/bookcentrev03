import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ContactForm() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // Core fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<'lender' | 'borrower'>('lender');
  const [adminNote, setAdminNote] = useState('');

  // Lender/borrower specific
  const [amountLentBorrowed, setAmountLentBorrowed] = useState('');
  const [dateLentBorrowed, setDateLentBorrowed] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: (contact) => {
      toast.success('Contact created successfully');
      utils.contacts.list.invalidate();
      utils.contacts.listAll.invalidate();
      navigate(`/contacts/${contact.id}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      role,
      amountLentBorrowed: amountLentBorrowed || undefined,
      dateLentBorrowed: dateLentBorrowed || undefined,
      openingBalance: openingBalance || '0',
      adminNote: adminNote.trim() || undefined,
    });
  }

  const isPending = createMutation.isPending;
  const canSubmit = name.trim().length > 0 && !isPending;
  const roleLabel = role === 'lender' ? 'Lender' : 'Borrower';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="p-1.5 rounded hover:bg-muted"
          onClick={() => navigate('/contacts')}
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="text-lg font-semibold">Add Contact</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'lender' | 'borrower')}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lender">Lender</SelectItem>
                  <SelectItem value="borrower">Borrower</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Company holders and partners are created from the Companies section.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44..."
                  disabled={isPending}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Optional address"
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role-specific */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{roleLabel} Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount {role === 'lender' ? 'Lent' : 'Borrowed'}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountLentBorrowed}
                  onChange={(e) => setAmountLentBorrowed(e.target.value)}
                  placeholder="0.00"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Date {role === 'lender' ? 'Lent' : 'Borrowed'}</Label>
                <Input
                  id="date"
                  type="date"
                  value={dateLentBorrowed}
                  onChange={(e) => setDateLentBorrowed(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="openingBalance">Opening Balance</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin note */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Note</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Internal note (not visible to contact)"
              disabled={isPending}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/contacts')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isPending ? 'Creating...' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </div>
  );
}
