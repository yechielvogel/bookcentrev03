import 'dotenv/config';
import readline from 'readline';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: This script cannot run in production.');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((resolve) => rl.question(q, resolve));

console.log('\n--- Book Centre Super Admin Setup ---\n');

const name = (await ask('Full name: ')).trim();
const email = (await ask('Email: ')).trim().toLowerCase();
const password = await ask('Password (min 8 chars): ');

if (!name || !email || password.length < 8) {
  console.error('Invalid input. Name and email are required, password must be 8+ chars.');
  rl.close();
  process.exit(1);
}

rl.close();

const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

if (existing) {
  // Update existing user to superadmin
  await db
    .update(users)
    .set({ role: 'superadmin', name, hashedPassword: await argon2.hash(password) })
    .where(eq(users.email, email));
  console.log(`\nUpdated existing user "${email}" to superadmin.`);
} else {
  const hashedPassword = await argon2.hash(password);
  await db.insert(users).values({ email, name, role: 'superadmin', hashedPassword });
  console.log(`\nSuperadmin "${email}" created successfully.`);
}

console.log('You can now log in at http://localhost:5173/login\n');
process.exit(0);
