# Book Centre FMS — Project Status

## Current Status

**Phase**: Initial scaffold complete. Infrastructure and auth fully implemented. All feature pages are shells ready for implementation.

## What's Built

### Infrastructure

- [x] Full-stack scaffold (React + Vite + tRPC + Express + Drizzle + PostgreSQL)
- [x] Docker Compose for local PostgreSQL
- [x] Tailwind CSS v4 + shadcn/ui components
- [x] ESLint + Prettier configured
- [x] TypeScript (frontend + backend)
- [x] drizzle.config.ts + migration scripts

### Database Schema

- [x] `users` — auth (superadmin / admin roles, brute-force protection)
- [x] `password_reset_tokens` — secure reset flow
- [x] `companies` — company management
- [x] `bank_accounts` — linked to companies
- [x] `contacts` — company holders, partners, lenders, borrowers
- [x] `categories` — transaction categories
- [x] `suppliers` — supplier management
- [x] `uploads` — bank statement uploads
- [x] `transactions` — transaction records
- [x] `bills` — company bills/debts
- [x] `report_templates` — saved report templates

### Auth (fully implemented)

- [x] Login page (email, password, remember me, show/hide, error states)
- [x] Forgot password (timing-safe, email enumeration proof)
- [x] Reset password (SHA-256 hashed tokens, 1hr expiry, single-use)
- [x] Change password (in Settings)
- [x] Super admin bootstrap script (`pnpm create:superadmin`)
- [x] Session management (PostgreSQL session store)
- [x] Brute force protection (5 attempts, 15min lockout)
- [x] Rate limiting (500 req / 15min)

### App Layout (fully implemented)

- [x] Sidebar navigation (Dashboard, Transactions, Companies, Contacts, Reporting, Settings)
- [x] Header with page title and avatar dropdown
- [x] Protected route wrapper
- [x] Logout

### Feature Pages

- [x] Dashboard — stat cards (live data), upload statement modal (CSV drag&drop, parse, duplicate detection, confirm import), uploads table (tabs/search/pagination/delete), Maaser modal
- [x] Transactions — full table with all columns, status tabs, search/filter/sort, single/bulk selection, action bar, bulk action bar, Process modal (queue flow, category required, relation/supplier/note/flag optional), Edit/Categorise/Relation/Supplier/Note/Flag/Delete modals, CSV export
- [x] Companies — full implementation (list, create form, detail page with 5 tabs)
- [x] Contacts — full implementation (list with search/role filter/sort, create form, detail page with inline editing + recent transactions)
- [ ] Reporting — empty state shell
- [x] Settings — profile editing + user management (superadmin)

### New Routers Added

- `dashboard` — stats query, maaserBalance query
- `uploads` — processUpload, confirmImport, cancelUpload, list
- `companies` — listAll, list, create, update, delete
- `bankAccounts` — listByCompany, listAll
- `categories` — list, create, update, delete
- `suppliers` — list, create
- `transactions` — list (enriched), process, update, delete, bulkDelete

## Next Steps (Priority Order)

1. **Reporting** — Filter panel, report generation, template library
2. **Settings** — Categories table (inline editable CRUD)

## Pending Decisions

- Email sending in production: set `RESEND_API_KEY` when ready
- Domain for emails: update `FROM` in `server/utils/email.ts`
- Azure deployment: follow CLAUDE.md Azure section when ready

## Session Handoff

**Last action**: Transactions page fully implemented.
**Next action**: Contacts page (role-tabbed table, create/edit modals by role).

## Documentation Index

- `scope.md` — Full UX specification (source of truth for feature requirements)
- `CLAUDE.md` — Tech stack, coding standards, deployment patterns
- `STATUS.md` — This file
