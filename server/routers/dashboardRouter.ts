import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { transactions, bankAccounts, contacts, reportTemplates, categories } from '../db/schema.js';
import { eq, sql, and, gte, count, sum, desc } from 'drizzle-orm';

export const dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    const [queuedCount, totalBalance, totalDebt, totalOwed, reportsCount] = await Promise.all([
      // Queued transactions
      db.select({ count: count() }).from(transactions).where(eq(transactions.status, 'queued')),

      // Total bank account balance across all companies
      db.select({ total: sum(bankAccounts.balance) }).from(bankAccounts),

      // Total debt: contacts with role='lender' and positive balance (we owe them)
      db
        .select({ total: sum(contacts.balance) })
        .from(contacts)
        .where(and(eq(contacts.role, 'lender'), sql`${contacts.balance} > 0`)),

      // Total owed: contacts with role='borrower' and positive balance (they owe us)
      db
        .select({ total: sum(contacts.balance) })
        .from(contacts)
        .where(and(eq(contacts.role, 'borrower'), sql`${contacts.balance} > 0`)),

      // Reports generated last 30 days
      db
        .select({ count: count() })
        .from(reportTemplates)
        .where(gte(reportTemplates.createdAt, sql`NOW() - INTERVAL '30 days'`)),
    ]);

    return {
      queuedTransactions: queuedCount[0]?.count ?? 0,
      totalBalance: parseFloat(totalBalance[0]?.total ?? '0'),
      totalDebt: parseFloat(totalDebt[0]?.total ?? '0'),
      totalOwed: parseFloat(totalOwed[0]?.total ?? '0'),
      reportsCount: reportsCount[0]?.count ?? 0,
    };
  }),

  maaserBalance: protectedProcedure
    .input(
      z.object({
        timeframe: z.enum(['30', '60', '90', 'all']),
      }),
    )
    .query(async ({ input }) => {
      const cutoff =
        input.timeframe === 'all'
          ? null
          : new Date(Date.now() - parseInt(input.timeframe) * 24 * 60 * 60 * 1000);

      // Find maaser category id
      const maaserCategory = await db.query.categories.findFirst({
        where: sql`LOWER(${categories.name}) LIKE '%maaser%' OR LOWER(${categories.type}) LIKE '%maaser%'`,
      });

      const incomeConditions = cutoff
        ? and(sql`${transactions.amount} > 0`, gte(transactions.transactionDate, cutoff))
        : sql`${transactions.amount} > 0`;

      const maaserConditions =
        maaserCategory && cutoff
          ? and(
              eq(transactions.categoryId, maaserCategory.id),
              gte(transactions.transactionDate, cutoff),
            )
          : maaserCategory
            ? eq(transactions.categoryId, maaserCategory.id)
            : sql`false`;

      const [incomeResult, maaserPaidResult, recentMaaser] = await Promise.all([
        db
          .select({ total: sum(transactions.amount) })
          .from(transactions)
          .where(incomeConditions),

        maaserCategory
          ? db
              .select({ total: sum(sql`ABS(${transactions.amount})`) })
              .from(transactions)
              .where(maaserConditions)
          : Promise.resolve([{ total: '0' }]),

        maaserCategory
          ? db
              .select()
              .from(transactions)
              .where(eq(transactions.categoryId, maaserCategory.id))
              .orderBy(desc(transactions.transactionDate))
              .limit(20)
          : Promise.resolve([]),
      ]);

      const totalIncome = parseFloat(incomeResult[0]?.total ?? '0');
      const maaserDue = totalIncome * 0.1;
      const maaserPaid = parseFloat(maaserPaidResult[0]?.total ?? '0');
      const outstanding = Math.max(0, maaserDue - maaserPaid);

      return {
        outstanding,
        maaserDue,
        maaserPaid,
        recentTransactions: recentMaaser.map((t) => {
          const {
            id,
            uploadId,
            companyId,
            bankAccountId,
            categoryId,
            relationId,
            supplierId,
            billId,
            ...rest
          } = t;
          return {
            ...rest,
            id: id.toString(),
            uploadId: uploadId?.toString() ?? null,
            companyId: companyId.toString(),
            bankAccountId: bankAccountId.toString(),
            categoryId: categoryId?.toString() ?? null,
            relationId: relationId?.toString() ?? null,
            supplierId: supplierId?.toString() ?? null,
            billId: billId?.toString() ?? null,
            amount: rest.amount,
            runningBalance: rest.runningBalance ?? null,
          };
        }),
      };
    }),
});
