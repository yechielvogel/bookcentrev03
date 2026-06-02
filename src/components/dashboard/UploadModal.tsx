import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UploadSummary {
  valid: boolean;
  validationStatus: string;
  totalFound: number;
  duplicates: number;
  invalidRows: number;
  toImport: number;
  transactions: Array<{
    date: string;
    description: string;
    amount: string;
    runningBalance: string | null;
  }>;
  duplicateTransactions: Array<{
    date: string;
    description: string;
    amount: string;
    runningBalance: string | null;
  }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function UploadModal({ open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState<'form' | 'summary'>('form');
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [fileError, setFileError] = useState('');
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: companiesList } = trpc.companies.listAll.useQuery(undefined, { enabled: open });
  const { data: bankAccountsList } = trpc.bankAccounts.listByCompany.useQuery(
    { companyId },
    { enabled: open && !!companyId },
  );

  const processUpload = trpc.uploads.processUpload.useMutation({
    onSuccess: (data) => {
      setSummary(data);
      setStep('summary');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const confirmImport = trpc.uploads.confirmImport.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Import complete — ${data.transactionsImported} transaction${data.transactionsImported !== 1 ? 's' : ''} imported`,
      );
      handleClose();
      onImported();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  function handleClose() {
    if ((processUpload.isPending || confirmImport.isPending) && step === 'form') return;
    setStep('form');
    setFile(null);
    setCsvContent('');
    setCompanyId('');
    setBankAccountId('');
    setSummary(null);
    setFileError('');
    setSelectedDuplicates(new Set());
    onOpenChange(false);
  }

  function readFile(f: File) {
    setFileError('');
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setFileError('Invalid file type. Please upload a CSV file.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setFileError('File too large. Maximum size is 10 MB.');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setCsvContent((e.target?.result as string) ?? '');
    reader.readAsText(f);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) readFile(f);
  }, []);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) readFile(f);
  }

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !companyId || !bankAccountId || !csvContent) return;
    processUpload.mutate({ fileName: file.name, csvContent, companyId, bankAccountId });
  }

  function handleConfirm() {
    if (!summary || !file) return;
    const chosenDupes = summary.duplicateTransactions.filter((_, i) => selectedDuplicates.has(i));
    const transactions = [...summary.transactions, ...chosenDupes];
    confirmImport.mutate({
      fileName: file.name,
      companyId,
      bankAccountId,
      totalFound: summary.totalFound,
      duplicates: summary.duplicates - chosenDupes.length,
      invalidRows: summary.invalidRows,
      transactions,
    });
  }

  const canSubmit = !!file && !!companyId && !!bankAccountId && !processUpload.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Upload Statement</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ml-auto p-1 rounded hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setCsvContent('');
                        setFileError('');
                        if (inputRef.current) inputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your CSV file here
                    </p>
                    <p className="text-xs text-muted-foreground">CSV, up to 10 MB</p>
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />

              {!file && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => inputRef.current?.click()}
                >
                  Upload file from computer
                </Button>
              )}

              {fileError && (
                <Alert variant="destructive">
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label>
                  Company <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={companyId}
                  onValueChange={(v) => {
                    setCompanyId(v);
                    setBankAccountId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesList?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    {companiesList?.length === 0 && (
                      <SelectItem value="__none__" disabled>
                        No companies yet
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Bank Account <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={bankAccountId}
                  onValueChange={setBankAccountId}
                  disabled={!companyId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={companyId ? 'Select a bank account' : 'Select a company first'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccountsList?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.label}
                      </SelectItem>
                    ))}
                    {bankAccountsList?.length === 0 && (
                      <SelectItem value="__none__" disabled>
                        No bank accounts for this company
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {processUpload.isPending ? 'Processing...' : 'Upload statement'}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Upload Summary</DialogTitle>
            </DialogHeader>

            {summary && (
              <div className="space-y-4">
                {/* Validation status */}
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    summary.valid
                      ? 'bg-green-50 text-green-800'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {summary.valid ? (
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm font-medium">{summary.validationStatus}</p>
                </div>

                {/* Stats */}
                <div className="rounded-lg border border-border overflow-hidden">
                  {[
                    { label: 'Total transactions found', value: summary.totalFound },
                    { label: 'Duplicate transactions skipped', value: summary.duplicates - selectedDuplicates.size },
                    { label: 'Invalid rows detected', value: summary.invalidRows },
                    {
                      label: 'Final total to import',
                      value: summary.toImport + selectedDuplicates.size,
                      bold: true,
                    },
                  ].map(({ label, value, bold }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0"
                    >
                      <span
                        className={`text-sm ${bold ? 'font-semibold' : 'text-muted-foreground'}`}
                      >
                        {label}
                      </span>
                      <span className={`text-sm ${bold ? 'font-semibold' : ''}`}>{value}</span>
                    </div>
                  ))}
                </div>

                {summary.duplicates > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Duplicate transactions</p>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() =>
                          setSelectedDuplicates(
                            selectedDuplicates.size === summary.duplicateTransactions.length
                              ? new Set()
                              : new Set(summary.duplicateTransactions.map((_, i) => i)),
                          )
                        }
                      >
                        {selectedDuplicates.size === summary.duplicateTransactions.length
                          ? 'Deselect all'
                          : 'Select all'}
                      </button>
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto">
                      {summary.duplicateTransactions.map((t, i) => (
                        <label
                          key={i}
                          className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDuplicates.has(i)}
                            onChange={() => {
                              const next = new Set(selectedDuplicates);
                              if (next.has(i)) next.delete(i);
                              else next.add(i);
                              setSelectedDuplicates(next);
                            }}
                            className="h-4 w-4 shrink-0 accent-primary"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs truncate">{t.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(t.date).toLocaleDateString()} · £{parseFloat(t.amount).toFixed(2)}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {selectedDuplicates.size > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedDuplicates.size} duplicate{selectedDuplicates.size !== 1 ? 's' : ''} will be imported
                      </p>
                    )}
                  </div>
                )}

                {!summary.valid && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      The file could not be imported. Please fix the issues and try again.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSummary(null);
                  setStep('form');
                  setSelectedDuplicates(new Set());
                }}
              >
                Cancel import
              </Button>
              {summary?.valid && (
                <Button onClick={handleConfirm} disabled={confirmImport.isPending}>
                  {confirmImport.isPending ? 'Importing...' : 'Confirm import'}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
