import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { contacts, companies } from '../db/schema.js';
import { eq, sql, ilike, or, and, asc, desc, count, inArray, type SQL } from 'drizzle-orm';

function serializeContact(c: typeof contacts.$inferSelect) {
  const { id, companyId, ...rest } = c;
  return {
    ...rest,
    id: id.toString(),
    companyId: companyId?.toString() ?? null,
  };
}

export const contactsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        q: z.string().optional(),
        role: z.string().optional(),
        sortBy: z.enum(['name', 'balance', 'createdAt']).default('name'),
        sortDir: z.enum(['asc', 'desc']).default('asc'),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize, q, role, sortBy, sortDir } = input;
      const offset = (page - 1) * pageSize;

      const conditions: SQL[] = [];
      if (q) {
        const sc = or(ilike(contacts.name, `%${q}%`), ilike(contacts.email, `%${q}%`));
        if (sc) conditions.push(sc);
      }
      if (role) conditions.push(eq(contacts.role, role));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const sortCol =
        sortBy === 'balance'
          ? contacts.balance
          : sortBy === 'createdAt'
            ? contacts.createdAt
            : contacts.name;
      const orderFn = sortDir === 'asc' ? asc : desc;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(contacts)
          .where(where)
          .orderBy(orderFn(sortCol))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(contacts).where(where),
      ]);

      // Enrich with company names
      const companyIds = [...new Set(rows.map((r) => r.companyId).filter(Boolean))] as bigint[];
      const companyRows =
        companyIds.length > 0
          ? await db
              .select({ id: companies.id, name: companies.name })
              .from(companies)
              .where(inArray(companies.id, companyIds))
          : [];
      const companyMap = new Map(companyRows.map((c) => [c.id.toString(), c.name]));

      return {
        items: rows.map((c) => ({
          ...serializeContact(c),
          companyName: c.companyId ? (companyMap.get(c.companyId.toString()) ?? null) : null,
        })),
        total: totalResult[0]?.count ?? 0,
        page,
        pageSize,
      };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const row = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, BigInt(input.id)))
      .then((r) => r[0]);
    if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });

    let companyName: string | null = null;
    if (row.companyId) {
      const co = await db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, row.companyId))
        .then((r) => r[0]);
      companyName = co?.name ?? null;
    }

    return { ...serializeContact(row), companyName };
  }),

  listAll: protectedProcedure
    .input(z.object({ q: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const where = input?.q
        ? or(ilike(contacts.name, `%${input.q}%`), ilike(contacts.email, `%${input.q}%`))
        : undefined;
      const rows = await db.select().from(contacts).where(where).orderBy(contacts.name);
      return rows.map(serializeContact);
    }),

  listByCompany: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(contacts)
        .where(eq(contacts.companyId, BigInt(input.companyId)))
        .orderBy(contacts.name);
      return rows.map(serializeContact);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        role: z.enum(['holder', 'partner', 'lender', 'borrower']),
        companyId: z.string().optional(),
        partnerShare: z.string().optional(),
        partnerDividendAmount: z.string().optional(),
        partnerDividendFrequency: z.string().optional(),
        investmentAmount: z.string().optional(),
        amountLentBorrowed: z.string().optional(),
        dateLentBorrowed: z.string().optional(),
        openingBalance: z.string().optional(),
        adminNote: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { companyId, ...fields } = input;
      const [row] = await db
        .insert(contacts)
        .values({
          name: fields.name,
          email: fields.email ?? null,
          phone: fields.phone ?? null,
          address: fields.address ?? null,
          role: fields.role,
          companyId: companyId ? BigInt(companyId) : null,
          partnerShare: fields.partnerShare ?? null,
          partnerDividendAmount: fields.partnerDividendAmount ?? null,
          partnerDividendFrequency: fields.partnerDividendFrequency ?? null,
          investmentAmount: fields.investmentAmount ?? null,
          amountLentBorrowed: fields.amountLentBorrowed ?? null,
          dateLentBorrowed: fields.dateLentBorrowed ?? null,
          openingBalance: fields.openingBalance ?? '0',
          balance: fields.openingBalance ?? '0',
          adminNote: fields.adminNote ?? null,
        })
        .returning();
      return serializeContact(row);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        partnerShare: z.string().optional().nullable(),
        partnerDividendAmount: z.string().optional().nullable(),
        partnerDividendFrequency: z.string().optional().nullable(),
        investmentAmount: z.string().optional().nullable(),
        amountLentBorrowed: z.string().optional().nullable(),
        dateLentBorrowed: z.string().optional().nullable(),
        adminNote: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;
      const [row] = await db
        .update(contacts)
        .set({ ...fields, updatedAt: sql`NOW()` })
        .where(eq(contacts.id, BigInt(id)))
        .returning();
      return serializeContact(row);
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db.delete(contacts).where(eq(contacts.id, BigInt(input.id)));
    return { success: true };
  }),
});
