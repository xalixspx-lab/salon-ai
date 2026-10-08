// اختبار رحلات كاملة عبر HTTP على خادم حي (محلي أو CI) بحسابات مؤقتة يحذفها في النهاية
// إن توفرت بيانات أدمن (أو إن أمكن تسجيل أول أدمن). يغطي المنصة بعد قرار التحوّل (للملاك فقط):
// تسجيل صالون، صفحة الصالون العامة بزر واتساب فقط، تعطيل جانب العميل (حساب/حجز/محادثة ويب → 410/404)،
// الحجز اليدوي من المالك وتعارضه وحالاته، المحادثة الداخلية لا تعمل، إبطال جلسات المالك عند تغيير
// كلمة المرور، حماية حذف موظف له حجوزات، لغة أخطاء الـAPI، الإخفاء الإداري.
//
// التشغيل: BASE_URL=http://localhost:3000 CRON_SECRET=... node scripts/e2e-test.mjs
// اختياري: ADMIN_EMAIL / ADMIN_PASSWORD (وإلا يحاول تسجيل أول أدمن إن كانت المنصة بلا أدمن)
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const CRON_SECRET = process.env.CRON_SECRET || '';
const TAG = `e2e${Date.now().toString(36)}`;
const PW = 'E2e-Passw0rd!';
const PW2 = 'E2e-Changed-Passw0rd!';
const WA_PHONE = '+973 3311 2233';

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

async function pickSlot(tenantId, serviceId, { minHours = 2, maxHours = 24 * 6, skipN = 0 } = {}) {
  const now = Date.now();
  let seen = 0;
  for (let d = 0; d < 7; d++) {
    const date = new Date(now + d * 86400000).toISOString().slice(0, 10);
    const r = await new Client('p').req('GET', `/api/salons/${tenantId}/availability?serviceId=${serviceId}&date=${date}`);
    const slots = r.json?.data?.slots;
    if (!Array.isArray(slots)) continue;
    for (const x of slots) {
      const h = (Date.parse(x) - now) / 3600000;
      if (h >= minHours && h <= maxHours) {
        if (seen++ >= skipN) return x;
      }
    }
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

  // ساعات دوام على مدار اليوم حتى تتوفر مواعيد مهما كان وقت التشغيل
  const hours = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), { open: '00:00', close: '23:30' }]));
  const setHours = await owner.req('PATCH', '/api/dashboard/settings', { workingHours: hours, minBookingNoticeHours: 1, phone: WA_PHONE });
  check('owner can set 24h working hours and a phone', ok2xx(setHours), `status=${setHours.status}`);

  const svc = await owner.req('POST', '/api/dashboard/services', { nameAr: 'خدمة اختبار', nameEn: 'E2E service', basePrice: 4.5, baseDurationMinutes: 30 });
  const staff1 = await owner.req('POST', '/api/dashboard/staff', { name: 'E2E Staff', role: 'Stylist', status: 'ACTIVE' });
  const serviceId = svc.json?.data?.id;
  const staffId = staff1.json?.data?.id;
  check('service and staff created', !!serviceId && !!staffId, `svc=${svc.status} staff=${staff1.status}`);

  const badTz = await owner.req('PATCH', '/api/dashboard/settings', { timezone: 'Mars/Olympus' });
  check('invalid timezone is rejected (400)', badTz.status === 400, `status=${badTz.status}`);
  const badCur = await owner.req('PATCH', '/api/dashboard/settings', { currency: 'DINAR' });
  check('invalid currency is rejected (400)', badCur.status === 400, `status=${badCur.status}`);

  // ---------- 2. الصفحة العامة: واتساب فقط ----------
  console.log('\n[2] Public salon page: WhatsApp contact only');
  const pub = new Client('pub');
  const list = await pub.req('GET', '/api/salons');
  check('new salon is listed in the public directory', list.text.includes(tenantId));
  const page = await pub.req('GET', `/en/salons/${tenantId}`);
  check('salon page renders 200', page.status === 200, `status=${page.status}`);
  check('salon page has a wa.me link built from the salon phone', page.text.includes('https://wa.me/97333112233'), 'wa.me link missing');
  check('salon page renders no booking button, favorites or web-chat widget', !/<button[^>]*>[^<]*(Book this service|احجز هذه الخدمة)/.test(page.text) && !page.text.includes('/api/account/conversations'));
  const dirPage = await pub.req('GET', '/en/salons');
  check('salon directory page renders 200', dirPage.status === 200, `status=${dirPage.status}`);
  const nf1 = await pub.req('GET', '/ar/salons/11111111-1111-1111-1111-111111111111');
  const nf2 = await pub.req('GET', '/ar/salons/not-a-uuid');
  const nf3 = await pub.req('GET', '/ar/zzz-not-a-page');
  check('unknown salon / bad id / unknown path return 404 (no soft-404)', nf1.status === 404 && nf2.status === 404 && nf3.status === 404, `${nf1.status}/${nf2.status}/${nf3.status}`);
  const home = await pub.req('GET', '/ar');
  check('homepage is the owners landing page', home.status === 200 && home.text.includes('/ar/salons/new') && home.text.includes('/ar/login'), `status=${home.status}`);
  check('homepage has no customer sign-in / register links', !home.text.includes('/account/login') && !home.text.includes('/account/register'));

  // ---------- 3. جانب العميل معطّل ----------
  console.log('\n[3] Customer side is switched off (410 / 404)');
  const reg = await pub.req('POST', '/api/account/register', { name: 'x', email: `${TAG}-c@example.com`, password: PW, acceptTerms: true });
  check('customer registration is retired (410)', reg.status === 410, `status=${reg.status}`);
  const clog = await pub.req('POST', '/api/account/login', { email: `${TAG}-c@example.com`, password: PW });
  check('customer login is retired (410)', clog.status === 410, `status=${clog.status}`);
  const slot1 = await pickSlot(tenantId, serviceId);
  check('availability still returns a slot', !!slot1);
  const pubBook = await pub.req('POST', '/api/appointments', { tenantId, serviceId, employeeId: staffId, customerName: 'Guest', customerPhone: '33000001', startTime: slot1 });
  check('public booking is retired (410)', pubBook.status === 410, `status=${pubBook.status}`);
  const chatApi = await pub.req('POST', `/api/account/conversations/${tenantId}/messages`, { body: 'x' });
  check('web chat API is retired (410)', chatApi.status === 410, `status=${chatApi.status}`);
  const ownerStartChat = await owner.req('POST', '/api/dashboard/conversations', { customerId: '11111111-1111-1111-1111-111111111111' });
  check('owner-started web chat is retired (410)', ownerStartChat.status === 410, `status=${ownerStartChat.status}`);
  const inbox = await owner.req('GET', '/api/dashboard/conversations');
  check('owner inbox (WhatsApp) still works and is empty', inbox.status === 200 && Array.isArray(inbox.json?.data), `status=${inbox.status}`);
  const ru = await pub.req('GET', '/ar/account/register');
  check('/account/register page is 404', ru.status === 404, `status=${ru.status}`);
  const lu = await pub.req('GET', '/ar/account/login');
  check('/account/login redirects to the owner login', lu.status >= 300 && lu.status < 400 && /\/ar\/login/.test(lu.headers.get('location') || ''), `status=${lu.status} loc=${lu.headers.get('location')}`);
  const au = await pub.req('GET', '/ar/account');
  check('/account page is 404', au.status === 404, `status=${au.status}`);
  const unified = await pub.req('POST', '/api/auth/login', { email: `${TAG}-nobody@example.com`, password: PW });
  check('login with an unknown email is 401', unified.status === 401, `status=${unified.status}`);

  // ---------- 4. الحجز اليدوي من المالك ----------
  console.log('\n[4] Owner manual booking, conflicts and status');
  const cl = await owner.req('POST', '/api/dashboard/clients', { name: 'E2E client', phone: '33998877' });
  const clientId = cl.json?.data?.id;
  check('owner creates a client record', ok2xx(cl) && !!clientId, `status=${cl.status} ${cl.text.slice(0, 100)}`);
  const bk1 = await owner.req('POST', '/api/dashboard/bookings', { customerId: clientId, serviceId, employeeId: staffId, startTime: slot1 });
  const bookingId = bk1.json?.data?.id;
  check('owner creates a booking (201)', bk1.status === 201 && !!bookingId, `status=${bk1.status} ${bk1.text.slice(0, 120)}`);
  const dup = await owner.req('POST', '/api/dashboard/bookings', { customerId: clientId, serviceId, employeeId: staffId, startTime: slot1 });
  check('double-booking the same slot/staff is refused (409)', dup.status === 409, `status=${dup.status}`);
  const done = await owner.req('PATCH', `/api/dashboard/bookings/${bookingId}`, { status: 'COMPLETED' });
  check('owner completes the booking', ok2xx(done), `status=${done.status}`);
  const revert = await owner.req('PATCH', `/api/dashboard/bookings/${bookingId}`, { status: 'CONFIRMED' });
  check('COMPLETED is final: reverting is refused (409)', revert.status === 409, `status=${revert.status}`);
  const noAuth = await pub.req('GET', '/api/cron/appointment-reminders');
  check('reminder cron refuses without secret (401)', noAuth.status === 401, `status=${noAuth.status}`);
  if (CRON_SECRET) {
    const run = await pub.req('GET', '/api/cron/daily', undefined, { Authorization: `Bearer ${CRON_SECRET}` });
    check('daily cron runs with the secret', run.status === 200 && run.json?.success === true, `status=${run.status} ${run.text.slice(0, 120)}`);
  } else skip('daily cron end-to-end', 'CRON_SECRET not provided to the test');

  // ---------- 5. الجلسات ----------
  console.log('\n[5] Owner session revocation after password change');
  const own2 = new Client('owner-second-device');
  await own2.req('POST', '/api/auth/login', { email: ownerEmail, password: PW });
  check('owner second device works before change', (await own2.req('GET', '/api/dashboard/settings')).status === 200);
  const oc = await owner.req('POST', '/api/dashboard/change-password', { currentPassword: PW, newPassword: PW2 });
  check('owner changes password', ok2xx(oc), `status=${oc.status}`);
  check('owner current device stays logged in', (await owner.req('GET', '/api/dashboard/settings')).status === 200);
  check('owner other device is logged out (401)', (await own2.req('GET', '/api/dashboard/settings')).status === 401);

  // ---------- 6. موظف له حجوزات قادمة ----------
  console.log('\n[6] Staff deletion guard');
  const futureSlot = await pickSlot(tenantId, serviceId, { minHours: 2, maxHours: 24 * 5, skipN: 3 });
  const fb = futureSlot && (await owner.req('POST', '/api/dashboard/bookings', { customerId: clientId, serviceId, employeeId: staffId, startTime: futureSlot }));
  if (fb?.json?.data?.id) {
    const del = await owner.req('DELETE', `/api/dashboard/staff/${staffId}`);
    check('deleting staff with an upcoming booking is refused (409)', del.status === 409, `status=${del.status}`);
  } else skip('staff deletion guard', 'could not create an upcoming booking');

  // ---------- 7. لغة الأخطاء ----------
  console.log('\n[7] API error language follows the page');
  const en = await pub.req('POST', '/api/auth/login', {}, { Referer: `${BASE}/en/login` });
  const ar = await pub.req('POST', '/api/auth/login', {}, { Referer: `${BASE}/ar/login` });
  check('English page gets an English error', /required/i.test(en.json?.error || '') && !/[؀-ۿ]/.test(en.json?.error || ''), en.text.slice(0, 100));
  check('Arabic page gets an Arabic error', /[؀-ۿ]/.test(ar.json?.error || ''), ar.text.slice(0, 100));
  const retiredEn = await pub.req('POST', '/api/account/login', {}, { Referer: `${BASE}/en/login` });
  check('retired endpoints answer in English on English pages', /unavailable/i.test(retiredEn.json?.error || ''), retiredEn.text.slice(0, 100));

  // ---------- 8. الأدمن: الإخفاء ----------
  console.log('\n[8] Admin hide (cannot be undone by the owner)');
  const admin = new Client('admin');
  let adminOk = false;
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    adminOk = ok2xx(await admin.req('POST', '/api/admin/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }));
  } else {
    const r = await admin.req('POST', '/api/admin/register', { name: 'E2E Admin', email: `${TAG}-admin@example.com`, password: PW });
    adminOk = r.status === 201;
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
    const unhide = await admin.req('PATCH', `/api/admin/salons/${tenantId}`, { isPublished: true });
    check('admin unhides the salon', ok2xx(unhide) && (await pub.req('GET', '/api/salons')).text.includes(tenantId));
  }

  // ---------- تنظيف ----------
  console.log('\n[cleanup]');
  if (adminOk) {
    await admin.req('DELETE', `/api/admin/salons/${tenantId}`, { confirmName: `ZZ_E2E_${TAG}` });
    console.log('  test salon deleted');
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
