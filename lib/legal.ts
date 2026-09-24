import { prisma } from '@/lib/prisma';

// رقم نسخة الوثائق القانونية. أي تعديل جوهري على النصوص يستلزم رفع هذا الرقم،
// فيُطلب من كل صالون وعميل الموافقة من جديد عند دخوله التالي.
export const LEGAL_VERSION = '2026-09-24';

export const CONSENT_TYPES = {
  DATA_PROCESSING: 'DATA_PROCESSING',
  MARKETING: 'MARKETING',
  WHATSAPP_COMMS: 'WHATSAPP_COMMS',
} as const;
export type ConsentType = (typeof CONSENT_TYPES)[keyof typeof CONSENT_TYPES];

export async function hasAcceptedTenantAgreement(tenantId: string): Promise<boolean> {
  const row = await prisma.tenantAgreement.findFirst({
    where: { tenantId, agreementVersion: LEGAL_VERSION },
    select: { id: true },
  });
  return Boolean(row);
}

export async function recordTenantAgreement(input: {
  tenantId: string;
  ownerId: string;
  ip?: string | null;
}) {
  await prisma.tenantAgreement.create({
    data: {
      tenantId: input.tenantId,
      acceptedByUserId: input.ownerId,
      agreementVersion: LEGAL_VERSION,
      ipAddress: input.ip?.slice(0, 50) || null,
    },
  });
}

export async function recordConsent(input: {
  accountId: string;
  type: ConsentType;
  granted: boolean;
  ip?: string | null;
}) {
  await prisma.consentLog.create({
    data: {
      accountId: input.accountId,
      consentType: input.type,
      granted: input.granted,
      version: LEGAL_VERSION,
      ipAddress: input.ip?.slice(0, 50) || null,
    },
  });
}

// الحالة الفعلية لنوع موافقة = آخر سطر مسجّل له
export async function currentConsent(accountId: string, type: ConsentType) {
  return prisma.consentLog.findFirst({
    where: { accountId, consentType: type },
    orderBy: { recordedAt: 'desc' },
    select: { granted: true, version: true },
  });
}

// موافقة معالجة البيانات سارية = آخر سطر granted ولنفس نسخة الوثائق الحالية
export async function hasCurrentDataConsent(accountId: string): Promise<boolean> {
  const c = await currentConsent(accountId, CONSENT_TYPES.DATA_PROCESSING);
  return Boolean(c?.granted && c.version === LEGAL_VERSION);
}
