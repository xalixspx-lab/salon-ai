import { prisma } from '@/lib/prisma';
import { getPlatformSettings } from '@/lib/platformSettings';

// المهام اليومية التلقائية التي يتحكم بها الأدمن. كلها تعمل عبر واتساب الصالون.
export const AUTOMATION_KEYS = ['reports', 'reminders', 'winBack'] as const;
export type AutomationKey = (typeof AUTOMATION_KEYS)[number];
// ما يمكن إيقافه لصالون بعينه
export const TENANT_AUTOMATION_KEYS = ['reports', 'reminders', 'winBack'] as const;
export type TenantAutomationKey = (typeof TENANT_AUTOMATION_KEYS)[number];

export const isTenantAutomationKey = (v: unknown): v is TenantAutomationKey => typeof v === 'string' && (TENANT_AUTOMATION_KEYS as readonly string[]).includes(v);

export async function automationEnabled(key: AutomationKey): Promise<boolean> {
  return (await getPlatformSettings()).automations[key];
}

// هل المهمة مسموحة لهذا الصالون؟ (مفتاح المنصة + استثناء الصالون)
export async function tenantAutomationEnabled(tenant: { automationOff: string[] }, key: TenantAutomationKey): Promise<boolean> {
  return !tenant.automationOff.includes(key) && (await automationEnabled(key));
}

// هل الجدولة البريدية للتقارير مسموحة لهذا الصالون؟ (المنصة + استثناء الصالون)
export async function ownerReportsEnabled(tenantId: string): Promise<boolean> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { automationOff: true } });
  return !!t && (await tenantAutomationEnabled(t, 'reports'));
}
