import { router } from '../trpc.js';
import { authRouter } from './authRouter.js';
import { usersRouter } from './usersRouter.js';
import { dashboardRouter } from './dashboardRouter.js';
import { uploadsRouter } from './uploadsRouter.js';
import { companiesRouter } from './companiesRouter.js';
import { bankAccountsRouter } from './bankAccountsRouter.js';
import { contactsRouter } from './contactsRouter.js';
import { billsRouter } from './billsRouter.js';
import { transactionsRouter } from './transactionsRouter.js';
import { categoriesRouter } from './categoriesRouter.js';
import { suppliersRouter } from './suppliersRouter.js';
import { reportTemplatesRouter } from './reportTemplatesRouter.js';

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  dashboard: dashboardRouter,
  uploads: uploadsRouter,
  companies: companiesRouter,
  bankAccounts: bankAccountsRouter,
  contacts: contactsRouter,
  bills: billsRouter,
  transactions: transactionsRouter,
  categories: categoriesRouter,
  suppliers: suppliersRouter,
  reportTemplates: reportTemplatesRouter,
});

export type AppRouter = typeof appRouter;
