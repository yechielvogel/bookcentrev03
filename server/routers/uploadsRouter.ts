import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { uploads, transactions, companies, bankAccounts } from '../db/schema.js';
import { eq, sql, ilike, or, count, and, desc, inArray, type SQL } from 'drizzle-orm';
import { parseCSV } from '../utils/csvParser.js';
import { TRPCError } from '@trpc/server';

const MAX_CSV_BYTES = 10 * 1024 * 1024; // 10 MB

export const uploadsRouter = router({
  // Parse CSV and return a preview summary without writing to DB
  processUpload: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        csvContent: z.string().max(MAX_CSV_BYTES, 'File too large (max 10 MB)'),
        companyId: z.string(),
        bankAccountId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.fileName.toLowerCase().endsWith('.csv')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid file format. Only CSV files are accepted.',
        });
      }

      const result = parseCSV(input.csvContent);

      if (result.errors.length > 0) {
        return {
          valid: false,
          validationStatus: result.errors[0],
          totalFound: 0,
          duplicates: 0,
          invalidRows: result.invalidRows,
          toImport: 0,
          transactions: [],
        };
      }

      if (result.transactions.length === 0) {
        return {
          valid: false,
          validationStatus: 'Empty file detected — no transactions found.',
          totalFound: 0,
          duplicates: 0,
          invalidRows: result.invalidRows,
          toImport: 0,
          transactions: [],
        };
      }

      // Check for duplicate transactions by description + date + amount + bankAccountId
      const bankAccountIdBig = BigInt(input.bankAccountId);
      const existingTxns = await db.query.transactions.findMany({
        where: eq(transactions.bankAccountId, bankAccountIdBig),
        columns: { transactionDate: true, description: true, amount: true },
      });

      const existingSet = new Set(
        existingTxns.map((t) => `${t.transactionDate.toISOString()}|${t.description}|${t.amount}`),
      );

      let duplicates = 0;
      const newTxns = result.transactions.filter((t) => {
        const key = `${t.date.toISOString()}|${t.description}|${t.amount}`;
        if (existingSet.has(key)) {
          duplicates++;
          return false;
        }
        return true;
      });

      return {
        valid: true,
        validationStatus: 'Success',
        totalFound: result.transactions.length,
        duplicates,
        invalidRows: result.invalidRows,
        toImport: newTxns.length,
        // Include parsed transactions to pass back for confirm step
        transactions: newTxns.map((t) => ({
          date: t.date.toISOString(),
          description: t.description,
          amount: t.amount.toString(),
          runningBalance: t.runningBalance?.toString() ?? null,
        })),
      };
    }),

  // Confirm and write upload + transactions to DB
  confirmImport: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        companyId: z.string(),
        bankAccountId: z.string(),
        totalFound: z.number().int(),
        duplicates: z.number().int(),
        invalidRows: z.number().int(),
        transactions: z.array(
          z.object({
            date: z.string(),
            description: z.string(),
            amount: z.string(),
            runningBalance: z.string().nullable(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const companyIdBig = BigInt(input.companyId);
      const bankAccountIdBig = BigInt(input.bankAccountId);

      // Verify company and bank account exist
      const [company, bankAccount] = await Promise.all([
        db.query.companies.findFirst({ where: eq(companies.id, companyIdBig) }),
        db.query.bankAccounts.findFirst({ where: eq(bankAccounts.id, bankAccountIdBig) }),
      ]);

      if (!company) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Company not found' });
      if (!bankAccount)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bank account not found' });

      const toImport = input.transactions.length;

      // Create upload record + transactions in a transaction
      const result = await db.transaction(async (tx) => {
        const [upload] = await tx
          .insert(uploads)
          .values({
            companyId: companyIdBig,
            bankAccountId: bankAccountIdBig,
            fileName: input.fileName,
            status: toImport > 0 ? 'pending' : 'success',
            transactionsFound: input.totalFound,
            duplicatesDetected: input.duplicates,
            errorsDetected: input.invalidRows,
          })
          .returning();

        if (toImport > 0) {
          await tx.insert(transactions).values(
            input.transactions.map((t) => ({
              uploadId: upload.id,
              companyId: companyIdBig,
              bankAccountId: bankAccountIdBig,
              transactionDate: new Date(t.date),
              description: t.description,
              amount: t.amount,
              runningBalance: t.runningBalance ?? null,
              status: 'queued',
            })),
          );
        }

        return upload;
      });

      const { id, companyId, bankAccountId, ...rest } = result;
      return {
        ...rest,
        id: id.toString(),
        companyId: companyId.toString(),
        bankAccountId: bankAccountId.toString(),
        transactionsImported: toImport,
      };
    }),

  // Cancel/delete an upload and its transactions
  cancelUpload: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const uploadId = BigInt(input.id);

      await db.transaction(async (tx) => {
        await tx.delete(transactions).where(eq(transactions.uploadId, uploadId));
        await tx.delete(uploads).where(eq(uploads.id, uploadId));
      });

      return { success: true };
    }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        status: z.enum(['all', 'pending', 'failed', 'success']).default('all'),
        q: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize, status, q } = input;
      const offset = (page - 1) * pageSize;

      // Build conditions
      const conditions: SQL[] = [];

      if (status !== 'all') {
        conditions.push(eq(uploads.status, status));
      }

      if (q) {
        const searchCondition = or(
          ilike(uploads.fileName, `%${q}%`),
          sql`EXISTS (
            SELECT 1 FROM companies c
            WHERE c.id = ${uploads.companyId}
            AND LOWER(c.name) LIKE LOWER(${`%${q}%`})
          )`,
        );
        if (searchCondition) conditions.push(searchCondition);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(uploads)
          .where(where)
          .orderBy(desc(uploads.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(uploads).where(where),
      ]);

      // Enrich with company + bank account names
      const companyIds = [...new Set(rows.map((r) => r.companyId))];
      const bankAccountIds = [...new Set(rows.map((r) => r.bankAccountId))];

      const [companiesData, bankAccountsData] = await Promise.all([
        companyIds.length > 0
          ? db.select().from(companies).where(inArray(companies.id, companyIds))
          : Promise.resolve([]),
        bankAccountIds.length > 0
          ? db.select().from(bankAccounts).where(inArray(bankAccounts.id, bankAccountIds))
          : Promise.resolve([]),
      ]);

      const companyMap = new Map(companiesData.map((c) => [c.id.toString(), c.name]));
      const bankMap = new Map(
        bankAccountsData.map((b) => [b.id.toString(), `${b.bankName} – ${b.accountNumber}`]),
      );

      return {
        items: rows.map((u) => {
          const { id, companyId, bankAccountId, ...rest } = u;
          return {
            ...rest,
            id: id.toString(),
            companyId: companyId.toString(),
            bankAccountId: bankAccountId.toString(),
            companyName: companyMap.get(companyId.toString()) ?? '—',
            bankAccountLabel: bankMap.get(bankAccountId.toString()) ?? '—',
          };
        }),
        total: totalResult[0]?.count ?? 0,
        page,
        pageSize,
      };
    }),
});
