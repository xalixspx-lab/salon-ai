// يجهّز قاعدة PostgreSQL (Supabase أو غيرها) لعزل المستأجرين عبر Row-Level Security:
//  1) ينشئ دور تطبيق بلا BYPASSRLS. السياسات تقيّد الصفوف فقط عندما يُضبط app.tenant_id
//     (مسارات المالك عبر lib/prisma.ts)؛ بدونه تبقى المسارات العامة والأدمن كما هي.
//  2) يفعّل RLS على كل الجداول: جداول المستأجر تُقيَّد بـ tenant_id، وغيرها متاحة لدور
//     التطبيق فقط (مهم على Supabase: واجهة PostgREST العامة يجب ألا ترى شيئًا).
//  3) يسحب صلاحيات anon/authenticated إن وُجدا.
// آمن لإعادة التشغيل (idempotent). يقرأ الجداول من مخطط Prisma نفسه.
//
// ADMIN_URL=postgresql://postgres...  APP_PASSWORD=...  node scripts/rls-setup.mjs
import pkg from '@prisma/client';
const { PrismaClient, Prisma } = pkg;

const ADMIN_URL = process.env.ADMIN_URL;
const APP_ROLE = process.env.APP_ROLE || 'salon_app';
const APP_PASSWORD = process.env.APP_PASSWORD;
if (!ADMIN_URL || !APP_PASSWORD) {
  console.error('ADMIN_URL and APP_PASSWORD are required');
  process.exit(2);
}
if (!/^[a-z_][a-z0-9_]*$/.test(APP_ROLE)) throw new Error('bad role name');
if (/'/.test(APP_PASSWORD)) throw new Error('password must not contain a single quote');

const db = new PrismaClient({ datasources: { db: { url: ADMIN_URL } }, log: ['error'] });
const run = (sql) => db.$executeRawUnsafe(sql);

const models = Prisma.dmmf.datamodel.models.map((m) => ({
  table: m.dbName || m.name,
  tenantKey: m.dbName === 'tenants' ? 'id' : m.fields.some((f) => f.name === 'tenantId') ? 'tenant_id' : null,
}));

async function main() {
  await run(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
      CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}' NOBYPASSRLS;
    ELSE
      ALTER ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${APP_PASSWORD}' NOBYPASSRLS;
    END IF;
  END $$`);
  await run(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);
  await run(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`);
  await run(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`);
  await run(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE}`);

  // Supabase: منع واجهة REST العامة من رؤية أي جدول
  await run(`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
    END IF;
  END $$`);

  for (const { table, tenantKey } of models) {
    await run(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    await run(`DROP POLICY IF EXISTS tenant_isolation ON "${table}"`);
    await run(`DROP POLICY IF EXISTS app_full_access ON "${table}"`);
    if (tenantKey) {
      const cond = `NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR ${tenantKey} = NULLIF(current_setting('app.tenant_id', true), '')::uuid`;
      await run(`CREATE POLICY tenant_isolation ON "${table}" TO ${APP_ROLE} USING (${cond}) WITH CHECK (${cond})`);
    } else {
      await run(`CREATE POLICY app_full_access ON "${table}" TO ${APP_ROLE} USING (true) WITH CHECK (true)`);
    }
  }
  // جدول سجل الهجرات الخاص بـ Prisma ليس ضمن النماذج
  await run(`DO $$ BEGIN
    IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
      ALTER TABLE _prisma_migrations ENABLE ROW LEVEL SECURITY;
    END IF;
  END $$`);

  const tenantTables = models.filter((m) => m.tenantKey).length;
  console.log(`RLS ready: role ${APP_ROLE}; ${tenantTables} tenant-scoped tables, ${models.length - tenantTables} app-only tables`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error('rls-setup failed:', e.message);
  await db.$disconnect();
  process.exit(1);
});
