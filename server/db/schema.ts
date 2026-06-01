import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  boolean,
  integer,
  timestamp,
  numeric,
  date,
  json,
  text,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  hashedPassword: varchar('hashed_password', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('admin'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  userId: bigint('user_id', { mode: 'bigint' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const companies = pgTable('companies', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  registeredAddress: text('registered_address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const suppliers = pgTable('suppliers', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const bankAccounts = pgTable('bank_accounts', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  companyId: bigint('company_id', { mode: 'bigint' })
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  bankName: varchar('bank_name', { length: 255 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  sortCode: varchar('sort_code', { length: 20 }).notNull(),
  accountHolderName: varchar('account_holder_name', { length: 255 }).notNull(),
  openingBalance: numeric('opening_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  balance: numeric('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  adminNote: text('admin_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const contacts = pgTable('contacts', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  role: varchar('role', { length: 50 }).notNull(),
  companyId: bigint('company_id', { mode: 'bigint' }).references(() => companies.id, {
    onDelete: 'set null',
  }),
  partnerShare: numeric('partner_share', { precision: 5, scale: 2 }),
  partnerDividendAmount: numeric('partner_dividend_amount', { precision: 15, scale: 2 }),
  partnerDividendFrequency: varchar('partner_dividend_frequency', { length: 50 }),
  investmentAmount: numeric('investment_amount', { precision: 15, scale: 2 }),
  amountLentBorrowed: numeric('amount_lent_borrowed', { precision: 15, scale: 2 }),
  dateLentBorrowed: date('date_lent_borrowed'),
  openingBalance: numeric('opening_balance', { precision: 15, scale: 2 }).default('0'),
  balance: numeric('balance', { precision: 15, scale: 2 }).default('0'),
  adminNote: text('admin_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const uploads = pgTable('uploads', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  companyId: bigint('company_id', { mode: 'bigint' })
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  bankAccountId: bigint('bank_account_id', { mode: 'bigint' })
    .notNull()
    .references(() => bankAccounts.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  transactionsFound: integer('transactions_found').default(0),
  duplicatesDetected: integer('duplicates_detected').default(0),
  errorsDetected: integer('errors_detected').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  uploadId: bigint('upload_id', { mode: 'bigint' }).references(() => uploads.id, {
    onDelete: 'set null',
  }),
  companyId: bigint('company_id', { mode: 'bigint' })
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  bankAccountId: bigint('bank_account_id', { mode: 'bigint' })
    .notNull()
    .references(() => bankAccounts.id, { onDelete: 'cascade' }),
  transactionDate: timestamp('transaction_date').notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  runningBalance: numeric('running_balance', { precision: 15, scale: 2 }),
  status: varchar('status', { length: 50 }).notNull().default('queued'),
  categoryId: bigint('category_id', { mode: 'bigint' }).references(() => categories.id, {
    onDelete: 'set null',
  }),
  relationId: bigint('relation_id', { mode: 'bigint' }).references(() => contacts.id, {
    onDelete: 'set null',
  }),
  supplierId: bigint('supplier_id', { mode: 'bigint' }).references(() => suppliers.id, {
    onDelete: 'set null',
  }),
  billId: bigint('bill_id', { mode: 'bigint' }),
  notes: text('notes'),
  flagReason: text('flag_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const bills = pgTable('bills', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  companyId: bigint('company_id', { mode: 'bigint' })
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  supplierId: bigint('supplier_id', { mode: 'bigint' }).references(() => suppliers.id, {
    onDelete: 'set null',
  }),
  dueDate: date('due_date').notNull(),
  recurring: boolean('recurring').notNull().default(false),
  recurrenceType: varchar('recurrence_type', { length: 50 }),
  recurrenceConfig: json('recurrence_config'),
  status: varchar('status', { length: 50 }).notNull().default('upcoming'),
  paidDate: date('paid_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reportTemplates = pgTable('report_templates', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  reportType: varchar('report_type', { length: 100 }).notNull(),
  filters: json('filters').notNull().default({}),
  columns: json('columns').notNull().default([]),
  lastUsedAt: timestamp('last_used_at'),
  useCount: integer('use_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
