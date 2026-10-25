import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

async function main() {
  const rawDbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!rawDbUrl) {
    console.log('No DATABASE_URL or DIRECT_URL set; skipping migrations.');
    return;
  }

  // Neon connection pooler workaround:
  // PgBouncer in transaction pooling mode (-pooler) does not support session-level advisory locks.
  // Direct connection without '-pooler.' provides standard native PostgreSQL session locks.
  let directDbUrl = rawDbUrl;
  if (directDbUrl.includes('-pooler.')) {
    directDbUrl = directDbUrl.replace('-pooler.', '.');
  }
  // Strip pgbouncer query parameter if present for the direct connection
  directDbUrl = directDbUrl
    .replace(/[?&]pgbouncer=true/g, '')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  // 1. Check if all migrations on disk are already applied in _prisma_migrations
  const migrationsDir = path.resolve('prisma/migrations');
  const localMigrations = fs.existsSync(migrationsDir)
    ? fs
        .readdirSync(migrationsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(migrationsDir, d.name, 'migration.sql')))
        .map((d) => d.name)
    : [];

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: directDbUrl,
      },
    },
  });

  let needMigrate = true;
  try {
    const [migrationTableCheck] = await prisma.$queryRaw`
      SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL AS "exists"
    `;

    if (migrationTableCheck?.exists) {
      const appliedRows = await prisma.$queryRaw`
        SELECT migration_name FROM public."_prisma_migrations" WHERE finished_at IS NOT NULL
      `;
      const appliedSet = new Set(appliedRows.map((r) => r.migration_name));
      const pending = localMigrations.filter((m) => !appliedSet.has(m));

      if (pending.length === 0) {
        console.log(`All ${localMigrations.length} migrations are already applied. Database schema is current.`);
        needMigrate = false;
      } else {
        console.log(`Found ${pending.length} pending migration(s):`, pending.join(', '));
      }
    }
  } catch (checkErr) {
    console.warn('Could not query _prisma_migrations directly; will proceed to standard migrate deploy:', checkErr?.message || checkErr);
  } finally {
    await prisma.$disconnect();
  }

  if (!needMigrate) {
    return;
  }

  // 2. Execute `prisma migrate deploy` with the direct database URL and retry logic
  const prismaCli = path.resolve('node_modules/prisma/build/index.js');
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Running prisma migrate deploy (attempt ${attempt}/${maxAttempts})...`);

    const env = {
      ...process.env,
      DATABASE_URL: directDbUrl,
    };

    const result = spawnSync(process.execPath, ['--no-warnings', prismaCli, 'migrate', 'deploy'], {
      stdio: 'inherit',
      env,
    });

    if (result.status === 0) {
      console.log('Database migrations deployed successfully.');
      return;
    }

    if (attempt < maxAttempts) {
      console.warn(`Migration attempt ${attempt} failed with exit code ${result.status}. Waiting 3s before retry...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      throw new Error(`Prisma migrate deploy failed after ${maxAttempts} attempts with status ${result.status}`);
    }
  }
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
