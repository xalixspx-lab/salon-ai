import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { sniffImage } from '@/lib/imageSniff';
import { deleteFile, isStorageConfigured, uploadPublicFile } from '@/lib/storage';
import { logAdminAction } from '@/lib/audit';

const MAX_BYTES = 2 * 1024 * 1024;

// رفع شعار صالون من الأدمن مباشرة (نفس قيود /api/dashboard/logo، بلا جلسة مالك)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { name: true, logoPath: true } });
  if (!tenant) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!isStorageConfigured()) {
    return NextResponse.json({ success: false, error: 'تخزين الصور غير مفعّل بعد على الخادم' }, { status: 503 });
  }

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

  const path = `${id}/logo-${randomUUID()}.${kind.ext}`;
  try {
    const url = await uploadPublicFile(path, bytes, kind.mime);
    await prisma.tenant.update({ where: { id }, data: { logoUrl: url, logoPath: path } });
    if (tenant.logoPath) await deleteFile(tenant.logoPath);
    await logAdminAction(guard.session, { action: 'SALON_LOGO_UPDATE', targetType: 'SALON', targetId: id, targetLabel: tenant.name });
    return NextResponse.json({ success: true, data: { logoUrl: url } });
  } catch (error) {
    console.error('admin logo upload failed:', error);
    return NextResponse.json({ success: false, error: 'فشل رفع الصورة' }, { status: 502 });
  }
}
