import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const BASELINE_MIGRATION = '20260929000000_init';
const prisma = new PrismaClient();

async function main() {
  const [schemaState] = await prisma.$queryRaw`
    SELECT
      to_regclass('public."Note"') IS NOT NULL AND
      to_regclass('public."Chat"') IS NOT NULL AS "hasApplicationTables",
      to_regclass('public."_prisma_migrations"') IS NOT NULL AS "hasMigrationTable"
  `;

  if (!schemaState.hasApplicationTables) {
    console.log('No existing application schema to baseline.');
    return;
  }

  if (schemaState.hasMigrationTable) {
    const [existing] = await prisma.$queryRaw`
      SELECT migration_name
      FROM public."_prisma_migrations"
      WHERE migration_name = ${BASELINE_MIGRATION} AND finished_at IS NOT NULL
      LIMIT 1
    `;
    if (existing) {
      console.log('Initial Prisma migration is already recorded.');
      return;
    }
  }

  console.log('Recording the existing application schema as the initial Prisma migration.');
  const prismaCli = path.resolve('node_modules/prisma/build/index.js');
  const result = spawnSync(process.execPath, ['--no-warnings', prismaCli, 'migrate', 'resolve', '--applied', BASELINE_MIGRATION], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma baseline command failed with status ${result.status}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
