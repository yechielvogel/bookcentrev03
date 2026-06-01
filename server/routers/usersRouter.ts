import { z } from 'zod';
import argon2 from 'argon2';
import { eq, sql } from 'drizzle-orm';
import { superAdminProcedure, protectedProcedure, router } from '../trpc.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { sendInviteEmail } from '../utils/email.js';
import { randomBytes } from 'crypto';

export const usersRouter = router({
  list: protectedProcedure.query(async () => {
    const rows = await db.query.users.findMany({
      columns: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: (u, { asc }) => [asc(u.name)],
    });
    return rows.map(({ id, ...rest }) => ({ ...rest, id: id.toString() }));
  }),

  invite: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().toLowerCase().trim(),
        role: z.enum(['admin', 'superadmin']),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existing) {
        throw new Error('A user with this email already exists');
      }

      const tempPassword = randomBytes(8).toString('hex');
      const hashedPassword = await argon2.hash(tempPassword);

      const [newUser] = await db
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          role: input.role,
          hashedPassword,
        })
        .returning({ id: users.id });

      await sendInviteEmail(input.email, input.name, tempPassword).catch(console.error);

      return { id: newUser.id.toString() };
    }),

  update: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().toLowerCase().trim().optional(),
        role: z.enum(['admin', 'superadmin']).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      await db
        .update(users)
        .set({ ...updates, updatedAt: sql`NOW()` })
        .where(eq(users.id, BigInt(id)));

      return { success: true };
    }),

  delete: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.userId === input.id) {
        throw new Error('You cannot delete your own account');
      }

      await db.delete(users).where(eq(users.id, BigInt(input.id)));
      return { success: true };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().toLowerCase().trim().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db
        .update(users)
        .set({ ...input, updatedAt: sql`NOW()` })
        .where(eq(users.id, BigInt(ctx.session.userId!)));

      if (input.email) ctx.session.userEmail = input.email;

      return { success: true };
    }),
});
