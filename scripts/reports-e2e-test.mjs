// اختبار قسم التقارير عبر HTTP على خادم حي: أرقام التقرير من حجوزات مزروعة، CSV (BOM وتعقيم الصيغ)،
// التحقق من المدى، عزل المالكين، جداول التقارير (إنشاء/حد 5/إيقاف/حذف/إرسال الآن)، مهمة الـcron اليومية
// (عدم تكرار الإرسال)، وصول الأدمن، وحجب تقارير الأدمن عن الملاك. يحذف بياناته في النهاية.
//
// التشغيل: BASE_URL=http://localhost:3000 CRON_SECRET=... node scripts/reports-e2e-test.mjs
// اختياري: ADMIN_EMAIL / ADMIN_PASSWORD (وإلا يحاول تسجيل أول أدمن)
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const CRON_SECRET = process.env.CRON_SECRET || '';
const TAG = `rp${Date.now().toString(36)}`;
const PW = 'Rp-Passw0rd!';

let pass = 0;
let fail = 0;
let skipped = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(`${name} ${detail}`);
    console.log(`  FAIL  ${name} ${detail}`);
  }
};
const skip = (name, why) => {
  skipped++;
  console.log(`  SKIP  ${name} (${why})`);
};

class Client {
  cookies = new Map();
  async req(method, path, body, headers = {}) {
    const h = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (this.cookies.size) h.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(BASE + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    for (const sc of res.headers.getSetCookie?.() || []) {
      const [pair] = sc.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i);
      const v = pair.slice(i + 1);
      if (v === '' || /max-age=0/i.test(sc)) this.cookies.delete(k);
      else this.cookies.set(k, v);
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text, headers: res.headers };
  }
}
const ok2xx = (r) => r.status >= 200 && r.status < 300;
const ymd = (d) => d.toISOString().slice(0, 10);
const kpi = (rep, id) => rep?.kpis?.find((k) => k.id === id)?.value;

async function pickSlots(tenantId, serviceId, count) {
  const now = Date.now();
  const out = [];
  for (let d = 0; d < 7 && out.length < count; d++) {
    const date = new Date(now + d * 86400000).toISOString().slice(0, 10);
    const r = await new Client().req('GET', `/api/salons/${tenantId}/availability?serviceId=${serviceId}&date=${date}`);
    for (const s of r.json?.data?.slots ?? []) {
      if ((Date.parse(s) - now) / 3600000 >= 2 && out.length < count && !out.some((o) => Math.abs(Date.parse(o) - Date.parse(s)) < 3600000)) out.push(s);
    }
  }
  return out;
}

async function signupOwner(label) {
  const c = new Client();
  const name = `ZZ_E2E_${TAG}_${label}`;
  const r = await c.req('POST', '/api/salons', { name, city: 'Manama', ownerName: `Owner ${label}`, email: `${TAG}-${label}@example.com`, password: PW, acceptTerms: true });
  return { c, name, tenantId: r.json?.data?.id, status: r.status };
}

async function main() {
  console.log(`Reports E2E against ${BASE}  (tag ${TAG})\n`);

  // ---------- 1. تهيئة ----------
  console.log('[1] Setup: two salons, bookings');
  const A = await signupOwner('a');
  const B = await signupOwner('b');
  check('two salons created', A.status === 201 && B.status === 201 && !!A.tenantId && !!B.tenantId, `${A.status}/${B.status}`);
  if (!A.tenantId || !B.tenantId) throw new Error('cannot continue without salons');

  const hours = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), { open: '00:00', close: '23:30' }]));
  await A.c.req('PATCH', '/api/dashboard/settings', { workingHours: hours, minBookingNoticeHours: 1 });
  const svc = await A.c.req('POST', '/api/dashboard/services', { nameAr: 'خدمة تقرير', nameEn: 'Report svc', basePrice: 4.5, baseDurationMinutes: 30 });
  const staff = await A.c.req('POST', '/api/dashboard/staff', { name: 'Rp Staff', role: 'Stylist', status: 'ACTIVE' });
  const serviceId = svc.json?.data?.id;
  const staffId = staff.json?.data?.id;
  check('service and staff created', !!serviceId && !!staffId);

  const slots = await pickSlots(A.tenantId, serviceId, 3);
  check('three distinct slots available', slots.length === 3, `got ${slots.length}`);
  // الحجز العام من الموقع متوقف: ننشئ العملاء والحجوزات من لوحة المالك
  const mkClient = async (name, phone) => (await A.c.req('POST', '/api/dashboard/clients', { name, phone })).json?.data?.id;
  const [cl1, cl2, cl3] = [await mkClient('Rp Guest 1', '33001001'), await mkClient('Rp Guest 2', '33002002'), await mkClient('=HYPERLINK("http://evil.example")', '33003003')];
  const book = (customerId, slot) => A.c.req('POST', '/api/dashboard/bookings', { customerId, serviceId, employeeId: staffId, startTime: slot });
  const b1 = await book(cl1, slots[0]);
  const b2 = await book(cl2, slots[1]);
  const b3 = await book(cl3, slots[2]);
  check('three bookings created', [b1, b2, b3].every((b) => b.status === 201), `${b1.status}/${b2.status}/${b3.status}`);
  const [id1, id2, id3] = [b1, b2, b3].map((b) => b.json?.data?.id);
  await A.c.req('PATCH', `/api/dashboard/bookings/${id1}`, { status: 'CONFIRMED' });
  const done = await A.c.req('PATCH', `/api/dashboard/bookings/${id1}`, { status: 'COMPLETED' });
  const canc = await A.c.req('PATCH', `/api/dashboard/bookings/${id2}`, { status: 'CANCELLED' });
  check('one booking completed, one cancelled', ok2xx(done) && ok2xx(canc), `${done.status}/${canc.status}`);

  // ---------- 2. تقرير حسب الطلب ----------
  console.log('\n[2] On-demand owner report');
  const from = ymd(new Date(Date.now() - 86400000));
  const to = ymd(new Date(Date.now() + 8 * 86400000));
  const q = (extra) => `/api/dashboard/reports?lang=en&preset=custom&from=${from}&to=${to}${extra ? '&' + extra : ''}`;

  const unauth = await new Client().req('GET', q('type=overview'));
  check('report requires an owner session (401)', unauth.status === 401, `status=${unauth.status}`);

  const ov = await A.c.req('GET', q('type=overview'));
  const rep = ov.json?.data;
  check('overview returns 200 with a report', ov.status === 200 && ov.json?.success === true && !!rep, `status=${ov.status} ${ov.text.slice(0, 120)}`);
  check('KPI total bookings = 3', kpi(rep, 'bookings') === 3, `got ${kpi(rep, 'bookings')}`);
  check('KPI completed = 1, cancelled = 1', kpi(rep, 'completed') === 1 && kpi(rep, 'cancelled') === 1, `${kpi(rep, 'completed')}/${kpi(rep, 'cancelled')}`);
  check('KPI realised revenue = 4.5 (completed only)', Math.abs(Number(kpi(rep, 'revenue')) - 4.5) < 0.001, `got ${kpi(rep, 'revenue')}`);
  check('report is English when lang=en', rep?.lang === 'en' && /Overview/i.test(rep?.title ?? ''), rep?.title);

  for (const type of ['bookings', 'revenue', 'services', 'staff', 'clients', 'messages']) {
    const r = await A.c.req('GET', q(`type=${type}`));
    check(`report type "${type}" renders (200, has sections)`, r.status === 200 && Array.isArray(r.json?.data?.sections), `status=${r.status}`);
  }
  const arRep = await A.c.req('GET', `/api/dashboard/reports?type=overview&preset=last30&lang=ar`);
  check('Arabic report title is Arabic', /[؀-ۿ]/.test(arRep.json?.data?.title ?? ''), arRep.json?.data?.title);
  for (const preset of ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth']) {
    const r = await A.c.req('GET', `/api/dashboard/reports?type=overview&preset=${preset}`);
    check(`preset "${preset}" works`, r.status === 200, `status=${r.status}`);
  }

  // ---------- 3. تحقق المدخلات ----------
  console.log('\n[3] Input validation');
  const bad = async (name, path, status = 400) => {
    const r = await A.c.req('GET', path);
    check(name, r.status === status, `status=${r.status}`);
  };
  await bad('unknown type → 400', '/api/dashboard/reports?type=nope');
  await bad('admin-only type "salons" → 400 for owners', '/api/dashboard/reports?type=salons');
  await bad('reversed range → 400', `/api/dashboard/reports?type=overview&preset=custom&from=${to}&to=${from}`);
  await bad('range over 366 days → 400', '/api/dashboard/reports?type=overview&preset=custom&from=2024-01-01&to=2026-01-01');
  await bad('malformed date → 400', '/api/dashboard/reports?type=overview&preset=custom&from=2026-13-45&to=2026-14-01');
  await bad('unknown preset → 400', '/api/dashboard/reports?type=overview&preset=forever');

  // ---------- 4. CSV ----------
  console.log('\n[4] CSV export');
  const csvRes = await fetch(BASE + q('type=bookings&format=csv'), { headers: { Cookie: [...A.c.cookies].map(([k, v]) => `${k}=${v}`).join('; ') } });
  const csvBuf = Buffer.from(await csvRes.arrayBuffer());
  const csv = csvBuf.toString('utf8');
  check('CSV status 200 with text/csv and attachment header', csvRes.status === 200 && /text\/csv/.test(csvRes.headers.get('content-type') || '') && /attachment/.test(csvRes.headers.get('content-disposition') || ''));
  check('CSV starts with a UTF-8 BOM', csvBuf[0] === 0xef && csvBuf[1] === 0xbb && csvBuf[2] === 0xbf);
  check('CSV uses CRLF line breaks', csv.includes('\r\n'));
  check('formula-looking client name is neutralised (prefixed with an apostrophe)', csv.includes(`'=HYPERLINK`) && !/(^|,|")=HYPERLINK/.test(csv.replace(`'=HYPERLINK`, '')), csv.slice(0, 200));
  check('CSV is not cached', /no-store/.test(csvRes.headers.get('cache-control') || ''));

  // ---------- 5. العزل ----------
  console.log('\n[5] Tenant isolation');
  const bRep = await B.c.req('GET', q('type=overview'));
  check("salon B's report shows zero bookings (no leakage from A)", kpi(bRep.json?.data, 'bookings') === 0 && Number(kpi(bRep.json?.data, 'revenue')) === 0, `bookings=${kpi(bRep.json?.data, 'bookings')}`);
  const bCsv = await fetch(BASE + q('type=bookings&format=csv'), { headers: { Cookie: [...B.c.cookies].map(([k, v]) => `${k}=${v}`).join('; ') } });
  check("salon B's CSV contains none of A's clients", !(await bCsv.text()).includes('Rp Guest'));

  // ---------- 6. الجدولة ----------
  console.log('\n[6] Schedules (owner)');
  const sPath = '/api/dashboard/report-schedules';
  const badFreq = await A.c.req('POST', sPath, { reportType: 'overview', frequency: 'HOURLY' });
  const badDay = await A.c.req('POST', sPath, { reportType: 'overview', frequency: 'WEEKLY', dayOfWeek: 9 });
  const badType = await A.c.req('POST', sPath, { reportType: 'salons', frequency: 'DAILY' });
  check('invalid schedule bodies rejected (400)', badFreq.status === 400 && badDay.status === 400 && badType.status === 400, `${badFreq.status}/${badDay.status}/${badType.status}`);
  const noRecipient = await A.c.req('POST', sPath, { reportType: 'overview', frequency: 'DAILY', to: 'attacker@example.com' });
  check('schedule creation ignores a free-form recipient', noRecipient.status === 201 && !('to' in (noRecipient.json?.data ?? {})), noRecipient.text.slice(0, 120));
  const daily = noRecipient.json?.data;

  const weekly = await A.c.req('POST', sPath, { reportType: 'revenue', frequency: 'WEEKLY', dayOfWeek: 1, locale: 'en' });
  const monthly = await A.c.req('POST', sPath, { reportType: 'clients', frequency: 'MONTHLY', dayOfMonth: 28 });
  check('weekly and monthly schedules created (201)', weekly.status === 201 && monthly.status === 201, `${weekly.status}/${monthly.status}`);
  const more = [];
  for (let i = 0; i < 2; i++) more.push(await A.c.req('POST', sPath, { reportType: 'staff', frequency: 'DAILY' }));
  check('fourth and fifth schedules created', more.every((m) => m.status === 201));
  const sixth = await A.c.req('POST', sPath, { reportType: 'services', frequency: 'DAILY' });
  check('sixth schedule refused (409 limit)', sixth.status === 409 && sixth.json?.code === 'LIMIT', `status=${sixth.status}`);

  const list = await A.c.req('GET', sPath);
  check('list returns exactly the 5 own schedules', list.json?.data?.length === 5 && list.json?.max === 5, `n=${list.json?.data?.length}`);
  const bList = await B.c.req('GET', sPath);
  check("salon B sees none of A's schedules", bList.json?.data?.length === 0);
  const bPatch = await B.c.req('PATCH', `${sPath}/${daily?.id}`, { isActive: false });
  const bDel = await B.c.req('DELETE', `${sPath}/${daily?.id}`);
  const bSend = await B.c.req('POST', `${sPath}/${daily?.id}/send`);
  check("salon B cannot modify, delete or trigger A's schedule (404)", bPatch.status === 404 && bDel.status === 404 && bSend.status === 404, `${bPatch.status}/${bDel.status}/${bSend.status}`);
  const badId = await A.c.req('PATCH', `${sPath}/not-a-uuid`, { isActive: false });
  check('malformed schedule id → 404', badId.status === 404, `status=${badId.status}`);

  const pause = await A.c.req('PATCH', `${sPath}/${weekly.json?.data?.id}`, { isActive: false });
  check('schedule can be paused', ok2xx(pause) && pause.json?.data?.isActive === false);
  const send = await A.c.req('POST', `${sPath}/${monthly.json?.data?.id}/send`);
  check('send-now succeeds', ok2xx(send) && send.json?.success === true, `status=${send.status} ${send.text.slice(0, 100)}`);
  const del = await A.c.req('DELETE', `${sPath}/${monthly.json?.data?.id}`);
  check('schedule can be deleted', ok2xx(del));
  const afterDel = await A.c.req('GET', sPath);
  check('deleted schedule is gone (4 left)', afterDel.json?.data?.length === 4);

  // ---------- 7. cron ----------
  console.log('\n[7] Daily cron');
  const noAuth = await new Client().req('GET', '/api/cron/daily');
  check('cron without secret is rejected (401/503)', noAuth.status === 401 || noAuth.status === 503, `status=${noAuth.status}`);
  const wrong = await new Client().req('GET', '/api/cron/daily', undefined, { Authorization: 'Bearer wrong' });
  check('cron with a wrong secret is rejected', wrong.status === 401 || wrong.status === 503, `status=${wrong.status}`);
  if (!CRON_SECRET) {
    skip('cron runs due schedules once', 'CRON_SECRET not provided to the test');
  } else {
    const h = { Authorization: `Bearer ${CRON_SECRET}` };
    const run1 = await new Client().req('GET', '/api/cron/daily', undefined, h);
    check('cron run 1 succeeds and reports sent >= 1', run1.status === 200 && run1.json?.success === true && Number(run1.json?.reports?.sent) >= 1, `status=${run1.status} ${run1.text.slice(0, 200)}`);
    const l1 = await A.c.req('GET', sPath);
    const d1 = l1.json?.data?.find((s) => s.id === daily?.id);
    check('daily schedule got lastRunAt', !!d1?.lastRunAt && !d1?.lastError, JSON.stringify(d1));
    const paused = l1.json?.data?.find((s) => s.id === weekly.json?.data?.id);
    check('paused schedule was not run', paused?.lastRunAt === null);
    const run2 = await new Client().req('GET', '/api/cron/daily', undefined, h);
    const l2 = await A.c.req('GET', sPath);
    const d2 = l2.json?.data?.find((s) => s.id === daily?.id);
    check('second run the same day does not re-run the schedule', d2?.lastRunAt === d1?.lastRunAt, `${d1?.lastRunAt} vs ${d2?.lastRunAt}`);
    check('cron run 2 succeeds', run2.status === 200 && run2.json?.success === true);
  }

  // ---------- 8. الأدمن ----------
  console.log('\n[8] Admin reports');
  const ownerAdminRep = await A.c.req('GET', '/api/admin/reports?type=overview');
  const ownerAdminSch = await A.c.req('GET', '/api/admin/report-schedules');
  check('owner session cannot read admin reports or schedules (401)', ownerAdminRep.status === 401 && ownerAdminSch.status === 401, `${ownerAdminRep.status}/${ownerAdminSch.status}`);
  const anon = await new Client().req('GET', '/api/admin/reports?type=overview');
  check('anonymous cannot read admin reports (401)', anon.status === 401, `status=${anon.status}`);

  const admin = new Client();
  let adminOk = false;
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    adminOk = ok2xx(await admin.req('POST', '/api/admin/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }));
  } else {
    adminOk = (await admin.req('POST', '/api/admin/register', { name: 'RP Admin', email: `${TAG}-admin@example.com`, password: PW })).status === 201;
  }
  if (!adminOk) {
    skip('admin report tests', 'no admin credentials and an admin already exists');
  } else {
    for (const type of ['overview', 'salons', 'bookings', 'subscriptions', 'activity']) {
      const r = await admin.req('GET', `/api/admin/reports?type=${type}&preset=last30&lang=en`);
      check(`admin report "${type}" renders`, r.status === 200 && Array.isArray(r.json?.data?.sections), `status=${r.status} ${r.text.slice(0, 100)}`);
    }
    const adminBad = await admin.req('GET', '/api/admin/reports?type=revenue');
    check('owner-only type "revenue" → 400 for admin', adminBad.status === 400, `status=${adminBad.status}`);
    const sal = await admin.req('GET', `/api/admin/reports?type=salons&preset=custom&from=${from}&to=${to}&lang=en`);
    const salText = JSON.stringify(sal.json?.data ?? {});
    check('admin salons report lists the test salon', salText.includes(A.name), salText.slice(0, 120));
    const aCsv = await fetch(BASE + `/api/admin/reports?type=salons&format=csv&preset=last30`, { headers: { Cookie: [...admin.cookies].map(([k, v]) => `${k}=${v}`).join('; ') } });
    const aBuf = Buffer.from(await aCsv.arrayBuffer());
    check('admin CSV has BOM', aCsv.status === 200 && aBuf[0] === 0xef && aBuf[1] === 0xbb);

    const aSch = await admin.req('POST', '/api/admin/report-schedules', { reportType: 'overview', frequency: 'WEEKLY', dayOfWeek: 0 });
    check('admin schedule created', aSch.status === 201, `status=${aSch.status} ${aSch.text.slice(0, 100)}`);
    const aSend = aSch.json?.data?.id && (await admin.req('POST', `/api/admin/report-schedules/${aSch.json.data.id}/send`));
    check('admin send-now works', !!aSend && ok2xx(aSend), aSend && `status=${aSend.status}`);
    const ownerTouch = aSch.json?.data?.id && (await A.c.req('DELETE', `/api/admin/report-schedules/${aSch.json.data.id}`));
    check("owner cannot delete an admin's schedule", !!ownerTouch && ownerTouch.status === 401, ownerTouch && `status=${ownerTouch.status}`);
    const aDel = aSch.json?.data?.id && (await admin.req('DELETE', `/api/admin/report-schedules/${aSch.json.data.id}`));
    check('admin schedule deleted', !!aDel && ok2xx(aDel));

    // ---------- 8b. مفاتيح الأدمن للمهام التلقائية ----------
    console.log('\n[8b] Admin on/off switches for automatic jobs');
    const auto = (key, enabled) => admin.req('POST', `/api/admin/salons/${A.tenantId}/automations`, { key, enabled });
    const badKey = await auto('reviews', false);
    check('per-salon switch rejects unknown keys (400)', badKey.status === 400, `status=${badKey.status}`);
    const ownerSwitch = await A.c.req('POST', `/api/admin/salons/${A.tenantId}/automations`, { key: 'reports', enabled: false });
    check('owner cannot flip admin switches (401)', ownerSwitch.status === 401, `status=${ownerSwitch.status}`);

    const gs = (await A.c.req('GET', sPath)).json;
    check('schedules API reports enabled=true by default', gs?.enabled === true);
    // نترك مكانًا لجدول جديد: نحذف جدولًا قائمًا
    const first = gs?.data?.[0];
    if (first) await A.c.req('DELETE', `${sPath}/${first.id}`);

    check('admin turns reports OFF for salon A', ok2xx(await auto('reports', false)));
    const off = await A.c.req('GET', sPath);
    check('owner sees enabled=false', off.json?.enabled === false);
    const blocked = await A.c.req('POST', sPath, { reportType: 'overview', frequency: 'DAILY' });
    check('owner cannot create a schedule while off (403 DISABLED)', blocked.status === 403 && blocked.json?.code === 'DISABLED', `status=${blocked.status}`);
    const blockedSend = off.json?.data?.[0] && (await A.c.req('POST', `${sPath}/${off.json.data[0].id}/send`));
    check('send-now blocked while off (403)', !blockedSend || blockedSend.status === 403, blockedSend && `status=${blockedSend.status}`);

    check('admin turns reports back ON', ok2xx(await auto('reports', true)));
    const mk = await A.c.req('POST', sPath, { reportType: 'overview', frequency: 'DAILY' });
    check('schedule can be created again after re-enabling', mk.status === 201, `status=${mk.status}`);
    const mkId = mk.json?.data?.id;

    if (CRON_SECRET && mkId) {
      const h = { Authorization: `Bearer ${CRON_SECRET}` };
      await auto('reports', false);
      await new Client().req('GET', '/api/cron/daily', undefined, h);
      const l = (await A.c.req('GET', sPath)).json?.data?.find((x) => x.id === mkId);
      check('cron skips a salon whose reports switch is off', l?.lastRunAt === null, JSON.stringify(l));
      await auto('reports', true);
      await new Client().req('GET', '/api/cron/daily', undefined, h);
      const l2 = (await A.c.req('GET', sPath)).json?.data?.find((x) => x.id === mkId);
      check('cron runs it once the switch is back on', !!l2?.lastRunAt, JSON.stringify(l2));

      // مفتاح المنصة
      const cur = (await admin.req('GET', '/api/admin/settings')).json?.data;
      const put = (a) => admin.req('PUT', '/api/admin/settings', { ...cur, automations: { ...cur.automations, ...a } });
      check('settings expose the automations (reports/reminders on, win-back off by default)', cur?.automations?.reports === true && cur.automations.reminders === true && cur.automations.winBack === false && !('reviews' in cur.automations), JSON.stringify(cur?.automations));
      await put({ reminders: false, winBack: false, reports: false });
      const run = await new Client().req('GET', '/api/cron/daily', undefined, h);
      check('platform switches OFF: reminders and win-back are disabled', run.json?.reminders?.disabled === true && run.json?.winBack?.disabled === true, JSON.stringify(run.json));
      const blockedPlatform = await A.c.req('POST', sPath, { reportType: 'staff', frequency: 'DAILY' });
      check('platform reports switch OFF blocks owners too (403 or limit)', blockedPlatform.status === 403 || blockedPlatform.status === 409, `status=${blockedPlatform.status}`);
      const restored = await put({ reminders: true, winBack: false, reports: true });
      check('platform switches restored', ok2xx(restored) && restored.json?.data?.automations?.reports === true && restored.json?.data?.automations?.reminders === true);
    } else {
      skip('cron respects automation switches', 'CRON_SECRET not provided to the test');
    }
  }

  // ---------- 9. صفحات الواجهة ----------
  console.log('\n[9] UI pages');
  const pageOwner = await A.c.req('GET', '/en/dashboard/reports');
  check('owner reports page renders 200', pageOwner.status === 200, `status=${pageOwner.status}`);
  const pageAnon = await new Client().req('GET', '/en/dashboard/reports');
  check('reports page is not visible to anonymous visitors', pageAnon.status >= 300 && pageAnon.status < 500, `status=${pageAnon.status}`);
  if (adminOk) {
    const pageAdmin = await admin.req('GET', '/en/admin/reports');
    check('admin reports page renders 200', pageAdmin.status === 200, `status=${pageAdmin.status}`);
  }

  // ---------- تنظيف ----------
  console.log('\n[cleanup]');
  if (adminOk) {
    for (const s of [A, B]) await admin.req('DELETE', `/api/admin/salons/${s.tenantId}`, { confirmName: s.name });
    console.log('  test salons deleted (schedules cascade)');
  } else {
    console.log(`  no admin; delete test data manually (contains ${TAG})`);
  }

  console.log(`\nResult: ${pass} passed, ${fail} failed, ${skipped} skipped`);
  if (fail) {
    console.log('\nFailures:');
    for (const f of failures) console.log(' - ' + f);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('\nTEST ERROR:', e.message);
  process.exit(2);
});
