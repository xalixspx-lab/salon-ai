// نسخ بيانات الصالونات من قاعدة إلى أخرى (مثلًا من جهازك إلى Supabase) بعد تطبيق الهجرات على الهدف.
//
// الاستخدام (PowerShell):
//   $env:SOURCE_URL="postgresql://...المحلية..."; $env:TARGET_URL="postgresql://...Supabase..."; node scripts/copy-data.js
//
// - لا يحذف شيئًا من المصدر ولا من الهدف، ويتجاهل السجلات الموجودة مسبقًا (آمن للإعادة).
// - لا ينسخ حسابات الأدمن ولا رموز الاستعادة ولا سجل التدقيق (أنشئ الأدمن من جديد على الإنتاج).
// - المفاتيح تُقرأ من متغيرات البيئة فقط ولا تُطبع.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- سكربت CommonJS مستقل عن حزمة التطبيق
const { PrismaClient } = require('@prisma/client');

const source = process.env.SOURCE_URL;
const target = process.env.TARGET_URL;
if (!source || !target) {
  console.error('SOURCE_URL and TARGET_URL are required');
  process.exit(1);
}
if (source === target) {
  console.error('SOURCE_URL and TARGET_URL must differ');
  process.exit(1);
}

const src = new PrismaClient({ datasourceUrl: source });
const dst = new PrismaClient({ datasourceUrl: target });

// بترتيب يحترم المفاتيح الأجنبية
const MODELS = [
  'tenant',
  'owner',
  'staff',
  'customerAccount',
  'customer',
  'service',
  'serviceOption',
  'servicePricingRule',
  'offer',
  'appointment',
  'customerPackage',
  'review',
  'favorite',
  'platformSetting',
];

(async () => {
  for (const m of MODELS) {
    const rows = await src[m].findMany();
    let copied = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const res = await dst[m].createMany({ data: rows.slice(i, i + 500), skipDuplicates: true });
      copied += res.count;
    }
    console.log(`${m.padEnd(20)} source=${String(rows.length).padStart(4)}  inserted=${String(copied).padStart(4)}`);
  }
  console.log('done');
})()
  .catch((e) => {
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await src.$disconnect();
    await dst.$disconnect();
  });
