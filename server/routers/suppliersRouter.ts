import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { suppliers } from '../db/schema.js';
import { ilike, asc } from 'drizzle-orm';

function serializeSupplier(s: typeof suppliers.$inferSelect) {
  const { id, ...rest } = s;
  return { ...rest, id: id.toString() };
}

export const suppliersRouter = router({
  list: protectedProcedure
    .input(z.object({ q: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const where = input?.q ? ilike(suppliers.name, `%${input.q}%`) : undefined;
      const rows = await db.select().from(suppliers).where(where).orderBy(asc(suppliers.name));
      return rows.map(serializeSupplier);
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async ({ input }) => {
      const [row] = await db.insert(suppliers).values({ name: input.name }).returning();
      return serializeSupplier(row);
    }),
});
