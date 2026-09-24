import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
};

const base =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    // استعلامات SQL لا تُسجَّل إلا عند الطلب صراحةً (PRISMA_LOG_QUERIES=1) حتى لا تتسرب
    // تفاصيل المخطط ولا يتضخم سجل الإنتاج
    log: process.env.PRISMA_LOG_QUERIES === '1' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaBase = base;

// ---------------------------------------------------------------------------
// عزل المستأجرين داخل قاعدة البيانات (Row-Level Security) — الطبقة الثانية.
//
// عند تفعيل TENANT_RLS=on وربط التطبيق بدور قاعدة بيانات لا يتجاوز RLS، تُنفَّذ كل عمليات
// النماذج داخل withTenantScope() في معاملة تضبط app.tenant_id وتوقف app.bypass، فترى
// سياسات القاعدة صفوف هذا المستأجر فقط حتى لو نسي كود المسار شرط tenantId.
// خارج هذا النطاق (السوق العام، الأدمن، مهام الخلفية) يبقى الدور الافتراضي app.bypass='on'
// كما هو مضبوط على الدور نفسه، فلا يتغير سلوكها. راجع docs/security/RLS_CUTOVER.md.
// ---------------------------------------------------------------------------
const RLS_ON = process.env.TENANT_RLS === 'on';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const tenantStore = new AsyncLocalStorage<{ tenantId: string }>();

const scopedClients = new Map<string, PrismaClient>();

function scopedFor(tenantId: string): PrismaClient {
  if (!UUID.test(tenantId)) throw new Error('invalid tenant id for scoped client');
  let c = scopedClients.get(tenantId);
  if (!c) {
    c = base.$extends({
      name: 'tenantScope',
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await base.$transaction([
              base.$executeRaw`SELECT set_config('app.bypass', 'off', true), set_config('app.tenant_id', ${tenantId}, true)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    }) as unknown as PrismaClient;
    if (scopedClients.size > 500) scopedClients.clear();
    scopedClients.set(tenantId, c);
  }
  return c;
}

// كل الاستيرادات الحالية (import { prisma }) تبقى كما هي: داخل نطاق مستأجر تُوجَّه عمليات
// النماذج للعميل المقيَّد، وما عداها ($transaction، الاستعلامات الخام…) للعميل الأساسي.
export const prisma = new Proxy(base, {
  get(target, prop) {
    if (RLS_ON && typeof prop === 'string' && !prop.startsWith('$') && !prop.startsWith('_')) {
      const ctx = tenantStore.getStore();
      if (ctx) return (scopedFor(ctx.tenantId) as unknown as Record<string, unknown>)[prop];
    }
    const value = Reflect.get(target, prop, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

export { base as basePrisma };
