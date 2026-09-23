import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AdminSessionPayload } from '@/lib/adminSession';

// يسجل إجراءً حساسًا للأدمن. فشل التسجيل لا يجب أن يُسقط الإجراء نفسه.
export async function logAdminAction(
  admin: AdminSessionPayload,
  entry: {
    action: string;
    targetType: 'SALON' | 'OWNER' | 'ADMIN' | 'CUSTOMER' | 'REVIEW' | 'BOOKING' | 'SETTINGS' | 'SERVICE' | 'STAFF' | 'OFFER' | 'PHOTO' | 'PACKAGE';
    targetId?: string;
    targetLabel?: string;
    details?: Record<string, unknown>;
  }
) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.adminId,
        adminEmail: admin.email,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        targetLabel: entry.targetLabel,
        details: (entry.details ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error('audit log failed:', error);
  }
}
