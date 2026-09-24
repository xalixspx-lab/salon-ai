import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { limitOrResponse } from '@/lib/rateLimit';
import { sniffImage } from '@/lib/imageSniff';
import { deleteFile, isStorageConfigured, uploadPublicFile } from '@/lib/storage';
import { withTenantScope } from '@/lib/tenantScope';

const MAX_BYTES = 2 * 1024 * 1024;

// رفع شعار الصالون (PNG/JPG/WebP حتى 2MB). المسار يبدأ دائمًا بـ tenantId من الجلسة.
async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  if (!isStorageConfigured()) {
    return NextResponse.json({ success: false, error: 'تخزين الصور غير مفعّل بعد على الخادم' }, { status: 503 });
  }

  const limited = await limitOrResponse(`logo:${session.tenantId}`, 20, 60 * 60 * 1000);
  if (limited) return limited;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'لم يتم إرسال ملف' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: 'حجم الصورة يجب ألا يتجاوز 2 ميغابايت' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) {
    return NextResponse.json({ success: false, error: 'الصيغة غير مدعومة (PNG أو JPG أو WebP)' }, { status: 415 });
  }

  const path = `${session.tenantId}/logo-${randomUUID()}.${kind.ext}`;
  try {
    const url = await uploadPublicFile(path, bytes, kind.mime);
    const old = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { logoPath: true } });
    await prisma.tenant.update({ where: { id: session.tenantId }, data: { logoUrl: url, logoPath: path } });
    if (old?.logoPath) await deleteFile(old.logoPath);
    return NextResponse.json({ success: true, data: { logoUrl: url } });
  } catch (error) {
    console.error('logo upload failed:', error);
    return NextResponse.json({ success: false, error: 'فشل رفع الصورة' }, { status: 502 });
  }
}

async function DELETEHandler() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { logoPath: true } });
  await prisma.tenant.update({ where: { id: session.tenantId }, data: { logoUrl: null, logoPath: null } });
  if (tenant?.logoPath) await deleteFile(tenant.logoPath);
  return NextResponse.json({ success: true });
}

export const POST = withTenantScope(POSTHandler);
export const DELETE = withTenantScope(DELETEHandler);
