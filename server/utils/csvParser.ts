export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number; // positive = credit, negative = debit
  runningBalance: number | null;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  invalidRows: number;
  errors: string[];
}

function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  // Try various date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{2})$/, // DD/MM/YY
  ];

  for (const fmt of formats) {
    const m = trimmed.match(fmt);
    if (m) {
      if (fmt === formats[2]) {
        // YYYY-MM-DD
        const d = new Date(`${m[1]}-${m[2]}-${m[3]}`);
        if (!isNaN(d.getTime())) return d;
      } else if (fmt === formats[3]) {
        // DD/MM/YY — assume 2000s
        const year = parseInt(m[3]) + 2000;
        const d = new Date(`${year}-${m[2]}-${m[1]}`);
        if (!isNaN(d.getTime())) return d;
      } else {
        // DD/MM/YYYY or DD-MM-YYYY
        const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  // Fallback: let JS try to parse it
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[£$€,\s]/g, '')
    .replace(/\((.+)\)/, '-$1');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function normaliseHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = h
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
    map[key] = i;
  });
  return map;
}

function findColumn(map: Record<string, number>, ...candidates: string[]): number {
  for (const c of candidates) {
    const key = c.toLowerCase().replace(/[\s_-]+/g, '');
    if (key in map) return map[key];
  }
  return -1;
}

export function parseCSV(content: string): ParseResult {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { transactions: [], invalidRows: 0, errors: ['File is empty or has no data rows'] };
  }

  // Split a CSV line respecting quoted fields
  function splitLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  }

  const headers = splitLine(lines[0]);
  const map = normaliseHeaders(headers);

  // Detect date column
  const dateCol = findColumn(
    map,
    'date',
    'transaction date',
    'transactiondate',
    'value date',
    'posting date',
  );

  // Detect description column
  const descCol = findColumn(
    map,
    'description',
    'transaction description',
    'details',
    'memo',
    'narrative',
    'payee',
    'reference',
    'transaction type',
    'type',
  );

  // Detect amount columns
  const amountCol = findColumn(map, 'amount', 'transaction amount', 'value');
  const debitCol = findColumn(map, 'debit', 'debit amount', 'money out', 'withdrawal', 'debits');
  const creditCol = findColumn(
    map,
    'credit',
    'credit amount',
    'money in',
    'deposit',
    'credits',
    'paid in',
  );
  const balanceCol = findColumn(map, 'balance', 'running balance', 'account balance');

  if (
    dateCol === -1 ||
    descCol === -1 ||
    (amountCol === -1 && (debitCol === -1 || creditCol === -1))
  ) {
    const missing: string[] = [];
    if (dateCol === -1) missing.push('Date');
    if (descCol === -1) missing.push('Description');
    if (amountCol === -1 && (debitCol === -1 || creditCol === -1))
      missing.push('Amount (or Debit/Credit columns)');
    return {
      transactions: [],
      invalidRows: 0,
      errors: [`Missing required columns: ${missing.join(', ')}`],
    };
  }

  const transactions: ParsedTransaction[] = [];
  let invalidRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.length < 2) {
      invalidRows++;
      continue;
    }

    const rawDate = cols[dateCol] ?? '';
    const rawDesc = cols[descCol] ?? '';

    const parsedDate = parseDate(rawDate);
    if (!parsedDate) {
      invalidRows++;
      continue;
    }

    let amount: number;
    if (amountCol !== -1) {
      const a = parseAmount(cols[amountCol] ?? '');
      if (a === null) {
        invalidRows++;
        continue;
      }
      amount = a;
    } else {
      // debit/credit split columns
      const debitRaw = cols[debitCol] ?? '';
      const creditRaw = cols[creditCol] ?? '';
      const debit = debitRaw ? parseAmount(debitRaw) : null;
      const credit = creditRaw ? parseAmount(creditRaw) : null;

      if (debit === null && credit === null) {
        invalidRows++;
        continue;
      }

      const d = debit !== null && debit !== 0 ? debit : 0;
      const c = credit !== null && credit !== 0 ? credit : 0;
      amount = c - d; // credits are positive, debits negative
    }

    const runningBalance =
      balanceCol !== -1 && cols[balanceCol] ? parseAmount(cols[balanceCol]) : null;

    transactions.push({
      date: parsedDate,
      description: rawDesc.trim(),
      amount,
      runningBalance,
    });
  }

  return { transactions, invalidRows, errors: [] };
}
