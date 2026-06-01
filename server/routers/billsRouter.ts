import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { bills, suppliers } from '../db/schema.js';
import { eq, sql, inArray } from 'drizzle-orm';

function serializeBill(b: typeof bills.$inferSelect) {
  const { id, companyId, supplierId, ...rest } = b;
  return {
    ...rest,
    id: id.toString(),
    companyId: companyId.toString(),
    supplierId: supplierId?.toString() ?? null,
    amount: rest.amount,
  };
}

export const billsRouter = router({
  listByCompany: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(bills)
        .where(eq(bills.companyId, BigInt(input.companyId)))
        .orderBy(bills.dueDate);

      if (rows.length === 0) return [];

      const supplierIds = [...new Set(rows.map((r) => r.supplierId).filter(Boolean))] as bigint[];
      const supplierRows =
        supplierIds.length > 0
          ? await db.select().from(suppliers).where(inArray(suppliers.id, supplierIds))
          : [];
      const supplierMap = new Map(supplierRows.map((s) => [s.id.toString(), s.name]));

      return rows.map((b) => ({
        ...serializeBill(b),
        supplierName: b.supplierId ? (supplierMap.get(b.supplierId.toString()) ?? null) : null,
      }));
    }),

  create: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        name: z.string().min(1).max(255),
        amount: z.string(),
        supplierId: z.string().optional(),
        supplierName: z.string().optional(), // create new supplier if no supplierId
        dueDate: z.string(), // ISO date string
        recurring: z.boolean().default(false),
        recurrenceType: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      let resolvedSupplierId: bigint | null = null;

      if (input.supplierId) {
        resolvedSupplierId = BigInt(input.supplierId);
      } else if (input.supplierName) {
        const [newSupplier] = await db
          .insert(suppliers)
          .values({ name: input.supplierName })
          .returning();
        resolvedSupplierId = newSupplier.id;
      }

      const [row] = await db
        .insert(bills)
        .values({
          companyId: BigInt(input.companyId),
          name: input.name,
          amount: input.amount,
          supplierId: resolvedSupplierId,
          dueDate: input.dueDate,
          recurring: input.recurring,
          recurrenceType: input.recurrenceType ?? null,
          status: 'upcoming',
        })
        .returning();

      return serializeBill(row);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        amount: z.string().optional(),
        supplierId: z.string().optional().nullable(),
        dueDate: z.string().optional(),
        recurring: z.boolean().optional(),
        recurrenceType: z.string().optional().nullable(),
        status: z.enum(['upcoming', 'paid', 'overdue']).optional(),
        paidDate: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, supplierId, ...fields } = input;
      const [row] = await db
        .update(bills)
        .set({
          ...fields,
          supplierId: supplierId ? BigInt(supplierId) : supplierId === null ? null : undefined,
          updatedAt: sql`NOW()`,
        })
        .where(eq(bills.id, BigInt(id)))
        .returning();
      return serializeBill(row);
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db.delete(bills).where(eq(bills.id, BigInt(input.id)));
    return { success: true };
  }),

  listSuppliers: protectedProcedure.query(async () => {
    const rows = await db.select().from(suppliers).orderBy(suppliers.name);
    return rows.map((s) => ({ id: s.id.toString(), name: s.name }));
  }),
});
