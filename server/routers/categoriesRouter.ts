import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { categories } from '../db/schema.js';
import { eq, sql, ilike, asc } from 'drizzle-orm';

function serializeCat(c: typeof categories.$inferSelect) {
  const { id, ...rest } = c;
  return { ...rest, id: id.toString() };
}

export const categoriesRouter = router({
  list: protectedProcedure
    .input(z.object({ q: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const where = input?.q ? ilike(categories.name, `%${input.q}%`) : undefined;
      const rows = await db.select().from(categories).where(where).orderBy(asc(categories.name));
      return rows.map(serializeCat);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        type: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db.insert(categories).values(input).returning();
      return serializeCat(row);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        type: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;
      const [row] = await db
        .update(categories)
        .set({ ...fields, updatedAt: sql`NOW()` })
        .where(eq(categories.id, BigInt(id)))
        .returning();
      return serializeCat(row);
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db.delete(categories).where(eq(categories.id, BigInt(input.id)));
    return { success: true };
  }),
});
