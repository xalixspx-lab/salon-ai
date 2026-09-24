import { getSession } from '@/lib/session';
import { tenantStore } from '@/lib/prisma';

// يغلّف معالج مسار مالك: إن وُجدت جلسة صالحة يُنفَّذ المعالج داخل نطاق مستأجرها
// (انظر lib/prisma.ts). بدون جلسة يُترك المعالج ليردّ 401 بنفسه كما كان.
export function withTenantScope<A extends unknown[]>(
  handler: (request: Request, ...rest: A) => Promise<Response> | Response
) {
  return async (request: Request, ...rest: A): Promise<Response> => {
    const session = await getSession();
    if (!session) return handler(request, ...rest);
    return tenantStore.run({ tenantId: session.tenantId }, () => Promise.resolve(handler(request, ...rest)));
  };
}
