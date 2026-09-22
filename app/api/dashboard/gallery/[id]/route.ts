import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { deleteFile } from '@/lib/storage';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const photo = await prisma.salonPhoto.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!photo) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  await prisma.salonPhoto.delete({ where: { id } });
  await deleteFile(photo.storagePath);
  return NextResponse.json({ success: true });
}
