import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import {
  transactions,
  bankAccounts,
  categories,
  contacts,
  suppliers,
  companies,
} from '../db/schema.js';
import {
  eq,
  and,
  desc,
  asc,
  count,
  gte,
  lte,
  ilike,
  or,
  type SQL,
  inArray,
  sql,
} from 'drizzle-orm';

function serializeTx(t: typeof transactions.$inferSelect) {
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
  };
}

export const transactionsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(20),
        companyId: z.string().optional(),
        bankAccountId: z.string().optional(),
        uploadId: z.string().optional(),
        relationId: z.string().optional(),
        status: z.string().optional(),
        q: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        categoryId: z.string().optional(),
        categoryType: z.string().optional(),
        sortBy: z.enum(['date', 'amount', 'description']).default('date'),
        sortDir: z.enum(['asc', 'desc']).default('desc'),
      }),
    )
    .query(async ({ input }) => {
      const {
        page,
        pageSize,
        companyId,
        bankAccountId,
        uploadId,
        relationId,
        status,
        q,
        dateFrom,
        dateTo,
        categoryId,
        categoryType,
        sortBy,
        sortDir,
      } = input;
      const offset = (page - 1) * pageSize;

      // Pre-lookup category IDs for categoryType filter
      let categoryIdsForType: bigint[] = [];
      if (categoryType) {
        const catTypeRows = await db
          .select({ id: categories.id })
          .from(categories)
          .where(ilike(categories.type, `%${categoryType}%`));
        categoryIdsForType = catTypeRows.map((c) => c.id);
      }

      const conditions: SQL[] = [];
      if (companyId) conditions.push(eq(transactions.companyId, BigInt(companyId)));
      if (bankAccountId) conditions.push(eq(transactions.bankAccountId, BigInt(bankAccountId)));
      if (uploadId) conditions.push(eq(transactions.uploadId, BigInt(uploadId)));
      if (relationId) conditions.push(eq(transactions.relationId, BigInt(relationId)));
      if (status) conditions.push(eq(transactions.status, status));
      if (dateFrom) conditions.push(gte(transactions.transactionDate, new Date(dateFrom)));
      if (dateTo) conditions.push(lte(transactions.transactionDate, new Date(dateTo)));
      if (q) {
        const searchCond = or(ilike(transactions.description, `%${q}%`));
        if (searchCond) conditions.push(searchCond);
      }
      if (categoryId) conditions.push(eq(transactions.categoryId, BigInt(categoryId)));
      if (categoryType) {
        if (categoryIdsForType.length > 0) {
          conditions.push(inArray(transactions.categoryId, categoryIdsForType));
        } else {
          conditions.push(sql`FALSE`);
        }
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const sortCol =
        sortBy === 'amount'
          ? transactions.amount
          : sortBy === 'description'
            ? transactions.description
            : transactions.transactionDate;
      const orderFn = sortDir === 'asc' ? asc : desc;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(transactions)
          .where(where)
          .orderBy(orderFn(sortCol))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(transactions).where(where),
      ]);

      if (rows.length === 0) {
        return { items: [], total: totalResult[0]?.count ?? 0, page, pageSize };
      }

      // Batch enrich with related data
      const baIds = [...new Set(rows.map((r) => r.bankAccountId))];
      const companyIds = [...new Set(rows.map((r) => r.companyId))];
      const catIds = [...new Set(rows.map((r) => r.categoryId).filter(Boolean))] as bigint[];
      const relIds = [...new Set(rows.map((r) => r.relationId).filter(Boolean))] as bigint[];
      const supIds = [...new Set(rows.map((r) => r.supplierId).filter(Boolean))] as bigint[];

      const [baRows, companyRows, catRows, relRows, supRows] = await Promise.all([
        db
          .select({
            id: bankAccounts.id,
            bankName: bankAccounts.bankName,
            accountNumber: bankAccounts.accountNumber,
          })
          .from(bankAccounts)
          .where(inArray(bankAccounts.id, baIds)),
        db
          .select({ id: companies.id, name: companies.name })
          .from(companies)
          .where(inArray(companies.id, companyIds)),
        catIds.length > 0
          ? db
              .select({ id: categories.id, name: categories.name, type: categories.type })
              .from(categories)
              .where(inArray(categories.id, catIds))
          : Promise.resolve([]),
        relIds.length > 0
          ? db
              .select({ id: contacts.id, name: contacts.name })
              .from(contacts)
              .where(inArray(contacts.id, relIds))
          : Promise.resolve([]),
        supIds.length > 0
          ? db
              .select({ id: suppliers.id, name: suppliers.name })
              .from(suppliers)
              .where(inArray(suppliers.id, supIds))
          : Promise.resolve([]),
      ]);

      const baMap = new Map(
        baRows.map((b) => [b.id.toString(), `${b.bankName} – ${b.accountNumber}`]),
      );
      const companyMap = new Map(companyRows.map((c) => [c.id.toString(), c.name]));
      const catNameMap = new Map(catRows.map((c) => [c.id.toString(), c.name]));
      const catTypeMap = new Map(catRows.map((c) => [c.id.toString(), c.type]));
      const relMap = new Map(relRows.map((r) => [r.id.toString(), r.name]));
      const supMap = new Map(supRows.map((s) => [s.id.toString(), s.name]));

      return {
        items: rows.map((t) => ({
          ...serializeTx(t),
          bankAccountLabel: baMap.get(t.bankAccountId.toString()) ?? '—',
          companyName: companyMap.get(t.companyId.toString()) ?? '—',
          categoryName: t.categoryId ? (catNameMap.get(t.categoryId.toString()) ?? null) : null,
          categoryType: t.categoryId ? (catTypeMap.get(t.categoryId.toString()) ?? null) : null,
          relationName: t.relationId ? (relMap.get(t.relationId.toString()) ?? null) : null,
          supplierName: t.supplierId ? (supMap.get(t.supplierId.toString()) ?? null) : null,
        })),
        total: totalResult[0]?.count ?? 0,
        page,
        pageSize,
      };
    }),

  process: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        categoryId: z.string(),
        relationId: z.string().optional().nullable(),
        supplierId: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        flag: z.boolean().default(false),
        flagReason: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, categoryId, relationId, supplierId, notes, flag, flagReason } = input;
      const [row] = await db
        .update(transactions)
        .set({
          status: flag ? 'flagged' : 'processed',
          categoryId: BigInt(categoryId),
          relationId: relationId ? BigInt(relationId) : null,
          supplierId: supplierId ? BigInt(supplierId) : null,
          notes: notes ?? null,
          flagReason: flag ? (flagReason ?? null) : null,
          updatedAt: sql`NOW()`,
        })
        .where(eq(transactions.id, BigInt(id)))
        .returning();
      return serializeTx(row);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        companyId: z.string().optional(),
        bankAccountId: z.string().optional(),
        categoryId: z.string().optional().nullable(),
        relationId: z.string().optional().nullable(),
        supplierId: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        flagReason: z.string().optional().nullable(),
        status: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, companyId, bankAccountId, categoryId, relationId, supplierId, ...rest } = input;
      const [row] = await db
        .update(transactions)
        .set({
          ...rest,
          ...(companyId !== undefined ? { companyId: BigInt(companyId) } : {}),
          ...(bankAccountId !== undefined ? { bankAccountId: BigInt(bankAccountId) } : {}),
          ...(categoryId !== undefined
            ? { categoryId: categoryId ? BigInt(categoryId) : null }
            : {}),
          ...(relationId !== undefined
            ? { relationId: relationId ? BigInt(relationId) : null }
            : {}),
          ...(supplierId !== undefined
            ? { supplierId: supplierId ? BigInt(supplierId) : null }
            : {}),
          updatedAt: sql`NOW()`,
        })
        .where(eq(transactions.id, BigInt(id)))
        .returning();
      return serializeTx(row);
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db.delete(transactions).where(eq(transactions.id, BigInt(input.id)));
    return { success: true };
  }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ input }) => {
      await db.delete(transactions).where(inArray(transactions.id, input.ids.map(BigInt)));
      return { deleted: input.ids.length };
    }),

  bulkUpdate: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
        categoryId: z.string().nullable().optional(),
        supplierId: z.string().nullable().optional(),
        relationId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { ids, categoryId, supplierId, relationId } = input;
      const setObj: Record<string, unknown> = { updatedAt: sql`NOW()` };
      if (categoryId !== undefined)
        setObj.categoryId = categoryId ? BigInt(categoryId) : null;
      if (supplierId !== undefined)
        setObj.supplierId = supplierId ? BigInt(supplierId) : null;
      if (relationId !== undefined)
        setObj.relationId = relationId ? BigInt(relationId) : null;
      await db
        .update(transactions)
        .set(setObj)
        .where(inArray(transactions.id, ids.map(BigInt)));
      return { updated: ids.length };
    }),
});
