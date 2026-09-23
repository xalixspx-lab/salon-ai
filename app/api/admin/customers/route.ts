import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { listParams } from '@/lib/adminList';
import { hashPassword } from '@/lib/password';
import { generateTempPassword } from '@/lib/tempPassword';
import { logAdminAction } from '@/lib/audit';
import { appOrigin, sendEmail, welcomeEmail } from '@/lib/email';
import { localeFromRequest } from '@/lib/verification';

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { q, page, take, skip } = listParams(request);
  const where = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] }
    : {};

  const [rows, total] = await Promise.all([
    prisma.customerAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerifiedAt: true,
        suspendedAt: true,
        createdAt: true,
        _count: { select: { customers: true, reviews: true } },
      },
    }),
    prisma.customerAccount.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: rows, total, page, pageSize: take });
}

// إنشاء حساب عميل مباشرة من الأدمن — بكلمة مرور مؤقتة تُعرض مرة واحدة
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'الاسم والبريد الإلكتروني الصحيح مطلوبان' }, { status: 400 });
  }
  if (await prisma.customerAccount.findUnique({ where: { email } })) {
    return NextResponse.json({ success: false, error: 'يوجد عميل بهذا البريد بالفعل' }, { status: 409 });
  }

  const tempPassword = generateTempPassword();
  const account = await prisma.customerAccount.create({
    data: { name, email, passwordHash: await hashPassword(tempPassword), emailVerifiedAt: new Date() },
    select: { id: true, name: true, email: true },
  });

  await logAdminAction(guard.session, { action: 'CUSTOMER_CREATE', targetType: 'CUSTOMER', targetId: account.id, targetLabel: account.email });

  const locale = localeFromRequest(request);
  const loginLink = `${appOrigin(request)}/${locale}/account/login`;
  await sendEmail({ to: account.email, ...welcomeEmail('customer', tempPassword, loginLink, locale) }).catch((e) => console.error('welcome email failed', e));

  return NextResponse.json({ success: true, data: account, tempPassword }, { status: 201 });
}
