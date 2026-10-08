import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PLANS, TRIAL_DAYS, type PaidPlanKey } from '@/lib/plans';

export interface PlatformSettings {
  trialDays: number;
  prices: Record<PaidPlanKey, number>;
  announcement: { textAr: string; textEn: string; active: boolean };
  // تفعيل/إيقاف المهام اليومية التلقائية على مستوى المنصة (الافتراضي: تعمل)
  automations: { reports: boolean; reminders: boolean; reviews: boolean; winBack: boolean };
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  trialDays: TRIAL_DAYS,
  prices: { BASIC: PLANS.BASIC.priceBhdMonthly, PROFESSIONAL: PLANS.PROFESSIONAL.priceBhdMonthly, ENTERPRISE: PLANS.ENTERPRISE.priceBhdMonthly },
  announcement: { textAr: '', textEn: '', active: false },
  automations: { reports: true, reminders: true, reviews: true, winBack: true },
};

const KEY = 'general';

const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

// دمج آمن: أي قيمة تالفة أو ناقصة تعود للافتراضي
export function normalizeSettings(raw: unknown): PlatformSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const p = (r.prices && typeof r.prices === 'object' ? r.prices : {}) as Record<string, unknown>;
  const a = (r.announcement && typeof r.announcement === 'object' ? r.announcement : {}) as Record<string, unknown>;
  const au = (r.automations && typeof r.automations === 'object' ? r.automations : {}) as Record<string, unknown>;
  const on = (v: unknown) => v !== false; // أي قيمة غير false تبقى مفعّلة (توافق مع إعدادات قديمة بلا هذا الحقل)
  return {
    trialDays: Math.round(num(r.trialDays, 0, 365, DEFAULT_SETTINGS.trialDays)),
    prices: {
      BASIC: num(p.BASIC, 0, 100000, DEFAULT_SETTINGS.prices.BASIC),
      PROFESSIONAL: num(p.PROFESSIONAL, 0, 100000, DEFAULT_SETTINGS.prices.PROFESSIONAL),
      ENTERPRISE: num(p.ENTERPRISE, 0, 100000, DEFAULT_SETTINGS.prices.ENTERPRISE),
    },
    announcement: {
      textAr: typeof a.textAr === 'string' ? a.textAr.slice(0, 500) : '',
      textEn: typeof a.textEn === 'string' ? a.textEn.slice(0, 500) : '',
      active: a.active === true,
    },
    automations: { reports: on(au.reports), reminders: on(au.reminders), reviews: on(au.reviews), winBack: on(au.winBack) },
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const row = await prisma.platformSetting.findUnique({ where: { key: KEY } });
  return normalizeSettings(row?.value);
}

export async function savePlatformSettings(input: unknown): Promise<PlatformSettings> {
  const value = normalizeSettings(input);
  const json = value as unknown as Prisma.InputJsonValue;
  await prisma.platformSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: json }, update: { value: json } });
  return value;
}
