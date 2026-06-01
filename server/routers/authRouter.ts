import { z } from 'zod';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { publicProcedure, protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { users, passwordResetTokens } from '../db/schema.js';
import { sendPasswordResetEmail } from '../utils/email.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

async function enforceMinDelay<T>(fn: () => Promise<T>, minMs: number): Promise<T> {
  const [result] = await Promise.all([fn(), new Promise((r) => setTimeout(r, minMs))]);
  return result;
}

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase().trim(),
        password: z.string().min(1),
        rememberMe: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user || !user.hashedPassword) {
        throw new Error('Invalid email or password');
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new Error('Account locked due to too many failed attempts. Try again in 15 minutes.');
      }

      if (user.lockedUntil && user.lockedUntil <= new Date()) {
        await db
          .update(users)
          .set({ lockedUntil: null, failedLoginAttempts: 0, updatedAt: sql`NOW()` })
          .where(eq(users.id, user.id));
      }

      const valid = await argon2.verify(user.hashedPassword, input.password);

      if (!valid) {
        const newAttempts = user.failedLoginAttempts + 1;
        const lockUntil =
          newAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;

        await db
          .update(users)
          .set({ failedLoginAttempts: newAttempts, lockedUntil: lockUntil, updatedAt: sql`NOW()` })
          .where(eq(users.id, user.id));

        throw new Error('Invalid email or password');
      }

      await db
        .update(users)
        .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: sql`NOW()` })
        .where(eq(users.id, user.id));

      if (input.rememberMe) {
        ctx.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      }

      ctx.session.userId = user.id.toString();
      ctx.session.userEmail = user.email;
      ctx.session.userRole = user.role;
      ctx.session.userName = user.name;

      return { success: true };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    return new Promise<{ success: boolean }>((resolve, reject) => {
      ctx.session.destroy((err) => {
        if (err) reject(err);
        ctx.res.clearCookie('connect.sid');
        resolve({ success: true });
      });
    });
  }),

  currentUser: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session.userId) return null;

    const user = await db.query.users.findFirst({
      where: eq(users.id, BigInt(ctx.session.userId)),
      columns: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (!user) {
      ctx.session.destroy(() => {});
      return null;
    }

    const { id, ...rest } = user;
    return { ...rest, id: id.toString() };
  }),

  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email().toLowerCase().trim() }))
    .mutation(async ({ input }) => {
      const GENERIC_MSG =
        'If an account with that email exists, you will receive a reset link shortly.';

      await enforceMinDelay(async () => {
        const user = await db.query.users.findFirst({
          where: eq(users.email, input.email),
          columns: { id: true, email: true },
        });

        if (!user) return;

        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

        const rawToken = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash,
          expiresAt,
        });

        await sendPasswordResetEmail(user.email, rawToken).catch(console.error);
      }, 500);

      return { message: GENERIC_MSG };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tokenHash = createHash('sha256').update(input.token).digest('hex');

      const tokenRecord = await db.query.passwordResetTokens.findFirst({
        where: eq(passwordResetTokens.tokenHash, tokenHash),
      });

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        throw new Error('Invalid or expired reset link. Please request a new one.');
      }

      const hashedPassword = await argon2.hash(input.password);

      await db
        .update(users)
        .set({
          hashedPassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: sql`NOW()`,
        })
        .where(eq(users.id, tokenRecord.userId));

      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenRecord.id));

      // Invalidate current session if logged in
      if (ctx.session.userId) {
        ctx.session.destroy(() => {});
      }

      return { success: true };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, BigInt(ctx.session.userId!)),
      });

      if (!user || !user.hashedPassword) {
        throw new Error('User not found');
      }

      const valid = await argon2.verify(user.hashedPassword, input.currentPassword);
      if (!valid) {
        throw new Error('Current password is incorrect');
      }

      const hashedPassword = await argon2.hash(input.newPassword);

      await db
        .update(users)
        .set({ hashedPassword, updatedAt: sql`NOW()` })
        .where(eq(users.id, user.id));

      return { success: true };
    }),
});
