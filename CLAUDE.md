# Claude Code Development Guidelines

This file provides guidance to Claude Code when working with projects in this repository. Use this as a reference when scaffolding new projects or working on existing ones.

**Important**: Always use the latest stable versions of all packages unless there's a specific reason to pin a version. The versions mentioned in this guide are current as of creation but should be updated to latest when scaffolding new projects.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Package Manager](#package-manager)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Git Workflow](#git-workflow)
- [Pre-Commit Checklist](#pre-commit-checklist)
- [Authentication](#authentication)
- [Database Type Handling](#database-type-handling)
- [Multi-Tenancy (Optional)](#multi-tenancy-optional)
- [Testing](#testing)
- [Documentation & Planning Workflow](#documentation--planning-workflow)
- [General Principles](#general-principles)
- [Azure Deployment](#azure-deployment)
- [Scaffolding New Projects](#scaffolding-new-projects)

---

## Tech Stack

### Frontend

- **Framework**: React (latest)
- **Build Tool**: Vite (latest)
- **Routing**: React Router DOM
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (with Radix UI primitives)
- **Icons**: lucide-react
- **Type Safety**: TypeScript (latest stable)
- **Utilities**:
  - `clsx` and `tailwind-merge` for className management
  - `zod` for runtime validation

### Backend (Full-Stack Projects)

- **Server**: Express (latest)
- **API Layer**: tRPC for type-safe communication
- **Authentication**: Custom auth with express-session (inspired by Lucia patterns - see [Authentication](#authentication) section)
- **Database**: PostgreSQL with Drizzle ORM
- **Email**: Resend for transactional emails
- **Validation**: Zod schemas

### Development Tools

- **Package Manager**: pnpm (required)
- **Runtime**: Node.js with tsx for development
- **Linting**: ESLint
- **Formatting**: Prettier
- **Testing**: Vitest

---

## Package Manager

**CRITICAL**: Always use **pnpm** for all package management and script execution.

- NOT npm
- NOT npx

```bash
# Install dependencies
pnpm install

# Add a dependency
pnpm add package-name

# Add a dev dependency
pnpm add -D package-name
```

---

## Project Structure

### Common Scripts

```json
{
  "scripts": {
    // Development
    "dev": "concurrently \"pnpm run dev:client\" \"pnpm run dev:server\"",
    "dev:client": "vite",
    "dev:server": "tsx watch server/index.ts",

    // Building
    "build": "tsc && vite build",
    "build:server": "tsc --project tsconfig.server.json",
    "build:all": "pnpm build && pnpm build:server",

    // Production
    "start": "node dist/server/index.js",

    // Quality Checks
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint . --max-warnings=0",
    "depcheck": "depcheck",
    "check": "concurrently \"pnpm run lint\" \"pnpm run format:check\" \"pnpm run depcheck\" \"pnpm run build:all\"",

    // Database (if using Drizzle)
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx server/scripts/run-migrations.ts",

    // Testing
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

### Folder Structure

```
project-root/
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   └── ui/            # shadcn/ui components (never raw HTML form elements)
│   ├── lib/               # Utility functions
│   ├── hooks/             # Custom React hooks
│   └── pages/             # Page components (modules with 2+ pages get a folder)
├── server/                # Backend source (if full-stack)
│   ├── index.ts           # Server entry point
│   ├── routes/            # tRPC routers
│   ├── db/                # Database schemas and connections
│   └── scripts/           # Database migrations, etc.
├── public/                # Static assets
└── dist/                  # Build output
```

---

## Coding Standards

### DRY Principle (Don't Repeat Yourself)

**CRITICAL**: Always follow the DRY principle to avoid code duplication.

#### Method Overloads

Have simpler overloads delegate to more complex ones:

```typescript
// Good
function processData(input: string): Result {
  return processData(input, null, null);
}

function processData(input: string, option1?: string, option2?: string): Result {
  // Single implementation
}

// Bad - duplicates logic
function processData(input: string): Result {
  // Duplicated implementation
}

function processData(input: string, option1?: string, option2?: string): Result {
  // Same logic repeated
}
```

#### Shared Logic

- Extract common code into helper methods or base implementations
- Each piece of logic should exist in exactly one place
- Single source of truth for all data and logic

**Benefits**: Improves maintainability, reduces bugs, makes code easier to understand and modify.

### Simplicity Over Complexity

- Avoid over-engineering
- Only make changes that are directly requested or clearly necessary
- Keep solutions simple and focused
- Don't add features, refactoring, or "improvements" beyond what was asked
- Three similar lines of code is better than a premature abstraction

### Comments and Documentation

- Don't add docstrings, comments, or type annotations to code you didn't change
- Only add comments where logic isn't self-evident
- Document significant architectural decisions

### Error Handling

- Only validate at system boundaries (user input, external APIs)
- Trust internal code and framework guarantees
- Don't add error handling for scenarios that can't happen

### Type Safety

- Leverage TypeScript's type system. **End-to-end type safety is non-negotiable.**
- **NEVER use `as any`, `as never`, or `as unknown` as escape hatches.** If you find yourself reaching for one, the type model is wrong -- fix it. The only acceptable casts are narrowing casts to a known concrete type (`as 'admin' | 'manager'`, `as (typeof OPTIONS)[number]`) where the runtime value is guaranteed by the rendering code (e.g. a `<select>` whose options come from the same const array).
- Use `unknown` + runtime narrowing (`instanceof`, `typeof`, type guards) instead of `any`. For error handling in catch blocks, extract messages type-safely (e.g. via a `getErrorMessage(err: unknown)` helper) -- never `(err as Error).message`.
- Use proper generic constraints
- Prefer interfaces for object shapes
- Use Zod for runtime validation at boundaries

### Security

- Never introduce security vulnerabilities (XSS, SQL injection, command injection, etc.)
- If you notice insecure code, fix it immediately
- Validate and sanitize all external input
- Use parameterized queries, never string concatenation for SQL
- Be careful with file paths and command execution

### Code Style

- **Functional components**: Use function declarations, not arrow functions for components
- **Hooks**: Follow Rules of Hooks
- **Email handling**: Always lowercase and trim email addresses
- **No manifest files**: Use direct imports instead of index files
- **Utility-first CSS**: Use Tailwind classes, avoid custom CSS when possible

### Backwards Compatibility

- Don't add backwards-compatibility hacks (unused `_vars`, re-exports, `// removed` comments)
- If something is unused, delete it completely
- Only maintain compatibility when explicitly required

---

## Git Workflow

### Branch Management

**CRITICAL**: Always create a new branch for ALL new work.

#### Process for Every Feature or Fix

```bash
# 1. Switch to main
git checkout main

# 2. Pull latest changes
git pull origin main

# 3. Create new branch
git checkout -b <branch-name>
```

**Rules**:

- Never continue work on existing feature branches
- Never commit new features to branches with other unrelated work
- Each branch should contain ONE logical change

#### Branch Naming Conventions

- `feature/descriptive-name` - New features
- `fix/descriptive-name` - Bug fixes
- `security/descriptive-name` - Security updates
- `refactor/descriptive-name` - Code refactoring

### Commit Messages

**CRITICAL**: Do NOT include `Co-Authored-By: Claude` lines in commit messages.

#### Format

- Write concise, descriptive commit messages
- Use imperative mood ("Add feature" not "Added feature")
- Focus on the "what" and "why" of the change
- Explain important implications or side effects

#### Conventional Commits (Preferred)

```
feat: Add user authentication
fix: Correct calculation in tax service
refactor: Extract database logic to repository
docs: Update API documentation
test: Add unit tests for payment service
```

### Pull Request Workflow

When a feature or fix is ready:

1. **Ensure all checks pass**: `pnpm run check` succeeds
2. **Commit all changes** with descriptive message
3. **Push the branch**: `git push -u origin <branch-name>`
4. **Create a PR**: `gh pr create`
   - Include clear summary of changes
   - Add appropriate reviewers
   - Link related issues

### Security Updates

When addressing security vulnerabilities:

1. Create branch: `security/descriptive-name`
2. Use `pnpm audit` to identify issues
3. Prefer `pnpm update <package> --latest` for safe version bumps
4. **Never pin to fixed versions** without explicit user approval
5. Verify with `pnpm audit` after updates
6. Run `pnpm run check` to ensure nothing breaks
7. Commit and create PR as usual

---

## Pre-Commit Checklist

**CRITICAL**: ALWAYS run these commands before committing:

```bash
# 1. Format code
pnpm format

# 2. Run all checks (lint, format check, depcheck, build)
pnpm run check
```

Or if project has `build:all`:

```bash
# Build both frontend and backend
pnpm build:all
```

**All checks must pass before committing.**

### Before EVERY Commit

1. **Check git status** to ensure no unintended changes
2. **Build succeeds** without errors
3. **Tests pass** (if applicable)
4. **Code quality checks pass** (linting, formatting)

**NEVER commit without testing the build first.**

---

## General Principles

### Priority: Don't Break Anything

**Stability over perfection.** Always prioritize working code over perfect code.

### Development Philosophy

1. **Test thoroughly before committing** - Never commit untested code
2. **Keep changes focused and atomic** - One logical change per commit/PR
3. **Document significant changes** - Explain architectural decisions
4. **Avoid premature optimization** - Optimize only when necessary
5. **Trust the user's expertise** - Ask questions when requirements are unclear

### Component Patterns

- **Functional components** with hooks
- **Component composition** over inheritance
- **Utility-first styling** with Tailwind
- **shadcn/ui components** for UI primitives

### State Management

- **TanStack React Query** for server state
- **Local state** with React hooks (useState, useReducer)
- **No global state libraries** unless explicitly needed

### API Communication (Full-Stack)

- **tRPC** for end-to-end type safety
- **Zod schemas** for validation
- **Shared types** between frontend and backend
- **No manual API type definitions** - types flow through tRPC

### UI/UX Principles

#### User Feedback for All Actions

**CRITICAL: EVERY user action MUST provide visible feedback.**

Rules:

- ❌ **NEVER** leave user actions without feedback
- ✅ **ALWAYS** provide immediate feedback for all mutations and actions
- ✅ Show loading states during async operations (disabled buttons, spinners, "Processing...")
- ✅ Show success feedback (toast notifications, updated UI state, success messages)
- ✅ Show error feedback (toast notifications, error banners, inline error messages with details)

Examples:

- Form submissions: Disable submit button → show "Saving..." → display success toast or error message
- API calls: Show loading indicator → provide success/error notification
- Authentication: Show "Authorizing..." → display success or detailed error message
- Data sync: Display progress indicator → show success/error notification with details

Why this matters:

- Users need confirmation that their action was received and processed
- Silent failures cause confusion and repeated attempts
- Immediate feedback improves user confidence and experience
- Detailed error messages help users understand and resolve issues

#### Forms and Data Entry

**Dialogs (modals) are ONLY for confirmations and very simple actions (1-3 fields max).** For forms with **4+ fields**, use dedicated routed pages. This enables:

- Better UX on mobile/tablets and for field workers
- Browser back/forward navigation, bookmarkable/shareable URLs
- No overlay/z-index issues

Rules:

- **Dedicated pages** for create/edit flows with 4+ fields (e.g., `/customers/new`, `/customers/:id/edit`)
- **Dialogs only** for confirmations (delete, cancel) and very simple actions (1-3 fields max)
- The same `EntityForm` component handles both create and edit by checking whether an `:id` param exists

#### Dynamic vs Static Selection

- **Combobox** (autocomplete with search) for dynamic data (database records, API results). Load max 20 results initially and as user types.
- **Select** (shadcn/ui Select component) for fixed option sets (enums, statuses, types).
- **NEVER use raw HTML `<select>`.** Always use the shadcn/ui `Select` component so it matches the design system.

#### Server-Side Pagination

Resource list pages must support server-side pagination, filtering, and sorting with URL-persisted state:

- All filter, sort, and page state persisted in URL search params (e.g., `?page=2&sort=name&dir=asc&status=active&q=smith`)
- Browser back/forward works, links are shareable and bookmarkable
- Use `useSearchParams` from React Router to read/write URL state
- Default page size: 20 rows

#### Page Naming Convention

Pages live in `src/pages/`. Naming pattern (no "Page" suffix):

- **List pages**: Plural entity name — `Customers`, `Locations`, `Certificates`
- **Form pages**: EntityForm — `CustomerForm`, `LocationForm` (handles both create and edit via route params)
- **Detail pages**: EntityDetail — `CustomerDetail`, `LocationDetail`
- **One-offs**: `Dashboard`, `Calendar`, `Settings`, `Login`, `Register`

---

## Authentication

For projects that require their own authentication and user management system (not using third-party services like Clerk, Auth0, etc.), follow these patterns inspired by **Lucia** (now deprecated, but patterns are proven and recommended).

### CRITICAL: One Users Table for All Credentials

**There is exactly ONE table that stores human credentials: `users`.** This is non-negotiable across every project in this repo. Passwords/credential fields (`hashed_password`, `email_verified`, `failed_login_attempts`, `locked_until`, password-reset tokens, etc.) live ONLY in `users` -- NEVER in any other table.

**Do NOT create:**

- A separate `platform_admins` (or `staff_credentials`, or `customer_users`) table -- platform-level role belongs on `users.role`.
- A separate `customers` table that holds passwords -- customer billing data lives in a `customers` table, but if a customer needs portal login they get a row in `users` linked from `customer_contacts.userId`.
- A second authenticated identity flow with its own credentials. Login is unified.

**Two role layers (the standard pattern):**

- `users.role` -- PLATFORM-level role. Typical values: `'superadmin'` | `'user'`. `'user'` = "no platform access".
- `organization_members.role` (or equivalent join table) -- TENANT-level role. Typical values: `'admin'` | `'manager'` | `'user'` | `'customer'`.

**One identity, many roles.** A single email == one `users` row. That row may simultaneously be a customer of tenant A, an admin of tenant B, and a platform superadmin -- via three independent rows in the appropriate join tables, all pointing back at the same `users.id`. The login UI dispatches to the right portal based on which roles the user actually holds.

**Bootstrap a platform superadmin via a CLI seed script.** Convention: `pnpm create:superadmin` -> `tsx server/scripts/create-superadmin.ts` -- interactive (prompts for email, password, optional tenant name), idempotent (truncates app tables when run in dev), refuses to run when `NODE_ENV=production`.

### Questions to Ask When Scaffolding a New Project

Before generating auth scaffolding, **ask the user** about each of these:

1. **Is email verification required before login?** (Recommended for any app that handles money or sensitive data; optional for general-purpose SaaS where verify-email-on-first-action is acceptable.)
2. **Is multi-tenancy needed?** (If yes, scaffold `tenants` + `organization_members` from the start.)
3. **Will customers have portal login?** (If yes, plan `customer_contacts.userId` linking from day 1, even if the portal itself ships in a later phase.)
4. **Who's the platform superadmin?** (Confirm the CLI seed script meets their needs.)

Capture each decision in the project's `STATUS.md` or `IMPLEMENTATION_PLAN.md` so future you doesn't have to re-derive it.

### When to Use Custom Auth

Use custom authentication when:

- You need full control over user data and auth flow
- You want to avoid external service dependencies and costs
- You have specific compliance requirements (GDPR, data residency, etc.)
- You need custom user models or authentication flows

### Authentication Stack

```typescript
// Required packages
{
  "argon2": "latest",              // Password hashing (memory-hard algorithm)
  "express-session": "latest",     // Session management
  "connect-pg-simple": "latest",   // PostgreSQL session store
  "helmet": "latest",              // Security headers
  "express-rate-limit": "latest",  // Rate limiting/DDoS protection
  "resend": "latest",              // Email service (transactional emails)
  "zod": "latest",                 // Input validation
  "@trpc/server": "latest",        // Type-safe API with middleware
  "drizzle-orm": "latest",         // Database ORM
  "pg": "latest",                  // PostgreSQL client
  "postgres": "latest"             // SQL builder
}
```

### Database Migrations

**CRITICAL RULE: ALL database schema changes MUST go through migrations. NO exceptions.**

```bash
# When you modify server/db/schema.ts:
pnpm db:generate  # Generate migration SQL file
pnpm db:migrate   # Apply migration to database
```

**Requirements:**

- ❌ **NEVER** create tables/columns with manual scripts or SQL commands
- ❌ **NEVER** bypass the migration system
- ❌ **NEVER** manually execute SQL for schema changes
- ❌ **NEVER** run raw SQL against the database to "fix" schema issues — always create a migration
- ❌ **NEVER** edit an already-applied migration file — if a migration has already run (locally or in production), create a **new** migration file for additional changes. The migration journal tracks what has been applied; editing an applied file means those changes silently never run.
- ✅ **ALWAYS** modify `schema.ts` then run `db:generate` and `db:migrate`
- ✅ Migrations must work in fresh environments with zero manual intervention
- ✅ `pnpm db:migrate` on a new database = complete working schema
- ✅ If `db:generate` fails (e.g., interactive prompts for rename detection), write the migration SQL manually and add the journal entry — but **never** edit an existing applied migration

**Why this is non-negotiable:**

- Production deployments rely entirely on migrations
- New team members/environments must be reproducible
- Manual scripts create schema drift and deployment failures
- Migration conflicts in production = critical downtime
- CI/CD pipelines need clean, automated migrations
- Editing applied migrations causes silent schema drift — changes appear in the file but never execute

**If migrations fail:** Fix the migration files, don't work around them with scripts.

### Database Schema

```typescript
// server/db/schema.ts
import {
  pgTable,
  bigserial,
  varchar,
  boolean,
  integer,
  timestamp,
  json,
} from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  hashedPassword: varchar('hashed_password', { length: 255 }).notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),

  // Security fields for brute force protection
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Optional: Email verification tokens
export const verificationTokens = pgTable('verification_tokens', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  userId: bigserial('user_id', { mode: 'bigint' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### Session Configuration

```typescript
// server/index.ts
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

const PgStore = connectPgSimple(session);

app.use(
  session({
    store: new PgStore({
      pool,
      tableName: 'session', // Auto-creates table if not exists
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true, // Prevents JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // Works with redirects
    },
  }),
);
```

### Session TypeScript Definition

```typescript
// server/types/session.d.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string; // User ID as string (converted from bigint)
    userEmail?: string; // User's normalized email
    // Add other session fields as needed for your project
  }
}
```

### Authentication Router Pattern

```typescript
// server/routers/authRouter.ts
import { z } from 'zod';
import argon2 from 'argon2';
import { publicProcedure, router } from '../trpc';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase().trim(),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check for existing user
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Hash password with argon2
      const hashedPassword = await argon2.hash(input.password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: input.email,
          hashedPassword,
          emailVerified: false,
          role: 'user',
        })
        .returning();

      // Set session
      ctx.session.userId = newUser.id.toString();
      ctx.session.userEmail = newUser.email;

      return { success: true };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase().trim(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new Error('Account locked due to too many failed attempts');
      }

      // Reset lock if expired
      if (user.lockedUntil && user.lockedUntil <= new Date()) {
        await db
          .update(users)
          .set({
            lockedUntil: null,
            failedLoginAttempts: 0,
            updatedAt: sql`NOW()`,
          })
          .where(eq(users.id, user.id));
      }

      // Verify password
      const valid = await argon2.verify(user.hashedPassword, input.password);

      if (!valid) {
        // Increment failed attempts
        const newAttempts = user.failedLoginAttempts + 1;
        const lockUntil =
          newAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

        await db
          .update(users)
          .set({
            failedLoginAttempts: newAttempts,
            lockedUntil: lockUntil,
            updatedAt: sql`NOW()`,
          })
          .where(eq(users.id, user.id));

        throw new Error('Invalid credentials');
      }

      // Reset failed attempts on successful login
      await db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: sql`NOW()`,
        })
        .where(eq(users.id, user.id));

      // Set session
      ctx.session.userId = user.id.toString();
      ctx.session.userEmail = user.email;

      return { success: true };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    return new Promise((resolve, reject) => {
      ctx.session.destroy((err) => {
        if (err) reject(err);
        ctx.res.clearCookie('connect.sid');
        resolve({ success: true });
      });
    });
  }),

  currentUser: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session.userId) {
      return null;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, BigInt(ctx.session.userId)),
      columns: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      // User was deleted, clear session
      ctx.session.destroy(() => {});
      return null;
    }

    return {
      id: user.id.toString(),
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }),
});
```

### tRPC Middleware Procedures

```typescript
// server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires authenticated user
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session, // Type-narrowed session
    },
  });
});
```

### Security Features

```typescript
// server/index.ts - Security setup
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

### Email Verification with Resend

```typescript
// server/utils/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: 'noreply@yourdomain.com',
    to: email,
    subject: 'Verify your email',
    html: `
      <h1>Verify your email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  });
}

// In authRouter register procedure
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '../utils/email';

// After user creation
const token = randomBytes(32).toString('hex');
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

await db.insert(verificationTokens).values({
  userId: newUser.id,
  token,
  expiresAt,
});

await sendVerificationEmail(newUser.email, token);
```

### Password Reset Security

These rules MUST be followed when implementing password reset flows:

#### Token Generation & Storage

- Generate `randomBytes(32).toString('hex')` — 64 hex chars, 256 bits entropy
- **Store the SHA-256 hash** of the raw token in the database (`tokenHash` column) — never store the raw token
- **Send only the raw token** to the user's email
- Tokens expire after **1 hour** (`expiresAt` timestamp)
- Each `forgotPassword` request **deletes all previous tokens** for that user (only one valid token at a time)
- Tokens are **single-use** — deleted immediately after a successful reset

#### Email Enumeration Prevention

- `forgotPassword` ALWAYS returns the same generic message: `"If an account with that email exists, you will receive a reset link shortly."`
- Never return different messages, status codes, or errors that reveal whether an email is registered

#### Timing Attack Mitigation

- `forgotPassword` enforces a **minimum 500ms response time** via `enforceMinDelay()` regardless of code path
- Prevents attackers from distinguishing "user found" (slow — DB write + email) from "user not found" (fast — no-op)

#### Session Invalidation After Reset

- On successful reset: `DELETE FROM session WHERE sess->>'platformUserId' = $userId`
- Invalidates ALL active sessions for that user, forcing re-login with the new password
- Users must sign in again after resetting — this is intentional and secure

#### Lockout Reset on Password Change

- Reset `failedLoginAttempts` to 0 and clear `lockedUntil` on password change
- Allows the user to log in immediately with their new password even if their account was locked

#### Password Reset Routes

- `/forgot-password` and `/reset-password` must be accessible in ALL auth states (authenticated and unauthenticated)
- Handles the edge case of a logged-in user clicking a reset link from email

#### Database Schema

```typescript
passwordResetTokens: {
  id, userId (FK → users, cascade delete),
  tokenHash varchar(64) UNIQUE,  // SHA-256 of raw token
  expiresAt, createdAt
}
```

### Email Service Patterns (Resend)

- Email sending is always **non-blocking** (`.catch(...)`) — email failure must never break auth flows
- If `RESEND_API_KEY` is missing the module silently skips sending (safe for local dev without keys)
- Email templates are plain HTML inline in `server/utils/email.ts`

### Key Security Practices

1. **Password Hashing**: Always use argon2 (memory-hard, resistant to GPU attacks)
2. **Email Normalization**: Always lowercase and trim emails before storage/comparison
3. **Brute Force Protection**: Lock accounts after multiple failed attempts (5 attempts, 15-minute lockout)
4. **Session Security**: HTTP-only cookies, secure flag in production, SameSite protection
5. **Rate Limiting**: Prevent DDoS and abuse (500 requests per 15 minutes per IP)
6. **Input Validation**: Use Zod schemas for all user input
7. **BigInt Handling**: Convert to string for JSON serialization (see [Database Type Handling](#database-type-handling))
8. **Email Verification**: Use secure tokens with expiration
9. **Password Reset**: SHA-256 hashed tokens, single-use, timing-safe (see above)

---

## Database Type Handling

PostgreSQL types require careful handling when returning from tRPC endpoints.

### BigInt Serialization

**Problem:** `bigserial` (bigint) fields cannot be JSON serialized directly — `JSON.stringify` throws.

**Solution:** Destructure BigInt fields first, then spread the rest.

```typescript
// ❌ BAD - BigInt in spread causes serialization error
return items.map((item) => ({
  ...item,
  id: item.id.toString(), // Too late - BigInt already in object
}));

// ✅ GOOD - Destructure BigInt fields first
return items.map((item) => {
  const { id, organizationId, ...rest } = item;
  return {
    ...rest,
    id: id.toString(),
    organizationId: organizationId.toString(),
  };
});
```

**Key pattern:** Destructure ALL BigInt fields → spread remaining fields (`...rest`) → add back as strings.

### Decimal / Money Types

**Problem:** PostgreSQL `decimal` and `money` types return as strings, not numbers.

**Solution:** Convert with `parseFloat()` for display. Use SQL for arithmetic.

```typescript
// ❌ BAD - price is a string, toFixed() fails
<td>${product.price.toFixed(2)}</td>

// ✅ GOOD - parseFloat first
<td>${parseFloat(product.price).toFixed(2)}</td>
```

**CRITICAL: Never use JavaScript for money math — always use SQL:**

```typescript
// ✅ GOOD — atomic, no precision loss
await db.update(accounts)
  .set({ balance: sql`${accounts.balance} + ${amount}` })
  .where(eq(accounts.id, accountId));

// ❌ BAD — race conditions + precision loss
const acct = await db.query.accounts.findFirst(...);
const newBal = Number(acct.balance) + amount;
await db.update(accounts).set({ balance: String(newBal) });
```

For multi-record financial operations, wrap in a database transaction.

### Date Handling

Drizzle returns dates as `Date` objects. JSON serialization converts them to ISO strings automatically. Frontend receives ISO strings — convert back with `new Date(data.createdAt)` if needed. Be aware of timezone conversions.

### Status Columns

Use `VARCHAR` (not PostgreSQL enums) for status columns — allows adding new statuses without migrations:

```typescript
status: varchar('status', { length: 50 }).notNull().default('active'),
```

---

## Multi-Tenancy (Optional)

For projects that need organization-level isolation (SaaS with multiple tenants), extend the base authentication with these patterns:

### When to Use Multi-Tenancy

- Building a B2B SaaS application
- Multiple organizations need data isolation
- Users can belong to multiple organizations
- Organization-level billing or settings

### Multi-Tenant Database Schema

```typescript
// Organizations table
export const organizations = pgTable('organizations', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User-Organization membership (many-to-many)
export const organizationMembers = pgTable('organization_members', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  userId: bigserial('user_id', { mode: 'bigint' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: bigserial('organization_id', { mode: 'bigint' })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('member'), // 'owner' | 'admin' | 'member'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Audit logs with organization context
export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  organizationId: bigserial('organization_id', { mode: 'bigint' }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 255 }).notNull(),
  resource: varchar('resource', { length: 255 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  details: json('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### Multi-Tenant Session

```typescript
// server/types/session.d.ts
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    orgId?: string; // Current organization context
  }
}
```

### Multi-Tenant Middleware

```typescript
// server/trpc.ts

// Requires organization context
export const orgProtectedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session.orgId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization selected' });
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, ctx.session.orgId),
  });

  if (!org || !org.isActive) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid organization' });
  }

  // Verify user is member of organization
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, BigInt(ctx.session.userId!)),
      eq(organizationMembers.organizationId, org.id),
    ),
  });

  if (!membership) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this organization' });
  }

  return next({
    ctx: {
      ...ctx,
      org,
      membership,
    },
  });
});

// Requires organization admin role
export const orgAdminProcedure = orgProtectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.membership.role !== 'admin' && ctx.membership.role !== 'owner') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }

  return next({ ctx });
});
```

### Row-Level Security Pattern

For multi-tenant data isolation, always filter queries by organization:

```typescript
// Good - filters by organization
const customers = await db.query.customers.findMany({
  where: eq(customers.organizationId, ctx.org.id),
});

// Bad - returns data across all organizations
const customers = await db.query.customers.findMany();
```

### Login & Org Selection Workflow (Multi-Tenant)

When a project supports multi-tenancy AND a separate platform-superadmin portal, use this canonical post-login flow. It's deliberately simple and predictable across projects.

**Two distinct authenticated layouts, one for each portal:**

- **`AppLayout`** — Org portal. Wraps tenant-scoped routes. Sidebar uses an org switcher at the top (dropdown if user is a member of more than one org, plain text otherwise).
- **`AdminLayout`** — Internal superadmin portal. Wraps `/admin/*` routes. Sidebar has admin-specific nav. Renders a redirect to `/select-org` if the logged-in user is not a superadmin.

**Switching between portals:**

- **Org → Admin**: Org sidebar shows an "Admin Portal" button above logout, visible only when `currentUser.isSuperAdmin === true`.
- **Admin → Org**: Admin sidebar shows a "Switch to Org Portal" button above logout, visible only when the superadmin is also a member of at least one org.

**The `OrgSelector` page (`/select-org`):**

After successful login, the user is always redirected to `/select-org`. That page resolves where to send them:

1. Not logged in → `/login`.
2. **0 org memberships + superadmin** → redirect to `/admin/dashboard`.
3. **0 org memberships + not superadmin** → render a "no organizations" message (likely an invitation issue).
4. **Cached `selectedOrgSlug` matches a current membership** → call `auth.switchOrganization` for that slug, persist the cache, then navigate to the org dashboard.
5. **Cached slug exists but no longer matches** → clear the cache and fall through to the selector UI.
6. **One or more memberships** → render the selector card. For superadmins, show an "Admin Portal" option pinned at the top above the org list.

**Selected org cache (localStorage):**

- Key: `<project>.selectedOrgSlug` — managed by a tiny helper module (`src/lib/selectedOrg.ts`) exposing `getCachedOrgSlug` / `setCachedOrgSlug` / `clearCachedOrgSlug`.
- Written when the user picks an org on the `OrgSelector` page or via the org switcher dropdown in the sidebar.
- Cleared when the user clicks "Admin Portal" from `OrgSelector`, or when the cached slug doesn't match any of the user's active memberships (validated on every `OrgSelector` mount — never trust the cache without checking against `currentUser.organizations`).

**Why this works:**

- The cache is just a UX hint, not a security boundary — `auth.switchOrganization` validates membership server-side regardless.
- Single source of truth for "where should this user be?" (the `OrgSelector` page) — no duplicate redirect logic in `Login`, in route guards, or in layouts.
- Superadmins never bypass the membership check by default; viewing arbitrary tenants would require a separate, intentionally-implemented impersonation feature.

---

## Team Invitations Pattern

When inviting users to an organization, follow the **passwordless user + invited member** pattern instead of a standalone invitations table:

### Flow

1. **Admin invites `bob@example.com`** → Create a `users` record with no password (`hashedPassword = null`) if the user doesn't exist. Create an `organizationMembers` record with `status = 'invited'`.
2. **Multiple orgs can invite the same email** → Each creates its own `organizationMembers` row (all `status = 'invited'`). The user record is shared.
3. **Bob tries to login** → Fails because no password. Error message tells them to register.
4. **Bob registers** → Backend finds the existing passwordless user by email, sets the password. Auto-accepts all pending `organizationMembers` (sets `status = 'active'`). Also creates the new organization the user registered with.
5. **Optional: invitation tokens** → Store in a separate `organizationInvitations` table for email links, audit trail, and expiry tracking. These are supplementary — the core state lives on `organizationMembers.status`.

### Schema Requirements

```typescript
// Users table — hashedPassword is NULLABLE (null = invited, not yet registered)
export const users = pgTable('users', {
  hashedPassword: varchar('hashed_password', { length: 255 }), // null = invited user
  // ...
});

// Organization Members — add status and invitedByUserId
export const organizationMembers = pgTable('organization_members', {
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'invited'
  invitedByUserId: bigint('invited_by_user_id', { mode: 'bigint' }), // nullable
  // ...
});

// Optional: Organization Invitations (token tracking / email links / audit)
export const organizationInvitations = pgTable('organization_invitations', {
  inviteTokenHash: varchar('invite_token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  // ...
});
```

### Key Rules

- **Middleware must filter by `status = 'active'`** — `orgProtectedProcedure` should only accept active members, not invited ones
- **Login checks for null password** — Return a clear message telling the user to register
- **Registration handles existing passwordless users** — Find by email, set password, auto-accept pending memberships
- **Multiple org invites** — The same email can be invited to many orgs before registering; each creates a separate `organizationMembers` row
- **Token security** — Store SHA-256 hash of token in DB, send raw token in email. Tokens expire after 7 days.

### Why This Pattern

- No "phantom" invitation records disconnected from the user model
- Clean registration flow — invited users just register normally
- Multi-org invites work naturally (multiple `organizationMembers` rows)
- The `organizationMembers` table is the single source of truth for membership state
- Passwordless users can't login (no password = no access until registration)

### Registration & Invite-Accept — split into two flows

A single `auth.register` mutation that _requires_ an org name + slug is wrong. Invited users shouldn't have to invent an org just to set a password. Two distinct entry points:

**1. Invite-accept flow** (`/invite/accept?token=...`)

- If not logged in:
  - Email already has a password → redirect to `/login` with the invite token preserved; on successful login, the pending memberships auto-activate.
  - Email has no password (passwordless invited user) → show **"Set Password"** form (single field). Submitting calls a new `auth.acceptInvite` mutation that hashes the password, sets it on the user, activates all `organizationMembers` rows for that user, and logs them in.
- If already logged in:
  - Email matches → activate the membership and redirect to the org dashboard.
  - Email doesn't match → show "log in as the right user" message.

**2. Regular registration flow** (`/register`)

- Email + password are **required**.
- Org name + slug are **optional**. If provided, create the org and add the user as `owner`. If skipped, the user has zero memberships after registration.
- After successful registration, redirect to `/select-org`. The selector handles the three cases: 0 orgs (offer "Create organization" CTA), 1 org (auto-redirect), n orgs (selector card). Superadmins also see the "Admin Portal" option.
- Once logged in, users always have a "Create organization" option in the org switcher / OrgSelector — they don't need to register again to start a new org.

**Server endpoints needed:**

```typescript
// Existing — change org fields to optional
auth.register: { email, password, organizationName?, organizationSlug? }

// New — invited user setting their first password
auth.acceptInvite: { token, password }

// New — logged-in user creating a new org
auth.createOrganization: { name, slug }
```

**Why this split:**

- Invited users have a frictionless onboarding (one field).
- Self-service signups don't have to fake an org if they're just trying the product.
- The "create org while logged in" path means orgs aren't tied to registration.

### Auth pages must use the same UI primitives as the rest of the app

Auth pages (`Login`, `Register`, `ForgotPassword`, `ResetPassword`, `VerifyEmail`, `InviteAccept`, the Landing page if you have one) must use the same UI primitives as the authenticated portal — typically shadcn/ui (`<Button>`, `<Input>`, `<Card>`, `<Label>`, etc.) on the same Tailwind theme tokens (`bg-background`, `text-foreground`, `border-border`).

Do NOT use raw `<input>`/`<button>` with hand-rolled colour classes (`bg-gray-100`, `bg-blue-600`, etc.). Pre-shadcn era styling drifts from the rest of the app and looks "different" once a user logs in. This is a common regression in projects that scaffolded the auth pages first and added shadcn later.

Concretely:

- Center the auth card on `bg-background` (not `bg-gray-100`).
- Use `<Card>` for the panel.
- Use `<Input>` and `<Label>` for fields.
- Use `<Button>` for primary actions (will pick up the theme's primary colour automatically).
- Use `<Alert variant="destructive">` for error messages, not raw `bg-red-100` divs.

### Role display: never conflate platform-level and tenant-level roles

Two role layers (per the One Users Table for All Credentials rule):

- `users.isSuperAdmin` — platform-level. Boolean. True for the handful of staff that operate the SaaS itself.
- `organizationMembers.role` — tenant-level. `'owner' | 'admin' | 'member' | 'customer' | 'contractor'` etc., scoped to one org.

A user can be **superadmin AND a member of org A AND admin of org B** all at the same time. Each of those is a separate fact.

**The internal admin portal (`/admin/users`)** must show these as separate columns:

- "Platform role" → `super_admin` or empty
- "Org memberships" → list of `{ orgName, role }` (or a count + drill-through)

Showing one collapsed `role` column with values like `super_admin | member` is a **bug** — non-superadmin users with admin roles in five orgs will all show as "member", which contradicts what they see in their own org portal.

**The org portal** shows the user's role _in the current org_ (from `organizationMembers.role`). That's correct in isolation; it's the admin portal that must not pretend platform role and org role are the same field.

### Promoting a user to superadmin

Bootstrap the _first_ superadmin via the CLI seed script (idempotent, refuses to run when `NODE_ENV=production` if you want — see Authentication section). For _subsequent_ promotions, expose a `admin.promoteUser` / `admin.demoteUser` mutation under `superAdminProcedure`. Don't make people SSH into prod and run SQL — that's a footgun and there's no audit trail.

```typescript
// server/routers/adminRouter.ts
promoteUser: superAdminProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    // Don't allow self-targeted ops if you want to enforce a "two superadmins always" rule.
    await db.update(users)
      .set({ isSuperAdmin: true, updatedAt: sql`NOW()` })
      .where(eq(users.id, BigInt(input.userId)));
    await auditLog({ ... });
    return { success: true };
  }),
```

UI: a "Promote to superadmin" / "Demote" button per row on `AdminUsers`, gated to superadmins, with a confirmation dialog (this is a sensitive op). Audit-log every promotion/demotion.

---

## Testing

Tests are an investment, not a chore. The goal is **"no silent regressions"** — not "100% line coverage". Aim for confidence that the next change won't break something subtle, with the minimum number of tests that achieve it.

### Tiered Test Strategy

Different layers of code deserve different kinds of tests. Pick the right tier; don't blanket-test everything.

#### Tier 1 — Pure-logic unit tests (Vitest)

For deterministic, pure functions: calculations, parsers, formatters, state machines, validators — anything that takes inputs and returns outputs without I/O. Examples: tax calculation, date math, money rounding, slug generation, retry/back-off policies, permission resolution.

- Use **table-driven tests** — one `test.each([...])` block per function
- Cover **edge cases explicitly**: zero, negative, empty, max, boundary, timezone DST, leap years, currency-with-zero-decimals, etc.
- Fast: the whole tier should run in well under a second
- **TDD is appropriate here.** Writing the test from a worked example before the code forces you to define behaviour and surface edge cases up-front

#### Tier 2 — API integration tests (Vitest + real test DB)

For tRPC routers / Express endpoints. Use `appRouter.createCaller(ctx)` (tRPC) or `supertest` (Express) against a **real test database** — not a mock.

- One **separate test database** (e.g. `<project>_test`) on the same Postgres instance as dev
- **TRUNCATE-between-tests pattern**: a global `beforeEach` runs `TRUNCATE ... RESTART IDENTITY CASCADE` across all app tables. This was chosen over a transaction-per-test wrapper because routers commonly run their own nested `db.transaction()` calls (e.g. registration, payment flows) which can't be wrapped by an outer transaction without invasive refactoring. TRUNCATE is fast enough in practice. As a safety net, the integration-test bootstrap should refuse to run unless `TEST_DATABASE_URL` ends in `_test`. Tests cannot run in parallel under this pattern, so the integration project should set `fileParallelism: false` and `pool: 'forks'` with `singleFork: true`.
- Cover happy path, **auth/authorization** (anonymous, wrong role), **input validation**, and the negative cases users will actually hit
- For multi-tenant projects, **always include a "tenant A cannot see tenant B" assertion** for any tenant-scoped endpoint — this is the highest-value single test category
- Test alongside the feature, not before — TDD here is usually overkill

#### Tier 3 — External integration tests (webhooks, third-party SDKs)

For Stripe, OAuth callbacks, inbound webhooks — anything driven by an external system you don't control.

- POST signed fixture payloads to your webhook handler and assert DB state changes
- Test **idempotency** — replaying the same event must not double-write
- Use the vendor's CLI / fixtures where they exist (e.g. `stripe trigger`, `stripe fixtures`)
- Don't try to mock the third party at the SDK level — the mocks go stale instantly and give false confidence

#### Tier 4 — End-to-end (Playwright)

A **thin** layer covering only the journeys you cannot afford to break in production. 5–10 tests, not 500.

- Pick critical journeys: signup → onboarding, payment → receipt, password reset, role-based access, tenant switching
- Run on PRs, not on every save
- Brittle and slow — mitigate by keeping selectors stable (`data-testid`) and by NOT trying to E2E-test edge cases (those belong in Tier 1/2)

### What NOT to test

- React components that are pure presentation — the type system already catches most issues
- Trivial CRUD wrappers — if it's `db.insert(x).values(input)`, an integration test of the parent flow already covers it
- Drizzle / Express / React internals — trust the framework
- Implementation details (private functions, exact SQL strings) — test behaviour, not structure
- Don't write a test just to bump coverage; every test is code you have to maintain

### TDD: when to use it

- ✅ **Yes** for Tier 1 pure logic, especially anything financial, security-sensitive, or with non-obvious edge cases. Writing the failing test first is the fastest path to correct code there.
- ❌ **No** for Tier 2/3/4, UI components, schema/migration changes, or exploratory work. Write the code, then add the test.

### Test infrastructure setup (per project)

Set this up **before** writing the first feature test, so every subsequent test can use it:

1. **Test database**: a separate `<project>_test` database on the same Postgres instance. Connection via a `TEST_DATABASE_URL` env var. Schema kept in sync by running migrations from the test bootstrap (`migrate(db, { migrationsFolder })` in `beforeAll`).
2. **Vitest projects split**: separate `unit` and `integration` projects in `vitest.workspace.ts` (vitest 2.x; vitest 3.x uses `test.projects` in the main config) so they can be run independently (`pnpm test:unit`, `pnpm test:integration`). The unit project should not need the database.
3. **TRUNCATE setup file**: a setup file run by the integration project does `TRUNCATE ... RESTART IDENTITY CASCADE` on every app table in a global `beforeEach`. No teardown code in tests, no test ordering issues. The setup file should refuse to run if `TEST_DATABASE_URL` does not end in `_test` -- this safety net prevents accidentally wiping the dev database.
4. **`createTestCaller(ctx)`** helper for tRPC: builds a caller with a configurable session/tenant so auth/authorization branches can be exercised without a running HTTP server. The synthetic session should implement `destroy(cb)` / `save(cb)` / `regenerate(cb)` so router code that calls them works unchanged. Return both the caller AND the session object so tests can assert on session mutations (e.g. login, impersonation).
5. **Test data builders**: small `makeUser({...overrides})`, `makeTenant({...overrides})`, etc. factories. No giant shared fixture files — each test owns its data. Uniquify slugs/emails with a per-process counter so collisions can't happen.

### Continuous integration

- `pnpm test` (or split `pnpm test:unit` + `pnpm test:integration`) is part of `pnpm run check` and must pass before commit
- A CI gate should run the full suite — never merge red
- E2E (Tier 4) can run on a separate slower CI job that gates production deploys, not every PR

### When tests catch a bug in production

- Add the test that would have caught it **first**, watch it fail, then fix the code. This is the one place TDD applies retroactively, and it permanently raises the floor.
- The bug fix PR must include the test — not as a follow-up.

---

## Documentation & Planning Workflow

For every project in this repository, follow this documentation workflow to maintain clarity across sessions and prevent context fragmentation.

### Master Status File

**`STATUS.md`** is the **single source of truth** for every project's progress.

**Rules:**

1. ✅ **MUST be read at the start of every new session**
2. ✅ **MUST be updated when any plan file is created, modified, or deleted**
3. ✅ **MUST be updated when features are implemented or requirements change**
4. ✅ **MUST include links to all other documentation files**

**When to update STATUS.md:**

- New documentation file created → Register it in STATUS.md
- Documentation file deleted → Remove from STATUS.md
- Feature implemented → Mark as complete in STATUS.md
- Requirements change → Update relevant section in STATUS.md
- Session ends with pending work → Document what's next in STATUS.md

### Documentation Organization

```
PROJECT_ROOT/
├── STATUS.md                    # Master tracker - READ FIRST
├── CLAUDE.md                    # Project-specific conventions
├── README.md                    # Public project documentation
├── docs/                        # Optional: organized docs
│   ├── architecture/
│   ├── api/
│   └── deployment/
└── plans/                       # Optional: archived plans
    └── [date]-[feature].md
```

### Documentation Types

#### 1. STATUS.md (Master Tracker)

**Purpose:** Single source of truth for project state

**Required Sections:**

- **Current Status** - What's implemented, what's in progress
- **Next Steps** - Prioritized list of what to do next
- **Documentation Index** - Links to all other docs with brief description
- **Pending Decisions** - Questions/choices that need resolution
- **Session Handoff** - Notes for next session (what was being worked on)

**Update Frequency:** Every time something changes

#### 2. Feature Plans (e.g., USER_MANAGEMENT.md)

**Purpose:** Detailed design for a specific feature

**Contents:**

- Overview and goals
- Database schema changes
- API endpoints
- UI components needed
- Testing checklist

**Lifecycle:**

- Created when planning feature
- Updated as implemented
- Marked complete in STATUS.md when done
- **Can be deleted once fully implemented** (update README if necessary)
- Alternatively, can be archived in plans/ directory as reference

#### 3. Reference Documentation (e.g., INTEGRATION_GUIDE.md)

**Purpose:** Technical reference that doesn't change often

**Contents:**

- External system documentation
- Architecture decisions
- Integration guides

**Lifecycle:**

- Created once
- Rarely updated
- Referenced from STATUS.md

#### 4. Deployment/Operations (e.g., DEPLOYMENT.md)

**Purpose:** How to deploy, run, maintain the system

**Contents:**

- Deployment steps
- Environment setup
- Troubleshooting

**Lifecycle:**

- Updated as deployment changes
- Referenced from STATUS.md

---

### Session Start Checklist

**Every new session MUST begin with:**

1. ✅ Read `STATUS.md` top to bottom
2. ✅ Check "Session Handoff" section for context
3. ✅ Review "Next Steps" for priorities
4. ✅ Ask user to confirm current priority if unclear

---

### Session End Checklist

**Before ending session:**

1. ✅ Update STATUS.md with:
   - What was completed
   - What's in progress
   - What to do next
2. ✅ Update "Session Handoff" with context for next session
3. ✅ Ensure all new docs are registered in STATUS.md
4. ✅ Mark completed features as ✅ in STATUS.md

---

### When Context Runs Low

**Priority for summarization:**

1. **Keep in full context:** STATUS.md (always)
2. **Keep in full context:** Current feature plan being worked on
3. **Summarize:** Old conversation history
4. **Reference by path:** Other documentation (load as needed)

---

### Data Handling

- **Email normalization**: Always lowercase and trim email addresses
- **User input validation**: Validate at system boundaries
- **Sensitive data**: Never commit secrets, credentials, or API keys

### File Operations

- **Moving files**: Use `git mv` to preserve history
- **Creating files**: Only create when absolutely necessary
- **Prefer editing**: Always prefer editing existing files over creating new ones
- **No manifest files**: Use direct imports instead of index/manifest files

### Working with Claude Code

- **Ask questions** when requirements are unclear
- **Provide context** about architectural decisions
- **Explain trade-offs** when multiple approaches are viable
- **Report blockers** immediately if stuck
- **Verify assumptions** before making significant changes

---

## Summary of Critical Rules

1. ✅ Always use **pnpm** (not npm/npx)
2. ✅ **Never** include `Co-Authored-By: Claude` in commit messages
3. ✅ Always create a **new branch** from main for every feature/fix
4. ✅ Always run **`pnpm run check`** (or `pnpm build:all`) before committing
5. ✅ Follow **DRY principle** - no code duplication
6. ✅ Keep changes **simple and focused** - avoid over-engineering
7. ✅ **Don't break anything** - stability is the top priority
8. ✅ Use **shadcn/ui** for UI components
9. ✅ Use **TanStack React Query** for server state
10. ✅ Use **PostgreSQL** with Drizzle ORM for database
11. ✅ Use **Resend** for transactional emails
12. ✅ Follow **Lucia-inspired patterns** for custom authentication
13. ✅ **Test the build** before every commit
14. ✅ **Never use Claude Code worktrees** — always work directly on the repo

---

## Azure Deployment

When deploying a full-stack project to Azure App Service (Linux, Node.js), follow these patterns to avoid common pitfalls. These were established across bhst, gametoy, netpex, and jay-stock.

### ESM Import Extensions

**CRITICAL**: Node.js ESM requires explicit `.js` file extensions on ALL relative imports in server code.

```typescript
// ✅ Correct — works in Node.js ESM
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { router } from '../trpc.js';

// ❌ Wrong — fails at runtime with ERR_MODULE_NOT_FOUND
import { db } from '../db/index';
import { users } from '../db/schema';
import { router } from '../trpc';
```

TypeScript resolves `./foo.js` to `./foo.ts` during compilation, so this works in both dev (tsx) and production (compiled JS). This applies to every `.ts` file under `server/`.

### Server TypeScript Configuration

Use `ESNext` module and `ES2022` target — matching the working bhst/gametoy deployments:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist/server",
    "rootDir": "./server",
    "lib": ["ES2022"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

**Do NOT use** `"module": "ES2020"` or `"target": "ES2020"` — these are older standards that may cause issues with Node.js ESM on Azure.

### Database SSL for Azure PostgreSQL

Azure PostgreSQL requires SSL. Add conditional SSL support while preserving local Docker dev:

```typescript
const pool = new Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'mydb',
      }),
  ...(process.env.NODE_ENV === 'production' && { ssl: { rejectUnauthorized: false } }),
});
```

### Production Static File Serving

In production, Express serves both the API and the Vite-built frontend from a single process:

```typescript
if (process.env.NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const clientPath = path.join(__dirname, '../client');

  app.use(express.static(clientPath));

  // SPA fallback for client-side routing
  app.get('/*splat', (req, res, next) => {
    if (req.path.startsWith('/trpc') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}
```

### Auto-Migration on Startup

Run Drizzle migrations automatically in production before starting the server:

```typescript
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });
  }
  app.listen(port);
}
startServer();
```

### Migration Output Directory

Use `./drizzle` as the migration output directory (not `./server/db/migrations`). This is the standard convention and must be committed to git and included in the deploy package.

```typescript
// drizzle.config.ts
export default defineConfig({
  out: './drizzle',
  // ...
});
```

### .deployment File

Prevent Azure from running server-side builds. Create `.deployment` in the project root:

```ini
[config]
command = echo "Using pre-built application"
```

### GitHub Actions Workflow — Deploy Package

**CRITICAL**: Use `node-linker=hoisted` for the production pnpm install. pnpm's default symlink-based `node_modules` breaks when zipped and deployed to Azure. The `hoisted` linker creates a flat structure without symlinks.

```yaml
- name: Prepare deployment package
  run: |
    mkdir -p deploy
    cp -r dist deploy/
    cp -r drizzle deploy/
    cp package.json deploy/
    cp pnpm-lock.yaml deploy/
    cp .npmrc deploy/ || true
    cd deploy
    echo "node-linker=hoisted" >> .npmrc
    pnpm install --prod --frozen-lockfile
```

The deploy package should contain:

- `dist/` — compiled frontend (`dist/client/`) and server (`dist/server/`)
- `drizzle/` — migration files
- `package.json` and `pnpm-lock.yaml`
- `node_modules/` — production dependencies only (flat, no symlinks)

### Azure App Service Configuration

Required environment variables:

- `NODE_ENV=production`
- `DATABASE_URL=postgresql://<user>:<password>@<server>.postgres.database.azure.com:5432/<db>?sslmode=require`
- `SESSION_SECRET=<random 32-byte base64>`
- `APP_URL=https://<app-name>.azurewebsites.net`
- `SCM_DO_BUILD_DURING_DEPLOYMENT=false`

Startup command: `node dist/server/index.js`

### Azure Resource Naming

Follow consistent naming conventions:

- Resource groups: `<env>-resource-group` (e.g., `qa-resource-group`, `prod-resource-group`)
- PostgreSQL servers: `<env>-postgresql-server` (shared across projects in same env)
- Databases: `<project-name>` on the shared server (e.g., `jaystock`)
- App Service plans: `<env>-appservice-plan` (shared)
- Web Apps: `<env>-<project>-web` (e.g., `qa-jaystock-web`)

### Common Deployment Issues

| Issue                                                                  | Cause                                                          | Fix                                                    |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| `ERR_MODULE_NOT_FOUND` for relative imports                            | Missing `.js` extensions                                       | Add `.js` to ALL relative imports in server code       |
| `Cannot find module 'readable-stream'` etc.                            | pnpm symlinks broken in zip deploy                             | Use `node-linker=hoisted` in deploy .npmrc             |
| CJS loader used despite `"type": "module"`                             | Wrong `module`/`target` in tsconfig                            | Use `"module": "ESNext"`, `"target": "ES2022"`         |
| SSL connection errors to Azure PG                                      | Missing SSL config                                             | Add `ssl: { rejectUnauthorized: false }` in production |
| Container exits with code 1                                            | Check `az webapp log tail` for Node.js error                   | See specific error patterns above                      |
| Seed/admin scripts fail with `Cannot find package 'X'` from Kudu shell | Wrong shell (Kudu sidecar container has empty `/node_modules`) | Use **App Service SSH**, not Kudu SSH — see below      |

### Use App Service SSH, not Kudu SSH, for one-off scripts

Azure App Service Linux runs **two separate containers** per Web App:

- **App Service container** — the actual web app process. Has `/node_modules` populated by the startup script (extracted from `node_modules.tar.gz`). The running server, WebJobs, and any `node` processes you spawn here can resolve all installed packages.
- **Kudu container** — a sidecar for deployment, file-system browsing, and the SCM endpoint. Mounts the same `/home/site/wwwroot` (network share) but has its own **empty** `/node_modules`. Any Node script run from this container will fail with `Cannot find package 'X'` for every package — even though the running server is fine.

**Both containers expose an "SSH" entry point** in the Azure Portal, and they look identical from the user's side. Easy to pick the wrong one:

| Path                                                                                                      | Goes to                  | Use for                                                                   |
| --------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| **Azure Portal → Web App → Development Tools → SSH**                                                      | App Service container ✅ | Running scripts, debugging the server, anything that needs `node_modules` |
| Kudu (`https://<app>.scm.azurewebsites.net/webssh/host` or "Console" / "SSH" button under Advanced Tools) | Kudu sidecar ❌          | File-system browsing, deploy logs, `WEBSITE_*` env inspection             |

**Rule for any one-off operation that needs prod packages** (running migrations manually, seeding a superadmin, debugging tRPC procedures, etc.): always use **App Service SSH**, never Kudu SSH. If a Node script can't find a package, your first move should be to confirm which shell you're in (`hostname` differs between the two containers).

**The cleaner pattern** for ongoing operations is to run scripts from your local machine pointed at prod (`DATABASE_URL='postgresql://...azure...' pnpm <script>`), since it doesn't depend on which Azure shell you happen to land in. App Service SSH is the right tool for **debugging on a deployed instance** specifically.

---

## Scaffolding New Projects

When creating a new project, use this stack with latest versions:

### Frontend Setup

```bash
pnpm create vite@latest project-name --template react-ts
cd project-name
pnpm install

# Add essential dependencies
pnpm add react-router-dom @tanstack/react-query
pnpm add clsx tailwind-merge lucide-react zod

# Add Tailwind CSS v4
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p

# Add shadcn/ui
pnpm dlx shadcn@latest init
```

### Full-Stack Setup

```bash
# Backend dependencies
pnpm add express cors dotenv express-session zod
pnpm add @trpc/server @trpc/client

# Dev dependencies
pnpm add -D @types/express @types/cors @types/node tsx
pnpm add -D @types/express-session

# Database
pnpm add drizzle-orm pg postgres
pnpm add -D drizzle-kit @types/pg

# Authentication (if implementing custom auth)
pnpm add argon2 connect-pg-simple helmet express-rate-limit resend
```

### Quality Tools

```bash
pnpm add -D eslint prettier depcheck concurrently
pnpm add -D vitest @vitest/ui jsdom
pnpm add -D @testing-library/react @testing-library/jest-dom
```

### Project Structure Setup

After installation, create the standard structure:

```
project-root/
├── src/
│   ├── components/
│   │   └── ui/          # shadcn components
│   ├── lib/
│   ├── hooks/
│   └── pages/
├── server/
│   ├── index.ts
│   ├── trpc.ts
│   ├── context.ts
│   ├── routers/
│   │   └── authRouter.ts
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── types/
│   │   └── session.d.ts
│   └── utils/
└── drizzle.config.ts
```

---

## Project-Specific Notes

For project-specific configuration, architecture details, or special requirements, refer to the CLAUDE.md file in the individual project directory. This file provides the general patterns and practices for scaffolding and working with projects in this repository.
