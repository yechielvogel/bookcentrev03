import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIMEFRAMES = [
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'Full balance' },
] as const;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function formatDate(iso: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function MaaserModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<'30' | '60' | '90' | 'all'>('all');

  const { data, isLoading } = trpc.dashboard.maaserBalance.useQuery(
    { timeframe },
    { enabled: open },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Maaser Balance</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Outstanding balance */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Outstanding Maaser Balance</p>
            {isLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded w-32 mx-auto" />
            ) : (
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(data?.outstanding ?? 0)}
              </p>
            )}
            {data && !isLoading && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(data.maaserDue)} due · {formatCurrency(data.maaserPaid)} paid
              </p>
            )}
          </div>

          {/* Timeframe selector */}
          <div className="space-y-1.5">
            <Label>Timeframe</Label>
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recent charity transactions */}
          <div>
            <p className="text-sm font-medium mb-2">Recent Maaser Transactions</p>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : data?.recentTransactions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No maaser transactions recorded yet
                </div>
              ) : (
                data?.recentTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.transactionDate)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ml-3 shrink-0 ${
                        parseFloat(t.amount) < 0 ? 'text-destructive' : 'text-green-700'
                      }`}
                    >
                      {formatCurrency(parseFloat(t.amount))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate('/reporting?type=maaser');
            }}
          >
            Generate report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
