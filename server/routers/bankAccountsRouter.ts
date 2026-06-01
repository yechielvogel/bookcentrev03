import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { bankAccounts } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

export const bankAccountsRouter = router({
  listByCompany: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.companyId, BigInt(input.companyId)))
        .orderBy(bankAccounts.bankName);
      return rows.map((b) => {
        const { id, companyId, ...rest } = b;
        return {
          ...rest,
          id: id.toString(),
          companyId: companyId.toString(),
          balance: rest.balance,
          openingBalance: rest.openingBalance,
          label: `${b.bankName} – ${b.accountNumber}`,
        };
      });
    }),

  listAll: protectedProcedure.query(async () => {
    const rows = await db.select().from(bankAccounts).orderBy(bankAccounts.bankName);
    return rows.map((b) => {
      const { id, companyId, ...rest } = b;
      return {
        ...rest,
        id: id.toString(),
        companyId: companyId.toString(),
        balance: rest.balance,
        openingBalance: rest.openingBalance,
        label: `${b.bankName} – ${b.accountNumber}`,
      };
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        bankName: z.string().min(1).max(255),
        accountNumber: z.string().min(1).max(50),
        sortCode: z.string().min(1).max(20),
        accountHolderName: z.string().min(1).max(255),
        openingBalance: z.string().default('0'),
        adminNote: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { companyId, ...fields } = input;
      const [row] = await db
        .insert(bankAccounts)
        .values({
          companyId: BigInt(companyId),
          bankName: fields.bankName,
          accountNumber: fields.accountNumber,
          sortCode: fields.sortCode,
          accountHolderName: fields.accountHolderName,
          openingBalance: fields.openingBalance,
          balance: fields.openingBalance,
          adminNote: fields.adminNote ?? null,
        })
        .returning();
      const { id, companyId: cid, ...rest } = row;
      return { ...rest, id: id.toString(), companyId: cid.toString() };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        bankName: z.string().min(1).max(255).optional(),
        accountNumber: z.string().min(1).max(50).optional(),
        sortCode: z.string().min(1).max(20).optional(),
        accountHolderName: z.string().min(1).max(255).optional(),
        adminNote: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;
      const [row] = await db
        .update(bankAccounts)
        .set({ ...fields, updatedAt: sql`NOW()` })
        .where(eq(bankAccounts.id, BigInt(id)))
        .returning();
      const { id: rid, companyId, ...rest } = row;
      return { ...rest, id: rid.toString(), companyId: companyId.toString() };
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db.delete(bankAccounts).where(eq(bankAccounts.id, BigInt(input.id)));
    return { success: true };
  }),
});
