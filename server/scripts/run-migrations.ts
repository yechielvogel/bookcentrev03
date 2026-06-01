import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '../db/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Running migrations...');
await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });
console.log('Migrations complete.');
process.exit(0);
