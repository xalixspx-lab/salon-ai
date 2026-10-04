// اختبار رحلات كاملة عبر HTTP على خادم حي (محلي أو CI) بحسابات مؤقتة يحذفها في النهاية
// إن توفرت بيانات أدمن (أو إن أمكن تسجيل أول أدمن). يغطي: تسجيل صالون وعميل، حجز، تعارض،
// اكتمال ونقاط الولاء، تقويم .ics، تذكير الموعد (cron)، المحادثة بالاتجاهين والحظر وحدود
// المعدل، إبطال الجلسات عند تغيير كلمة المرور، الإخفاء الإداري، لغة أخطاء الـAPI.
//
// التشغيل: BASE_URL=http://localhost:3000 CRON_SECRET=... node scripts/e2e-test.mjs
// اختياري: ADMIN_EMAIL / ADMIN_PASSWORD (وإلا يحاول تسجيل أول أدمن إن كانت المنصة بلا أدمن)
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const CRON_SECRET = process.env.CRON_SECRET || '';
const TAG = `e2e${Date.now().toString(36)}`;
const PW = 'E2e-Passw0rd!';
const PW2 = 'E2e-Changed-Passw0rd!';

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
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
  }
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
const pointsOf = (r) => Number(/"points":\s*(\d+)/.exec(r.text)?.[1] ?? NaN);

async function pickSlot(tenantId, serviceId, { minHours = 2, maxHours = 24 * 6 } = {}) {
  const now = Date.now();
  for (let d = 0; d < 7; d++) {
    const date = new Date(now + d * 86400000).toISOString().slice(0, 10);
    const r = await new Client('p').req('GET', `/api/salons/${tenantId}/availability?serviceId=${serviceId}&date=${date}`);
    const slots = r.json?.data?.slots;
    if (!Array.isArray(slots)) continue;
    const s = slots.find((x) => {
      const h = (Date.parse(x) - now) / 3600000;
      return h >= minHours && h <= maxHours;
    });
    if (s) return s;
  }
  return null;
}

async function main() {
  console.log(`E2E against ${BASE}  (tag ${TAG})\n`);

  // ---------- 1. تسجيل صالون ----------
  console.log('[1] Salon owner signup and setup');
  const owner = new Client('owner');
  const ownerEmail = `${TAG}-owner@example.com`;
  const sal = await owner.req('POST', '/api/salons', { name: `ZZ_E2E_${TAG}`, city: 'Manama', ownerName: 'E2E Owner', email: ownerEmail, password: PW, acceptTerms: true });
  check('salon signup returns 201', sal.status === 201, `status=${sal.status} ${sal.text.slice(0, 120)}`);
  const tenantId = sal.json?.data?.id;
  if (!tenantId) throw new Error('cannot continue without a salon');

  // ساعات دوام على مدار اليوم حتى يمكن حجز موعد بعد ~24 ساعة لاختبار التذكير مهما كان وقت التشغيل
  const hours = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), { open: '00:00', close: '23:30' }]));
  const setHours = await owner.req('PATCH', '/api/dashboard/settings', { workingHours: hours, minBookingNoticeHours: 1 });
  check('owner can set 24h working hours', ok2xx(setHours), `status=${setHours.status}`);

  const svc = await owner.req('POST', '/api/dashboard/services', { nameAr: 'خدمة اختبار', nameEn: 'E2E service', basePrice: 4.5, baseDurationMinutes: 30 });
  const staff1 = await owner.req('POST', '/api/dashboard/staff', { name: 'E2E Staff', role: 'Stylist', status: 'ACTIVE' });
  const serviceId = svc.json?.data?.id;
  const staffId = staff1.json?.data?.id;
  check('service and staff created', !!serviceId && !!staffId, `svc=${svc.status} staff=${staff1.status}`);

  const badTz = await owner.req('PATCH', '/api/dashboard/settings', { timezone: 'Mars/Olympus' });
  check('invalid timezone is rejected (400)', badTz.status === 400, `status=${badTz.status}`);
  const badCur = await owner.req('PATCH', '/api/dashboard/settings', { currency: 'DINAR' });
  check('invalid currency is rejected (400)', badCur.status === 400, `status=${badCur.status}`);

  // ---------- 2. تسجيل عملاء ----------
  console.log('\n[2] Customer signup and public discovery');
  const mkCustomer = async (n) => {
    const c = new Client(`c${n}`);
    const email = `${TAG}-c${n}@example.com`;
    const r = await c.req('POST', '/api/account/register', { name: `E2E Customer ${n}`, email, password: PW, acceptTerms: true });
    return { c, email, status: r.status, text: r.text };
  };
  const C1 = await mkCustomer(1);
  const C2 = await mkCustomer(2);
  check('customer 1 and 2 registered (201)', C1.status === 201 && C2.status === 201, `${C1.status}/${C2.status} ${C1.text.slice(0, 100)}`);

  const pub = new Client('pub');
  const list = await pub.req('GET', '/api/salons');
  check('new salon is listed publicly', list.text.includes(tenantId));
  const page = await pub.req('GET', `/ar/salons/${tenantId}`);
  check('salon page renders 200', page.status === 200, `status=${page.status}`);
  const nf1 = await pub.req('GET', '/ar/salons/11111111-1111-1111-1111-111111111111');
  const nf2 = await pub.req('GET', '/ar/salons/not-a-uuid');
  const nf3 = await pub.req('GET', '/ar/zzz-not-a-page');
  check('unknown salon / bad id / unknown path return 404 (no soft-404)', nf1.status === 404 && nf2.status === 404 && nf3.status === 404, `${nf1.status}/${nf2.status}/${nf3.status}`);

  // ---------- 3. حجز ----------
  console.log('\n[3] Booking flow');
  const slot1 = await pickSlot(tenantId, serviceId);
  check('availability returns a slot', !!slot1);
  const bk1 = await C1.c.req('POST', '/api/appointments', { tenantId, serviceId, employeeId: staffId, startTime: slot1 });
  const bookingId = bk1.json?.data?.id;
  check('customer 1 booking created (201)', bk1.status === 201 && !!bookingId, `status=${bk1.status} ${bk1.text.slice(0, 120)}`);
  const dup = await pub.req('POST', '/api/appointments', { tenantId, serviceId, employeeId: staffId, customerName: 'Guest', customerPhone: '33000001', startTime: slot1 });
  check('double-booking the same slot/staff is refused (409)', dup.status === 409, `status=${dup.status}`);

  // حجز ضيف برقم هاتف عميل مسجَّل لا يلتصق بسجله
  const guestPhone = '33998877';
  await owner.req('POST', '/api/dashboard/clients', { name: 'CRM guest', phone: guestPhone });
  const hist0 = await C1.c.req('GET', '/api/account/history');
  check('customer 1 sees own booking in history', hist0.text.includes(bookingId));

  // ---------- 4. تغيير الحالة، النقاط ----------
  console.log('\n[4] Status transitions and loyalty points');
  const ptsBefore = pointsOf(await C1.c.req('GET', '/api/account/export'));
  const conf = await owner.req('PATCH', `/api/dashboard/bookings/${bookingId}`, { status: 'CONFIRMED' });
  check('owner confirms booking', ok2xx(conf), `status=${conf.status}`);
  const done = await owner.req('PATCH', `/api/dashboard/bookings/${bookingId}`, { status: 'COMPLETED' });
  check('owner completes booking', ok2xx(done), `status=${done.status}`);
  await new Promise((r) => setTimeout(r, 1500)); // الجوائز تُمنح داخل after()
  const ptsAfter = pointsOf(await C1.c.req('GET', '/api/account/export'));
  check('loyalty points awarded once on completion', ptsAfter > ptsBefore, `before=${ptsBefore} after=${ptsAfter}`);
  const revert = await owner.req('PATCH', `/api/dashboard/bookings/${bookingId}`, { status: 'CONFIRMED' });
  check('COMPLETED is final: reverting is refused (409)', revert.status === 409, `status=${revert.status}`);
  const again = await owner.req('PATCH', `/api/dashboard/bookings/${bookingId}`, { status: 'COMPLETED' });
  await new Promise((r) => setTimeout(r, 800));
  const ptsAgain = pointsOf(await C1.c.req('GET', '/api/account/export'));
  check('re-completing does not award points twice', ptsAgain === ptsAfter, `after=${ptsAfter} again=${ptsAgain} (status ${again.status})`);

  // ---------- 5. تقويم + تذكير ----------
  console.log('\n[5] Add-to-calendar (.ics) and appointment reminders');
  const ics = await C1.c.req('GET', `/api/account/appointments/${bookingId}/ics?locale=ar`);
  check('ics returns text/calendar with DTSTART', ics.status === 200 && /text\/calendar/.test(ics.headers.get('content-type') || '') && ics.text.includes('BEGIN:VEVENT') && /DTSTART:\d{8}T\d{6}Z/.test(ics.text), `status=${ics.status}`);
  const icsOther = await C2.c.req('GET', `/api/account/appointments/${bookingId}/ics`);
  check("customer 2 cannot download customer 1's ics (404)", icsOther.status === 404, `status=${icsOther.status}`);
  const icsAnon = await pub.req('GET', `/api/account/appointments/${bookingId}/ics`);
  check('anonymous ics is refused (401)', icsAnon.status === 401, `status=${icsAnon.status}`);

  const noAuth = await pub.req('GET', '/api/cron/appointment-reminders');
  check('reminder cron refuses without secret (401)', noAuth.status === 401, `status=${noAuth.status}`);
  if (!CRON_SECRET) {
    skip('reminder cron end-to-end', 'CRON_SECRET not provided to the test');
  } else {
    const slotR = await pickSlot(tenantId, serviceId, { minHours: 13, maxHours: 35 });
    const bkR = slotR && (await C1.c.req('POST', '/api/appointments', { tenantId, serviceId, employeeId: staffId, startTime: slotR }));
    const rid = bkR?.json?.data?.id;
    check('booking ~24h ahead created for reminder test', !!rid, `slot=${slotR} status=${bkR?.status}`);
    if (rid) {
      await owner.req('PATCH', `/api/dashboard/bookings/${rid}`, { status: 'CONFIRMED' });
      const run1 = await pub.req('GET', '/api/cron/appointment-reminders', undefined, { Authorization: `Bearer ${CRON_SECRET}` });
      check('reminder cron sends for the due appointment', run1.status === 200 && run1.json?.sent >= 1, `status=${run1.status} ${run1.text.slice(0, 100)}`);
      const run2 = await pub.req('GET', '/api/cron/appointment-reminders', undefined, { Authorization: `Bearer ${CRON_SECRET}` });
      check('reminder cron is idempotent (second run sends 0)', run2.status === 200 && run2.json?.sent === 0, `status=${run2.status} ${run2.text.slice(0, 100)}`);
      await C1.c.req('POST', `/api/account/appointments/${rid}/cancel`);
    }
  }

  // ---------- 6. المحادثة ----------
  console.log('\n[6] Chat: both directions, unread, isolation, block, rate limit');
  const m1 = await C1.c.req('POST', `/api/account/conversations/${tenantId}/messages`, { body: 'مرحبا من العميل 1' });
  check('customer 1 sends a message (201)', m1.status === 201, `status=${m1.status} ${m1.text.slice(0, 100)}`);
  const inbox = await owner.req('GET', '/api/dashboard/conversations');
  const conv = inbox.json?.data?.[0];
  check('owner inbox shows the conversation with 1 unread', inbox.json?.data?.length === 1 && conv?.unreadCount === 1, inbox.text.slice(0, 160));
  const convId = conv?.id;
  const ownerRead = await owner.req('GET', `/api/dashboard/conversations/${convId}/messages`);
  check('owner reads the thread', ownerRead.text.includes('مرحبا من العميل 1'));
  await owner.req('POST', `/api/dashboard/conversations/${convId}/read`);
  const inbox2 = await owner.req('GET', '/api/dashboard/conversations');
  check('unread cleared after read', inbox2.json?.data?.[0]?.unreadCount === 0);
  const reply = await owner.req('POST', `/api/dashboard/conversations/${convId}/messages`, { body: 'أهلًا، تفضل' });
  check('owner replies (201)', reply.status === 201, `status=${reply.status}`);
  const unread = await C1.c.req('GET', `/api/account/conversations/${tenantId}/unread`);
  check('customer sees 1 unread from salon', unread.json?.data?.unread === 1, unread.text);
  const c1Thread = await C1.c.req('GET', `/api/account/conversations/${tenantId}/messages`);
  check('customer thread has both messages', c1Thread.text.includes('أهلًا، تفضل') && c1Thread.text.includes('مرحبا من العميل 1'));
  const unread2 = await C1.c.req('GET', `/api/account/conversations/${tenantId}/unread`);
  check('customer unread cleared after opening', unread2.json?.data?.unread === 0);
  const c2Thread = await C2.c.req('GET', `/api/account/conversations/${tenantId}/messages`);
  check("customer 2 cannot see customer 1's messages", !c2Thread.text.includes('مرحبا من العميل 1'));
  const bad1 = await C1.c.req('POST', `/api/account/conversations/${tenantId}/messages`, { body: '' });
  const bad2 = await C1.c.req('POST', `/api/account/conversations/${tenantId}/messages`, { body: 'x'.repeat(2001) });
  const bad3 = await C1.c.req('POST', `/api/account/conversations/not-a-uuid/messages`, { body: 'x' });
  check('empty / oversize / bad-id messages are rejected', bad1.status === 400 && bad2.status === 400 && bad3.status === 404, `${bad1.status}/${bad2.status}/${bad3.status}`);

  // الحظر
  const blk = await C1.c.req('POST', `/api/account/conversations/${tenantId}/block`, { blocked: true });
  check('customer blocks the salon', ok2xx(blk), `status=${blk.status}`);
  const sendBlocked = await owner.req('POST', `/api/dashboard/conversations/${convId}/messages`, { body: 'x' });
  check('owner cannot send to a customer who blocked (403)', sendBlocked.status === 403, `status=${sendBlocked.status}`);
  const crm = await owner.req('GET', '/api/dashboard/clients');
  const crmRow = (crm.json?.data || []).find((c) => c.hasAccount);
  if (crmRow) {
    const startBlocked = await owner.req('POST', '/api/dashboard/conversations', { customerId: crmRow.id });
    check('owner cannot start a chat with a customer who blocked (403)', startBlocked.status === 403, `status=${startBlocked.status}`);
  } else skip('owner start-chat while blocked', 'no CRM client with account');
  const unblk = await C1.c.req('POST', `/api/account/conversations/${tenantId}/block`, { blocked: false });
  const sendOk = await owner.req('POST', `/api/dashboard/conversations/${convId}/messages`, { body: 'بعد إلغاء الحظر' });
  check('after unblock the owner can send again', ok2xx(unblk) && sendOk.status === 201, `${unblk.status}/${sendOk.status}`);

  // حد المعدل (30 رسالة/دقيقة لكل عميل)
  let limited = 0;
  for (let i = 0; i < 40; i++) {
    const r = await C2.c.req('POST', `/api/account/conversations/${tenantId}/messages`, { body: `spam ${i}` });
    if (r.status === 429) limited++;
  }
  check('chat spam is rate limited (429 appears)', limited > 0, `limited=${limited}`);

  // ---------- 7. الجلسات ----------
  console.log('\n[7] Session revocation after password change');
  const c1b = new Client('c1-second-device');
  const lg = await c1b.req('POST', '/api/account/login', { email: C1.email, password: PW });
  check('customer logs in on a second device', ok2xx(lg), `status=${lg.status}`);
  const before = await c1b.req('GET', '/api/account/session');
  check('second device is logged in', before.json?.loggedIn === true);
  const chg = await C1.c.req('POST', '/api/account/change-password', { currentPassword: PW, newPassword: PW2 });
  check('customer changes password', ok2xx(chg), `status=${chg.status} ${chg.text.slice(0, 100)}`);
  const after1 = await C1.c.req('GET', '/api/account/session');
  const after2 = await c1b.req('GET', '/api/account/session');
  check('device that changed the password stays logged in', after1.json?.loggedIn === true);
  check('other device is logged out immediately', after2.json?.loggedIn === false);

  const own2 = new Client('owner-second-device');
  await own2.req('POST', '/api/auth/login', { email: ownerEmail, password: PW });
  check('owner second device works before change', (await own2.req('GET', '/api/dashboard/settings')).status === 200);
  const oc = await owner.req('POST', '/api/dashboard/change-password', { currentPassword: PW, newPassword: PW2 });
  check('owner changes password', ok2xx(oc), `status=${oc.status}`);
  check('owner current device stays logged in', (await owner.req('GET', '/api/dashboard/settings')).status === 200);
  check('owner other device is logged out (401)', (await own2.req('GET', '/api/dashboard/settings')).status === 401);

  // ---------- 8. موظف له حجوزات قادمة ----------
  console.log('\n[8] Staff deletion guard');
  const futureSlot = await pickSlot(tenantId, serviceId, { minHours: 2, maxHours: 24 * 5 });
  const fb = futureSlot && (await C2.c.req('POST', '/api/appointments', { tenantId, serviceId, employeeId: staffId, startTime: futureSlot }));
  if (fb?.json?.data?.id) {
    await owner.req('PATCH', `/api/dashboard/bookings/${fb.json.data.id}`, { status: 'CONFIRMED' });
    const del = await owner.req('DELETE', `/api/dashboard/staff/${staffId}`);
    check('deleting staff with an upcoming booking is refused (409)', del.status === 409, `status=${del.status}`);
  } else skip('staff deletion guard', 'could not create an upcoming booking');

  // ---------- 9. لغة الأخطاء ----------
  console.log('\n[9] API error language follows the page');
  const en = await pub.req('POST', '/api/auth/login', {}, { Referer: `${BASE}/en/login` });
  const ar = await pub.req('POST', '/api/auth/login', {}, { Referer: `${BASE}/ar/login` });
  check('English page gets an English error', /required/i.test(en.json?.error || '') && !/[؀-ۿ]/.test(en.json?.error || ''), en.text.slice(0, 100));
  check('Arabic page gets an Arabic error', /[؀-ۿ]/.test(ar.json?.error || ''), ar.text.slice(0, 100));

  // ---------- 10. الأدمن: الإخفاء ----------
  console.log('\n[10] Admin hide (cannot be undone by the owner)');
  const admin = new Client('admin');
  let adminOk = false;
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    adminOk = ok2xx(await admin.req('POST', '/api/admin/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }));
  } else {
    const reg = await admin.req('POST', '/api/admin/register', { name: 'E2E Admin', email: `${TAG}-admin@example.com`, password: PW });
    adminOk = reg.status === 201;
  }
  if (!adminOk) {
    skip('admin hide tests', 'no admin credentials and an admin already exists');
  } else {
    const hide = await admin.req('PATCH', `/api/admin/salons/${tenantId}`, { isPublished: false });
    check('admin hides the salon', ok2xx(hide), `status=${hide.status} ${hide.text.slice(0, 100)}`);
    const l2 = await pub.req('GET', '/api/salons');
    check('hidden salon disappears from the public list', !l2.text.includes(tenantId));
    check('hidden salon page is 404', (await pub.req('GET', `/ar/salons/${tenantId}`)).status === 404);
    const ownerRepublish = await owner.req('PATCH', '/api/dashboard/settings', { isPublished: true });
    check('owner re-publishing does not undo the admin ban', ok2xx(ownerRepublish) && !(await pub.req('GET', '/api/salons')).text.includes(tenantId));
    const chatHidden = await C1.c.req('POST', `/api/account/conversations/${tenantId}/messages`, { body: 'x' });
    check('customers cannot message a hidden salon (404)', chatHidden.status === 404, `status=${chatHidden.status}`);
    const bookHidden = await pub.req('POST', '/api/appointments', { tenantId, serviceId, customerName: 'x', customerPhone: '1', startTime: futureSlot || slot1 });
    check('hidden salon rejects bookings', bookHidden.status >= 400, `status=${bookHidden.status}`);
    const unhide = await admin.req('PATCH', `/api/admin/salons/${tenantId}`, { isPublished: true });
    check('admin unhides the salon', ok2xx(unhide) && (await pub.req('GET', '/api/salons')).text.includes(tenantId));
  }

  // ---------- تنظيف ----------
  console.log('\n[cleanup]');
  if (adminOk) {
    await admin.req('DELETE', `/api/admin/salons/${tenantId}`, { confirmName: `ZZ_E2E_${TAG}` });
    const cust = await admin.req('GET', `/api/admin/customers?q=${TAG}`);
    for (const row of cust.json?.data ?? []) await admin.req('DELETE', `/api/admin/customers/${row.id}`, { confirmEmail: row.email });
    console.log('  test salon and customers deleted');
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
