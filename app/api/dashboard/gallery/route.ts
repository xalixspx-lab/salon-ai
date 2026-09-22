import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { limitOrResponse } from '@/lib/rateLimit';
import { sniffImage } from '@/lib/imageSniff';
import { isStorageConfigured, uploadPublicFile } from '@/lib/storage';

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PHOTOS = 12;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const photos = await prisma.salonPhoto.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json({ success: true, data: photos });
}

// رفع صورة لمعرض الصالون (حتى 12 صورة، PNG/JPG/WebP حتى 4MB)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  if (!isStorageConfigured()) {
    return NextResponse.json({ success: false, error: 'تخزين الصور غير مفعّل بعد على الخادم' }, { status: 503 });
  }

  const limited = await limitOrResponse(`gallery:${session.tenantId}`, 30, 60 * 60 * 1000);
  if (limited) return limited;

  const count = await prisma.salonPhoto.count({ where: { tenantId: session.tenantId } });
  if (count >= MAX_PHOTOS) {
    return NextResponse.json({ success: false, error: `الحد الأقصى ${MAX_PHOTOS} صورة في المعرض` }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'لم يتم إرسال ملف' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: 'حجم الصورة يجب ألا يتجاوز 4 ميغابايت' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) {
    return NextResponse.json({ success: false, error: 'الصيغة غير مدعومة (PNG أو JPG أو WebP)' }, { status: 415 });
  }

  const path = `${session.tenantId}/gallery-${randomUUID()}.${kind.ext}`;
  try {
    const url = await uploadPublicFile(path, bytes, kind.mime);
    const maxOrder = await prisma.salonPhoto.aggregate({ where: { tenantId: session.tenantId }, _max: { sortOrder: true } });
    const photo = await prisma.salonPhoto.create({
      data: {
        tenantId: session.tenantId,
        url,
        storagePath: path,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json({ success: true, data: photo }, { status: 201 });
  } catch (error) {
    console.error('gallery upload failed:', error);
    return NextResponse.json({ success: false, error: 'فشل رفع الصورة' }, { status: 502 });
  }
}
