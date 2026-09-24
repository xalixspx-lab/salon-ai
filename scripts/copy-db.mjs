// ينسخ كل بيانات قاعدة إلى قاعدة أخرى لها نفس مخطط Prisma (مثلًا Prisma Postgres → Supabase).
// يحافظ على المعرّفات والتواريخ. المصدر للقراءة فقط. الهدف يُفرَّغ أولًا (--wipe) ثم يُملأ،
// ثم يقارن عدد الصفوف لكل جدول ويفشل عند أي فرق.
//
// SOURCE_URL=... TARGET_URL=... node scripts/copy-db.mjs --wipe
import pkg from '@prisma/client';
const { PrismaClient, Prisma } = pkg;

const { SOURCE_URL, TARGET_URL } = process.env;
if (!SOURCE_URL || !TARGET_URL) {
  console.error('SOURCE_URL and TARGET_URL are required');
  process.exit(2);
}
if (SOURCE_URL === TARGET_URL) {
  console.error('source and target are the same database — refusing');
  process.exit(2);
}
const wipe = process.argv.includes('--wipe');

const src = new PrismaClient({ datasources: { db: { url: SOURCE_URL } }, log: ['error'] });
const dst = new PrismaClient({ datasources: { db: { url: TARGET_URL } }, log: ['error'] });

const models = Prisma.dmmf.datamodel.models;
const byName = new Map(models.map((m) => [m.name, m]));

// ترتيب طوبولوجي: الجدول الأب قبل الابن
function order() {
  const done = new Set();
  const out = [];
  const visit = (m) => {
    if (done.has(m.name)) return;
    done.add(m.name);
    for (const f of m.fields) {
      if (f.kind === 'object' && f.relationFromFields?.length && f.type !== m.name) visit(byName.get(f.type));
    }
    out.push(m);
  };
  models.forEach(visit);
  return out;
}

const delegate = (m) => m.name.charAt(0).toLowerCase() + m.name.slice(1);

function clean(m, row) {
  const data = {};
  for (const f of m.fields) {
    if (f.kind !== 'scalar' && f.kind !== 'enum') continue;
    const v = row[f.name];
    // حقول JSON الفارغة تُهمَل ليأخذ العمود NULL (Prisma لا يقبل null صريحًا فيها)
    if (f.type === 'Json' && (v === null || v === undefined)) continue;
    data[f.name] = v;
  }
  return data;
}

async function main() {
  const ordered = order();

  if (wipe) {
    const tables = ordered.map((m) => `"${m.dbName || m.name}"`).join(', ');
    await dst.$executeRawUnsafe(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
    console.log('target wiped');
  }

  const counts = [];
  for (const m of ordered) {
    const d = delegate(m);
    const rows = await src[d].findMany();
    for (let i = 0; i < rows.length; i += 500) {
      await dst[d].createMany({ data: rows.slice(i, i + 500).map((r) => clean(m, r)) });
    }
    const after = await dst[d].count();
    counts.push({ table: m.dbName || m.name, source: rows.length, target: after });
    console.log(`${(m.dbName || m.name).padEnd(24)} ${String(rows.length).padStart(6)} -> ${after}`);
  }

  const bad = counts.filter((c) => c.source !== c.target);
  await src.$disconnect();
  await dst.$disconnect();
  if (bad.length) {
    console.error('\nMISMATCH:', JSON.stringify(bad));
    process.exit(1);
  }
  console.log('\nAll tables match.');
}

main().catch(async (e) => {
  console.error('copy failed:', e.message);
  await src.$disconnect();
  await dst.$disconnect();
  process.exit(1);
});
