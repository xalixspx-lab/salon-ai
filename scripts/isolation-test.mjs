// اختبار عزل بيانات المستأجرين (PRD §5 و§6 — Tenant Isolation Test).
// يعمل عبر HTTP على خادم حي (محلي أو غيره) بحسابات وبيانات مؤقتة يحذفها في النهاية
// عند توفير بيانات أدمن. أي استجابة تكشف/تعدّل بيانات مستأجر آخر تُعد فشلًا.
//
// التشغيل:  BASE_URL=http://localhost:3000 node scripts/isolation-test.mjs
// للتنظيف: ADMIN_EMAIL=... ADMIN_PASSWORD=...  (اختياري)
import crypto from 'node:crypto';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TAG = `iso${Date.now().toString(36)}`;
const PASSWORD = 'IsoTest-Passw0rd!';

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? "  (" + detail + ")" : ""}`);
  } else {
    fail++;
    failures.push(`${name} ${detail}`);
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

class Client {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
  }
  async req(method, path, body, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    for (const sc of res.headers.getSetCookie?.() || []) {
      const [pair] = sc.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i);
      const v = pair.slice(i + 1);
      if (v === '' || /max-age=0/i.test(sc)) this.cookies.delete(k);
      else this.cookies.set(k, v);
    }
    let json = null;
    try {
      json = await res.clone().json();
    } catch {}
    return { status: res.status, json };
  }
}

// حالات الرفض المقبولة: لا 200/201 ولا كشف بيانات
const denied = (r) => [400, 401, 403, 404].includes(r.status);
const idsOf = (r) => JSON.stringify(r.json?.data ?? r.json ?? '');

async function registerSalon(label) {
  const c = new Client(label);
  const email = `${TAG}-${label}@example.com`;
  const r = await c.req('POST', '/api/salons', {
    name: `ZZ_ISO_${TAG}_${label}`,
    city: 'Manama',
    ownerName: `Owner ${label}`,
    email,
    password: PASSWORD,
    acceptTerms: true,
  });
  if (r.status !== 201) throw new Error(`register salon ${label} failed: ${r.status} ${JSON.stringify(r.json)}`);
  return { c, tenantId: r.json.data.id, email, name: `ZZ_ISO_${TAG}_${label}` };
}

async function registerCustomer(label) {
  const c = new Client(label);
  const email = `${TAG}-cust-${label}@example.com`;
  const r = await c.req('POST', '/api/account/register', { name: `Cust ${label}`, email, password: PASSWORD, acceptTerms: true });
  if (r.status !== 201) throw new Error(`register customer ${label} failed: ${r.status} ${JSON.stringify(r.json)}`);
  return { c, email };
}

async function seedSalon(s, label) {
  const svc = await s.c.req('POST', '/api/dashboard/services', { nameAr: `خدمة ${label}`, nameEn: `Service ${label}`, basePrice: 10, baseDurationMinutes: 30 });
  const staff = await s.c.req('POST', '/api/dashboard/staff', { name: `Staff ${label}`, role: 'Stylist', status: 'ACTIVE' });
  const client = await s.c.req('POST', '/api/dashboard/clients', { name: `Client ${label}`, phone: '33000000' });
  const offer = await s.c.req('POST', '/api/dashboard/offers', { type: 'PERCENTAGE', discountPercent: 10 });
  s.serviceId = svc.json?.data?.id;
  s.staffId = staff.json?.data?.id;
  s.clientId = client.json?.data?.id;
  s.offerId = offer.json?.data?.id; // قد يكون null إن كانت الباقة لا تسمح بالعروض
  if (!s.serviceId || !s.staffId || !s.clientId) {
    throw new Error(`seed ${label} failed: svc=${svc.status} staff=${staff.status} client=${client.status}`);
  }
}

async function pickSlot(tenantId, serviceId) {
  for (let d = 2; d < 6; d++) {
    const date = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
    const r = await new Client('pub').req('GET', `/api/salons/${tenantId}/availability?serviceId=${serviceId}&date=${date}`);
    const slots = r.json?.data?.slots;
    if (Array.isArray(slots) && slots.length) return slots[0];
  }
  throw new Error('no available slot found for the test booking');
}

async function main() {
  console.log(`Isolation test against ${BASE}  (tag ${TAG})\n`);

  const A = await registerSalon('A');
  const B = await registerSalon('B');
  await seedSalon(A, 'A');
  await seedSalon(B, 'B');

  // حجز عام في صالون B (ضيف)
  const slotB = await pickSlot(B.tenantId, B.serviceId);
  const guest = new Client('guest');
  const bookB = await guest.req('POST', '/api/appointments', {
    tenantId: B.tenantId, serviceId: B.serviceId, customerName: 'Guest B', customerPhone: '33111111', startTime: slotB,
  });
  B.bookingId = bookB.json?.data?.id;
  check('setup: guest booking created at salon B', bookB.status === 201 && !!B.bookingId, `status=${bookB.status} ${JSON.stringify(bookB.json)}`);

  console.log('\n[1] Owner A cannot read B\'s data through list endpoints');
  for (const [name, path, idB] of [
    ['services', '/api/dashboard/services', B.serviceId],
    ['staff', '/api/dashboard/staff', B.staffId],
    ['clients', '/api/dashboard/clients', B.clientId],
    ['offers', '/api/dashboard/offers', B.offerId],
    ['bookings', '/api/dashboard/bookings', B.bookingId],
  ]) {
    if (!idB) { console.log(`  SKIP  ${name} (no B id; feature gated by plan)`); continue; }
    const r = await A.c.req('GET', path);
    check(`A list ${name} does not contain B's record`, r.status === 200 && !idsOf(r).includes(idB));
  }
  const setA = await A.c.req('GET', '/api/dashboard/settings');
  check('A settings returns A only', setA.json?.data?.id === A.tenantId && !JSON.stringify(setA.json).includes(B.tenantId));
  const subA = await A.c.req('GET', '/api/dashboard/subscription');
  check('A subscription does not mention B', !JSON.stringify(subA.json).includes(B.tenantId));

  console.log('\n[2] Owner A cannot modify/delete B\'s records by id');
  const attempts = [
    ['PATCH service', 'PATCH', `/api/dashboard/services/${B.serviceId}`, { nameAr: 'اختراق', nameEn: 'hacked' }],
    ['DELETE service', 'DELETE', `/api/dashboard/services/${B.serviceId}`],
    ['PATCH staff', 'PATCH', `/api/dashboard/staff/${B.staffId}`, { name: 'hacked' }],
    ['DELETE staff', 'DELETE', `/api/dashboard/staff/${B.staffId}`],
    ['PATCH client', 'PATCH', `/api/dashboard/clients/${B.clientId}`, { name: 'hacked' }],
    ['DELETE client', 'DELETE', `/api/dashboard/clients/${B.clientId}`],
    ['PATCH booking', 'PATCH', `/api/dashboard/bookings/${B.bookingId}`, { status: 'CANCELLED' }],
  ];
  if (B.offerId) {
    attempts.push(['PATCH offer', 'PATCH', `/api/dashboard/offers/${B.offerId}`, { isActive: false }]);
    attempts.push(['DELETE offer', 'DELETE', `/api/dashboard/offers/${B.offerId}`]);
  }
  for (const [name, method, path, body] of attempts) {
    const r = await A.c.req(method, path, body);
    check(`A ${name} on B's record is refused`, denied(r), `status=${r.status}`);
  }

  console.log('\n[3] B\'s data is intact after the attack attempts');
  const svcB = await B.c.req('GET', '/api/dashboard/services');
  const stB = await B.c.req('GET', '/api/dashboard/staff');
  const clB = await B.c.req('GET', '/api/dashboard/clients');
  const bkB = await B.c.req('GET', '/api/dashboard/bookings');
  check('B service still exists and unchanged', idsOf(svcB).includes(B.serviceId) && !idsOf(svcB).includes('hacked'));
  check('B staff still exists and unchanged', idsOf(stB).includes(B.staffId) && !idsOf(stB).includes('hacked'));
  check('B client still exists and unchanged', idsOf(clB).includes(B.clientId) && !idsOf(clB).includes('hacked'));
  check('B booking not cancelled by A', /PENDING_DEPOSIT|CONFIRMED/.test(idsOf(bkB)) && !idsOf(bkB).includes('CANCELLED'));

  console.log('\n[4] Owner A cannot mix in B\'s ids when creating records');
  const mix1 = await A.c.req('POST', '/api/dashboard/bookings', { customerId: A.clientId, serviceId: B.serviceId, employeeId: A.staffId, startTime: slotB });
  check('A booking using B\'s service is refused', denied(mix1), `status=${mix1.status}`);
  const mix2 = await A.c.req('POST', '/api/dashboard/bookings', { customerId: B.clientId, serviceId: A.serviceId, employeeId: A.staffId, startTime: slotB });
  check('A booking for B\'s client is refused', denied(mix2), `status=${mix2.status}`);
  const mix3 = await A.c.req('POST', '/api/dashboard/bookings', { customerId: A.clientId, serviceId: A.serviceId, employeeId: B.staffId, startTime: slotB });
  check('A booking with B\'s staff is refused', denied(mix3), `status=${mix3.status}`);
  if (A.offerId !== undefined) {
    const mix4 = await A.c.req('POST', '/api/dashboard/offers', { type: 'PERCENTAGE', discountPercent: 5, appliesToServiceId: B.serviceId });
    check('A offer targeting B\'s service is refused', denied(mix4), `status=${mix4.status}`);
  }

  console.log('\n[5] Public endpoints do not cross tenants');
  const pub = new Client('pub');
  const cross1 = await pub.req('POST', '/api/appointments', { tenantId: A.tenantId, serviceId: B.serviceId, customerName: 'x', customerPhone: '1', startTime: slotB });
  check('public booking: tenant A + service of B is refused', denied(cross1), `status=${cross1.status}`);
  const cross2 = await pub.req('GET', `/api/salons/${A.tenantId}/availability?serviceId=${B.serviceId}&date=${slotB.slice(0, 10)}`);
  check('availability: tenant A + service of B is refused', denied(cross2), `status=${cross2.status}`);
  const cross3 = await pub.req('POST', '/api/appointments', { tenantId: A.tenantId, serviceId: A.serviceId, employeeId: B.staffId, customerName: 'x', customerPhone: '1', startTime: slotB });
  check('public booking with staff of another salon is refused', denied(cross3), `status=${cross3.status}`);
  const list = await pub.req('GET', '/api/salons');
  const listJson = JSON.stringify(list.json);
  check('public salon list hides plan/trial/owner fields', !/"plan"|trialEndsAt|passwordHash|"email"/.test(listJson));

  await A.c.req('PATCH', '/api/dashboard/settings', { isPublished: false });
  const unpub = await pub.req('GET', `/api/salons/${A.tenantId}/availability?serviceId=${A.serviceId}&date=${slotB.slice(0, 10)}`);
  check('unpublished salon is not bookable publicly', denied(unpub), `status=${unpub.status}`);
  const unpubBook = await pub.req('POST', '/api/appointments', { tenantId: A.tenantId, serviceId: A.serviceId, customerName: 'x', customerPhone: '1', startTime: slotB });
  check('unpublished salon rejects public booking', denied(unpubBook), `status=${unpubBook.status}`);

  console.log('\n[6] Customer accounts are isolated from each other');
  const C1 = await registerCustomer('1');
  const C2 = await registerCustomer('2');
  const slot2 = (await pickSlot(B.tenantId, B.serviceId)) === slotB ? slotB : slotB;
  const cb = await C1.c.req('POST', '/api/appointments', { tenantId: B.tenantId, serviceId: B.serviceId, startTime: slotB, employeeId: B.staffId });
  // قد يتعارض مع حجز الضيف على نفس الموظف؛ نبحث عن وقت آخر إن لزم
  let c1Booking = cb.json?.data?.id;
  if (!c1Booking) {
    const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const s2 = (await pub.req('GET', `/api/salons/${B.tenantId}/availability?serviceId=${B.serviceId}&date=${date}`)).json?.data?.slots?.[1];
    const cb2 = await C1.c.req('POST', '/api/appointments', { tenantId: B.tenantId, serviceId: B.serviceId, startTime: s2 || slot2 });
    c1Booking = cb2.json?.data?.id;
  }
  check('setup: customer 1 booking created', !!c1Booking);
  if (c1Booking) {
    const h1 = await C1.c.req('GET', '/api/account/history');
    const h2 = await C2.c.req('GET', '/api/account/history');
    check('customer 1 sees own booking in history', idsOf(h1).includes(c1Booking));
    check('customer 2 does not see customer 1\'s booking', !idsOf(h2).includes(c1Booking));
    const cx = await C2.c.req('POST', `/api/account/appointments/${c1Booking}/cancel`);
    check('customer 2 cannot cancel customer 1\'s booking', denied(cx), `status=${cx.status}`);
    const rs = await C2.c.req('POST', `/api/account/appointments/${c1Booking}/reschedule`, { startTime: slotB });
    check('customer 2 cannot reschedule customer 1\'s booking', denied(rs), `status=${rs.status}`);
    const rv = await C2.c.req('POST', '/api/account/reviews', { appointmentId: c1Booking, rating: 1, comment: 'x' });
    check('customer 2 cannot review customer 1\'s booking', denied(rv), `status=${rv.status}`);
    const ex2 = await C2.c.req('GET', '/api/account/export');
    check('customer 2 data export excludes customer 1', !JSON.stringify(ex2.json ?? '').includes(C1.email));
  }

  console.log('\n[7] Sessions of one audience do not work for another');
  const noCookie = new Client('none');
  for (const [name, r] of [
    ['no cookie -> dashboard', await noCookie.req('GET', '/api/dashboard/services')],
    ['no cookie -> account', await noCookie.req('GET', '/api/account/history')],
    ['no cookie -> admin', await noCookie.req('GET', '/api/admin/salons')],
    ['owner cookie -> admin', await A.c.req('GET', '/api/admin/salons')],
    ['owner cookie -> admin database', await A.c.req('GET', '/api/admin/database?model=services')],
    ['owner cookie -> account', await A.c.req('GET', '/api/account/history')],
    ['customer cookie -> dashboard', await C1.c.req('GET', '/api/dashboard/services')],
    ['customer cookie -> admin', await C1.c.req('GET', '/api/admin/customers')],
  ]) {
    check(name + ' is refused', r.status === 401 || r.status === 403, `status=${r.status}`);
  }

  console.log('\n[8] Forged or tampered session cookies are rejected');
  const forge = new Client('forge');
  forge.cookies.set('salon_session', 'garbage.not.jwt');
  check('garbage owner cookie rejected', (await forge.req('GET', '/api/dashboard/services')).status === 401);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ownerId: B.staffId, tenantId: B.tenantId, email: 'x@y.z' })}.`;
  forge.cookies.set('salon_session', unsigned);
  check('alg=none owner token rejected', (await forge.req('GET', '/api/dashboard/services')).status === 401);
  const wrongKey = (payload) => {
    const h = b64({ alg: 'HS256', typ: 'JWT' });
    const p = b64({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 });
    const sig = crypto.createHmac('sha256', 'attacker-guessed-secret').update(`${h}.${p}`).digest('base64url');
    return `${h}.${p}.${sig}`;
  };
  forge.cookies.set('salon_session', wrongKey({ ownerId: crypto.randomUUID(), tenantId: B.tenantId, email: 'x@y.z' }));
  check('owner token signed with a wrong secret rejected', (await forge.req('GET', '/api/dashboard/services')).status === 401);
  const forgeAdmin = new Client('forgeadmin');
  forgeAdmin.cookies.set('salon_admin_session', wrongKey({ adminId: crypto.randomUUID(), email: 'a@b.c' }));
  check('admin token signed with a wrong secret rejected', (await forgeAdmin.req('GET', '/api/admin/salons')).status === 401);

  // ---- تنظيف ----
  console.log('\n[cleanup]');
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const admin = new Client('admin');
    const login = await admin.req('POST', '/api/admin/login', { email: adminEmail, password: adminPassword });
    if (login.status === 200) {
      for (const s of [A, B]) await admin.req('DELETE', `/api/admin/salons/${s.tenantId}`, { confirmName: s.name });
      const cust = await admin.req('GET', `/api/admin/customers?q=${TAG}`);
      for (const row of cust.json?.data ?? []) await admin.req('DELETE', `/api/admin/customers/${row.id}`, { confirmEmail: row.email });
      console.log('  test salons and customers deleted');
    } else {
      console.log(`  admin login failed (${login.status}); delete manually: tag ${TAG}`);
    }
  } else {
    console.log(`  no ADMIN_EMAIL/ADMIN_PASSWORD; delete test data manually (name/email contains ${TAG})`);
  }

  console.log(`\nResult: ${pass} passed, ${fail} failed`);
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
