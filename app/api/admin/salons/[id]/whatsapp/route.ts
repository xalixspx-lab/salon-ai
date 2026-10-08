import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { logAdminAction } from '@/lib/audit';
import { isUuid, readJsonObject } from '@/lib/chat';
import { encryptToken } from '@/lib/whatsappCore';

// ربط/فك رقم واتساب لصالون من لوحة الإدارة (المرحلة الحالية). لاحقًا يحل محله ربط
// المالك الذاتي عبر Embedded Signup. الرمز لا يُرجَع أبدًا في أي استجابة.
async function load(id: string) {
  return prisma.whatsappAccount.findUnique({
    where: { tenantId: id },
    select: { phoneNumberId: true, wabaId: true, displayPhone: true, status: true, accessTokenEnc: true, createdAt: true },
  });
}

const present = (a: Awaited<ReturnType<typeof load>>) =>
  a ? { phoneNumberId: a.phoneNumberId, wabaId: a.wabaId, displayPhone: a.displayPhone, status: a.status, hasToken: Boolean(a.accessTokenEnc) } : null;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: present(await load(id)) });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!tenant) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const body = await readJsonObject(request);
  const phoneNumberId = typeof body.phoneNumberId === 'string' ? body.phoneNumberId.trim() : '';
  const wabaId = typeof body.wabaId === 'string' && body.wabaId.trim() ? body.wabaId.trim() : null;
  const displayPhone = typeof body.displayPhone === 'string' && body.displayPhone.trim() ? body.displayPhone.trim().slice(0, 32) : null;
  const token = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  const status = body.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';

  if (!/^\d{5,40}$/.test(phoneNumberId)) {
    return NextResponse.json({ success: false, error: 'معرّف رقم واتساب (Phone number ID) غير صالح' }, { status: 400 });
  }
  if (wabaId && !/^\d{5,40}$/.test(wabaId)) {
    return NextResponse.json({ success: false, error: 'معرّف الحساب (WABA ID) غير صالح' }, { status: 400 });
  }

  let accessTokenEnc: string | undefined;
  if (token) {
    try {
      accessTokenEnc = encryptToken(token);
    } catch {
      return NextResponse.json({ success: false, error: 'مفتاح تشفير الرموز غير مضبوط في الخادم' }, { status: 400 });
    }
  }

  // رقم واتساب واحد لا يخدم صالونين
  const taken = await prisma.whatsappAccount.findUnique({ where: { phoneNumberId }, select: { tenantId: true } });
  if (taken && taken.tenantId !== id) {
    return NextResponse.json({ success: false, error: 'هذا الرقم مربوط بصالون آخر' }, { status: 409 });
  }

  await prisma.whatsappAccount.upsert({
    where: { tenantId: id },
    create: { tenantId: id, phoneNumberId, wabaId, displayPhone, status, ...(accessTokenEnc ? { accessTokenEnc } : {}) },
    update: { phoneNumberId, wabaId, displayPhone, status, ...(accessTokenEnc ? { accessTokenEnc } : {}) },
  });
  await logAdminAction(guard.session, {
    action: 'WHATSAPP_LINK',
    targetType: 'SALON',
    targetId: id,
    targetLabel: tenant.name,
    details: { phoneNumberId, displayPhone, status, tokenUpdated: Boolean(accessTokenEnc) },
  });
  return NextResponse.json({ success: true, data: present(await load(id)) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { name: true } });
  await prisma.whatsappAccount.deleteMany({ where: { tenantId: id } });
  await logAdminAction(guard.session, { action: 'WHATSAPP_UNLINK', targetType: 'SALON', targetId: id, targetLabel: tenant?.name });
  return NextResponse.json({ success: true });
}
