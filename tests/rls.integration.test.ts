// اختبار تكامل لعزل RLS الحقيقي: يعمل فقط عند توفير قاعدة مُجهَّزة بـ scripts/rls-setup.mjs
// ودور تطبيق غير superuser:  RLS_TEST_URL=postgresql://salon_app_l:...  npx vitest run tests/rls.integration
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const URL = process.env.RLS_TEST_URL;
const d = URL ? describe : describe.skip;

d('database-level tenant isolation (RLS)', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let tenantStore: typeof import('@/lib/prisma').tenantStore;
  let a = '';
  let b = '';

  beforeAll(async () => {
    process.env.DATABASE_URL = URL!;
    process.env.TENANT_RLS = 'on';
    const mod = await import('@/lib/prisma');
    prisma = mod.prisma;
    tenantStore = mod.tenantStore;
    // خارج أي نطاق لا يُضبط app.tenant_id فالسياسات لا تقيّد الصفوف (مسارات المنصة)
    a = (await prisma.tenant.create({ data: { name: 'RLS_T_A' } })).id;
    b = (await prisma.tenant.create({ data: { name: 'RLS_T_B' } })).id;
    await prisma.staff.create({ data: { tenantId: a, name: 'rls_staff_a' } });
    await prisma.staff.create({ data: { tenantId: b, name: 'rls_staff_b' } });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.tenant.deleteMany({ where: { id: { in: [a, b] } } });
  });

  it('platform paths (no tenant scope) still see everything', async () => {
    const rows = await prisma.staff.findMany({ where: { name: { startsWith: 'rls_staff_' } } });
    expect(rows.map((r) => r.name).sort()).toEqual(['rls_staff_a', 'rls_staff_b']);
  });

  it('scoped reads return only the tenant\'s rows even without a where clause', async () => {
    await tenantStore.run({ tenantId: a }, async () => {
      const rows = await prisma.staff.findMany();
      expect(rows.every((r) => r.tenantId === a)).toBe(true);
      expect(rows.map((r) => r.name)).toContain('rls_staff_a');
      expect(rows.map((r) => r.name)).not.toContain('rls_staff_b');
      const tenants = await prisma.tenant.findMany({ where: { name: { startsWith: 'RLS_T_' } } });
      expect(tenants.map((t) => t.id)).toEqual([a]);
    });
  });

  it('scoped writes cannot touch another tenant', async () => {
    await tenantStore.run({ tenantId: a }, async () => {
      const upd = await prisma.staff.updateMany({ where: { tenantId: b }, data: { name: 'hacked' } });
      expect(upd.count).toBe(0);
      const del = await prisma.staff.deleteMany({ where: { tenantId: b } });
      expect(del.count).toBe(0);
      await expect(prisma.staff.create({ data: { tenantId: b, name: 'planted' } })).rejects.toThrow();
    });
    const still = await prisma.staff.findMany({ where: { tenantId: b } });
    expect(still.map((r) => r.name)).toEqual(['rls_staff_b']);
  });

  it('scope ends with the callback', async () => {
    await tenantStore.run({ tenantId: a }, async () => {
      await prisma.staff.findMany();
    });
    const rows = await prisma.staff.findMany({ where: { name: { startsWith: 'rls_staff_' } } });
    expect(rows).toHaveLength(2);
  });
});
