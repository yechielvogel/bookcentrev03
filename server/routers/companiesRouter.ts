import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { companies, bankAccounts, contacts } from '../db/schema.js';
import { eq, sql, ilike, count, sum } from 'drizzle-orm';

export const companiesRouter = router({
  listAll: protectedProcedure.query(async () => {
    const rows = await db.select().from(companies).orderBy(companies.name);
    return rows.map((c) => {
      const { id, ...rest } = c;
      return { ...rest, id: id.toString() };
    });
  }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        q: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize, q } = input;
      const offset = (page - 1) * pageSize;

      const where = q ? ilike(companies.name, `%${q}%`) : undefined;

      const [rows, total] = await Promise.all([
        db
          .select()
          .from(companies)
          .where(where)
          .orderBy(companies.name)
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(companies).where(where),
      ]);

      return {
        items: rows.map((c) => {
          const { id, ...rest } = c;
          return { ...rest, id: id.toString() };
        }),
        total: total[0]?.count ?? 0,
        page,
        pageSize,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        registeredAddress: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(companies)
        .values({
          name: input.name,
          description: input.description ?? null,
          registeredAddress: input.registeredAddress ?? null,
        })
        .returning();
      const { id, ...rest } = row;
      return { ...rest, id: id.toString() };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        registeredAddress: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;
      const [row] = await db
        .update(companies)
        .set({ ...fields, updatedAt: sql`NOW()` })
        .where(eq(companies.id, BigInt(id)))
        .returning();
      const { id: rowId, ...rest } = row;
      return { ...rest, id: rowId.toString() };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const id = BigInt(input.id);
    const [company, bankAccountRows, contactRows] = await Promise.all([
      db.query.companies.findFirst({ where: eq(companies.id, id) }),
      db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.companyId, id))
        .orderBy(bankAccounts.bankName),
      db.select().from(contacts).where(eq(contacts.companyId, id)).orderBy(contacts.name),
    ]);
    if (!company) return null;
    const { id: cid, ...cRest } = company;
    return {
      ...cRest,
      id: cid.toString(),
      bankAccounts: bankAccountRows.map((b) => {
        const { id: bid, companyId, ...bRest } = b;
        return { ...bRest, id: bid.toString(), companyId: companyId.toString() };
      }),
      contacts: contactRows.map((ct) => {
        const { id: ctid, companyId: ctCompId, ...ctRest } = ct;
        return {
          ...ctRest,
          id: ctid.toString(),
          companyId: ctCompId?.toString() ?? null,
        };
      }),
    };
  }),

  listWithStats: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        q: z.string().optional(),
        sortBy: z.enum(['name', 'balance', 'createdAt']).default('name'),
        sortDir: z.enum(['asc', 'desc']).default('asc'),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize, q, sortBy, sortDir } = input;
      const offset = (page - 1) * pageSize;
      const where = q ? ilike(companies.name, `%${q}%`) : undefined;

      const orderCol =
        sortBy === 'balance'
          ? sortDir === 'desc'
            ? sql`(SELECT SUM(b.balance) FROM bank_accounts b WHERE b.company_id = ${companies.id}) DESC NULLS LAST`
            : sql`(SELECT SUM(b.balance) FROM bank_accounts b WHERE b.company_id = ${companies.id}) ASC NULLS LAST`
          : sortBy === 'createdAt'
            ? sortDir === 'desc'
              ? sql`${companies.createdAt} DESC`
              : sql`${companies.createdAt} ASC`
            : sortDir === 'desc'
              ? sql`${companies.name} DESC`
              : sql`${companies.name} ASC`;

      const [rows, totalResult] = await Promise.all([
        db.select().from(companies).where(where).orderBy(orderCol).limit(pageSize).offset(offset),
        db.select({ count: count() }).from(companies).where(where),
      ]);

      if (rows.length === 0) {
        return { items: [], total: totalResult[0]?.count ?? 0, page, pageSize };
      }

      const ids = rows.map((r) => r.id);

      const [bankRows, contactRows] = await Promise.all([
        db
          .select({
            companyId: bankAccounts.companyId,
            cnt: count(),
            bal: sum(bankAccounts.balance),
          })
          .from(bankAccounts)
          .where(
            sql`${bankAccounts.companyId} = ANY(${sql.raw(`ARRAY[${ids.map((id) => `'${id}'::bigint`).join(',')}]`)})`,
          )
          .groupBy(bankAccounts.companyId),
        db
          .select({ companyId: contacts.companyId, role: contacts.role, name: contacts.name })
          .from(contacts)
          .where(
            sql`${contacts.companyId} = ANY(${sql.raw(`ARRAY[${ids.map((id) => `'${id}'::bigint`).join(',')}]`)})`,
          ),
      ]);

      const bankMap = new Map(
        bankRows.map((b) => [
          b.companyId.toString(),
          { count: Number(b.cnt), balance: parseFloat(b.bal ?? '0') },
        ]),
      );
      const contactsByCompany = new Map<string, { role: string; name: string }[]>();
      for (const c of contactRows) {
        const cid = c.companyId?.toString() ?? '';
        if (!contactsByCompany.has(cid)) contactsByCompany.set(cid, []);
        contactsByCompany.get(cid)!.push({ role: c.role, name: c.name });
      }

      return {
        items: rows.map((c) => {
          const { id, ...rest } = c;
          const cid = id.toString();
          const bank = bankMap.get(cid) ?? { count: 0, balance: 0 };
          const ctContacts = contactsByCompany.get(cid) ?? [];
          const holder = ctContacts.find((x) => x.role === 'holder');
          const partnerCount = ctContacts.filter((x) => x.role === 'partner').length;
          return {
            ...rest,
            id: cid,
            bankAccountCount: bank.count,
            totalBalance: bank.balance,
            holderName: holder?.name ?? null,
            partnerCount,
          };
        }),
        total: totalResult[0]?.count ?? 0,
        page,
        pageSize,
      };
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db.delete(companies).where(eq(companies.id, BigInt(input.id)));
    return { success: true };
  }),
});
