import { NextResponse } from 'next/server';
import { getRatings } from '@/lib/ratings';
import { getPlatformSettings } from '@/lib/platformSettings';
import { clientIp, limitOrResponse } from '@/lib/rateLimit';
import { sendVerificationEmail } from '@/lib/verification';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { createSession } from '@/lib/session';
import { isHoneypotFilled } from '@/lib/honeypot';
import { verifyTurnstileToken } from '@/lib/turnstile';

// جلب الصالونات (المستأجرين)، مع دعم اختياري للبحث الجغرافي عبر PostGIS
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radiusKm = searchParams.get('radius') || '20';
    const city = searchParams.get('city');

    let salons;

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusMeters = parseFloat(radiusKm) * 1000;

      // استعلام SQL خام لحساب المسافة بدقة عبر صيغة Haversine
      salons = await prisma.$queryRaw`
        SELECT
          id,
          name,
          city,
          subdomain,
          custom_domain AS "customDomain",
          logo_url AS "logoUrl",
          latitude,
          longitude,
          address_text AS "addressText",
          timezone,
          currency,
          (
            6371000 * acos(
              cos(radians(${userLat})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(${userLng})) +
              sin(radians(${userLat})) * sin(radians(latitude))
            )
          ) / 1000 AS "distanceKm",
          EXISTS(
            SELECT 1 FROM offers
            WHERE offers.tenant_id = tenants.id AND offers.is_active = true
            AND (offers.ends_at IS NULL OR offers.ends_at >= now())
          ) AS "hasActiveOffer"
        FROM tenants
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND is_published = true
        AND (
          6371000 * acos(
            cos(radians(${userLat})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${userLng})) +
            sin(radians(${userLat})) * sin(radians(latitude))
          )
        ) <= ${radiusMeters}
        ORDER BY "distanceKm" ASC
        LIMIT 20;
      `;
    } else {
      const tenants = await prisma.tenant.findMany({
        where: { isPublished: true, ...(city ? { city } : {}) },
        take: 20,
        orderBy: { createdAt: 'desc' },
        // حقول عامة فقط: لا نكشف الباقة ولا تواريخ التجربة ولا إعدادات داخلية
        select: {
          id: true,
          name: true,
          city: true,
          subdomain: true,
          customDomain: true,
          logoUrl: true,
          latitude: true,
          longitude: true,
          addressText: true,
          timezone: true,
          currency: true,
        },
      });

      const activeOfferTenantIds = new Set(
        (
          await prisma.offer.findMany({
            where: {
              tenantId: { in: tenants.map((t) => t.id) },
              isActive: true,
              OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
            },
            select: { tenantId: true },
            distinct: ['tenantId'],
          })
        ).map((o) => o.tenantId)
      );

      salons = tenants.map((t) => ({ ...t, hasActiveOffer: activeOfferTenantIds.has(t.id) }));
    }

    const list = Array.isArray(salons) ? (salons as Array<{ id: string }>) : [];
    const ratings = await getRatings(list.map((s) => s.id));
    const withRatings = list.map((s) => ({
      ...s,
      rating: ratings.get(s.id)?.avg ?? null,
      reviewCount: ratings.get(s.id)?.count ?? 0,
    }));

    return NextResponse.json({ success: true, count: withRatings.length, data: withRatings }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching salons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch salons', details: error.message },
      { status: 500 }
    );
  }
}

// تسجيل صالون جديد + إنشاء حساب مالكه، عبر نموذج /[locale]/salons/new.
// يُرسل رابط تأكيد البريد بعد التسجيل، والتأكيد غير مفروض للدخول (تنبيه فقط).
export async function POST(request: Request) {
  try {
    const limited = await limitOrResponse(`register-salon:${clientIp(request)}`, 10, 60 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    if (isHoneypotFilled(body)) {
      return NextResponse.json({ success: false, error: 'Failed to create salon' }, { status: 400 });
    }
    if (!(await verifyTurnstileToken(body.turnstileToken, clientIp(request)))) {
      return NextResponse.json({ success: false, error: 'فشل التحقق من أنك لست روبوت' }, { status: 400 });
    }
    const { name, city, addressText, lat, lng, ownerName, email, password } = body;

    if (!name || !city) {
      return NextResponse.json(
        { success: false, error: 'Name and city are required' },
        { status: 400 }
      );
    }

    if (!ownerName || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'اسم المالك والبريد الإلكتروني وكلمة المرور مطلوبة' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingOwner = await prisma.owner.findUnique({ where: { email: normalizedEmail } });
    if (existingOwner) {
      return NextResponse.json(
        { success: false, error: 'يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const { trialDays } = await getPlatformSettings();

    const { tenant, owner } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name,
          city,
          addressText: addressText || null,
          latitude: lat ? parseFloat(lat) : null,
          longitude: lng ? parseFloat(lng) : null,
          trialEndsAt: new Date(Date.now() + trialDays * 86400000),
        },
      });

      const owner = await tx.owner.create({
        data: {
          tenantId: tenant.id,
          name: ownerName,
          email: normalizedEmail,
          passwordHash,
        },
      });

      return { tenant, owner };
    });

    await sendVerificationEmail(request, 'owner', owner.id, owner.email).catch((e) => console.error('verification email failed', e));
    await createSession({ ownerId: owner.id, tenantId: tenant.id, email: owner.email });

    return NextResponse.json({ success: true, data: tenant }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating salon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create salon', details: error.message },
      { status: 500 }
    );
  }
}
