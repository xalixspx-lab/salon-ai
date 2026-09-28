import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// صورة معاينة عند مشاركة رابط الصالون (واتساب/انستغرام/فيسبوك): الصورة
// الحقيقية إن وُجدت (شعار أو أول صورة من المعرض)، وإلا بطاقة مصمَّمة بهوية
// الموقع. لا نرسم اسم الصالون كنص داخل الصورة عمدًا: مُحرّك الرسم (Satori)
// يفشل بالخط الافتراضي مع الحروف العربية ("substFormat: 3 is not yet
// supported") فيسقط الطلب كاملًا — والاسم موجود أصلًا في og:title بجانبها.
export default async function OpengraphImage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { logoUrl: true } });
  const firstPhoto = await prisma.salonPhoto.findFirst({ where: { tenantId: id }, orderBy: { sortOrder: 'asc' }, select: { url: true } });
  const image = tenant?.logoUrl || firstPhoto?.url || null;

  if (image) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" width={1200} height={630} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c3aed, #c026d3 55%, #f43f5e)',
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 800, color: 'white' }}>Salon AI</div>
      </div>
    ),
    { ...size }
  );
}
