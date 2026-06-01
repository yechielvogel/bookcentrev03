import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { reportTemplates } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

function serializeTemplate(t: typeof reportTemplates.$inferSelect) {
  const { id, ...rest } = t;
  return { ...rest, id: id.toString() };
}

export const reportTemplatesRouter = router({
  list: protectedProcedure.query(async () => {
    const rows = await db
      .select()
      .from(reportTemplates)
      .orderBy(desc(reportTemplates.useCount), desc(reportTemplates.lastUsedAt));
    return rows.map(serializeTemplate);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        reportType: z.string().min(1).max(100),
        filters: z.record(z.unknown()),
        columns: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(reportTemplates)
        .values({
          name: input.name,
          reportType: input.reportType,
          filters: input.filters,
          columns: input.columns,
        })
        .returning();
      return serializeTemplate(row);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(reportTemplates)
        .set({ name: input.name, updatedAt: sql`NOW()` })
        .where(eq(reportTemplates.id, BigInt(input.id)))
        .returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return serializeTemplate(row);
    }),

  duplicate: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const original = await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.id, BigInt(input.id)))
      .then((r) => r[0]);
    if (!original) throw new TRPCError({ code: 'NOT_FOUND' });
    const [row] = await db
      .insert(reportTemplates)
      .values({
        name: `${original.name} (copy)`,
        reportType: original.reportType,
        filters: original.filters,
        columns: original.columns,
      })
      .returning();
    return serializeTemplate(row);
  }),

  markUsed: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db
      .update(reportTemplates)
      .set({
        useCount: sql`${reportTemplates.useCount} + 1`,
        lastUsedAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(reportTemplates.id, BigInt(input.id)));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db.delete(reportTemplates).where(eq(reportTemplates.id, BigInt(input.id)));
    return { success: true };
  }),
});
