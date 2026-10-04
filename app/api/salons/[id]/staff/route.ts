import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// قائمة عامة (بدون حماية) بموظفي صالون منشور على رأس العمل — تُستخدم بنموذج
// حجز العميل ليختار موظفًا معينًا (اختياري). الصالون غير المنشور لا يكشف موظفيه.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ success: true, data: [] }, { status: 200 });

  const staff = await prisma.staff.findMany({
    where: { tenantId: id, status: 'ACTIVE', tenant: { isPublished: true } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ success: true, data: staff }, { status: 200 });
}
