// اختبار أنبوب واتساب بالكامل عبر HTTP مع خادم Meta وهمي محلي (لا اتصال بـMeta الحقيقية).
// يجب تشغيل الخادم بهذه المتغيرات:
//   WHATSAPP_APP_SECRET=wa-test-secret WHATSAPP_VERIFY_TOKEN=wa-verify
//   WHATSAPP_API_BASE=http://127.0.0.1:4010 WHATSAPP_ACCESS_TOKEN=system-token
//   WHATSAPP_TOKEN_ENC_KEY=<32 bytes base64>
// التشغيل: BASE_URL=http://localhost:3100 ADMIN_EMAIL=.. ADMIN_PASSWORD=.. node scripts/wa-e2e-test.mjs
import crypto from 'node:crypto';
import http from 'node:http';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const SECRET = process.env.WHATSAPP_APP_SECRET || 'wa-test-secret';
const VERIFY = process.env.WHATSAPP_VERIFY_TOKEN || 'wa-verify';
const MOCK_PORT = Number(process.env.MOCK_PORT || 4010);
const TAG = `wa${Date.now().toString(36)}`;
const PW = 'Wa-Passw0rd!';

let pass = 0;
let fail = 0;
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

class Client {
  cookies = new Map();
  async req(method, path, body, headers = {}, raw) {
    const h = { ...headers };
    if (body !== undefined && raw === undefined) h['Content-Type'] = 'application/json';
    if (this.cookies.size) h.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(BASE + path, { method, headers: h, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)), redirect: 'manual' });
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
    return { status: res.status, json, text };
  }
}

// ---- خادم Meta وهمي ----
const sent = []; // طلبات الإرسال التي وصلته
let mockMode = 'ok'; // ok | window | token
let seq = 0;
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    sent.push({ url: req.url, auth: req.headers.authorization, body: body ? JSON.parse(body) : null });
    res.setHeader('Content-Type', 'application/json');
    if (mockMode === 'window') {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: { code: 131047, message: 'Re-engagement message' } }));
    }
    if (mockMode === 'token') {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: { code: 190, message: 'Invalid OAuth access token' } }));
    }
    res.end(JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: `wamid.MOCK${TAG}${++seq}` }] }));
  });
});
await new Promise((r) => mock.listen(MOCK_PORT, '127.0.0.1', r));

const sign = (raw) => 'sha256=' + crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
const rnd = () => String(Math.floor(1e11 + Math.random() * 9e11));
const nowSec = () => Math.floor(Date.now() / 1000);

const inboundPayload = (pnid, from, id, text, { name = null, ts = nowSec(), type = 'text', extra = {} } = {}) => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WABA',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '97336000000', phone_number_id: pnid },
            ...(name ? { contacts: [{ profile: { name }, wa_id: from }] } : {}),
            messages: [{ from, id, timestamp: String(ts), type, ...(type === 'text' ? { text: { body: text } } : {}), ...extra }],
          },
        },
      ],
    },
  ],
});
const statusPayload = (pnid, id, status, ts = nowSec()) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: 'WABA', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: pnid }, statuses: [{ id, status, timestamp: String(ts), recipient_id: '1' }] } }] }],
});

const pub = new Client();
const post = (payload, { signed = true, badSig = false } = {}) => {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return pub.req('POST', '/api/whatsapp/webhook', undefined, { 'Content-Type': 'application/json', ...(signed ? { 'X-Hub-Signature-256': badSig ? sign(raw + 'x') : sign(raw) } : {}) }, raw);
};

async function main() {
  console.log(`WhatsApp E2E against ${BASE} (tag ${TAG}), mock Meta on :${MOCK_PORT}\n`);

  // ---------- إعداد ----------
  const admin = new Client();
  let adminOk = false;
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    adminOk = (await admin.req('POST', '/api/admin/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).status === 200;
  }
  if (!adminOk) throw new Error('ADMIN_EMAIL/ADMIN_PASSWORD required to link WhatsApp numbers');

  const mkSalon = async (label) => {
    const c = new Client();
    const email = `${TAG}-${label}@example.com`;
    const r = await c.req('POST', '/api/salons', { name: `ZZ_WA_${TAG}_${label}`, city: 'Manama', ownerName: label, email, password: PW, acceptTerms: true });
    return { c, id: r.json?.data?.id, name: `ZZ_WA_${TAG}_${label}`, pnid: rnd() };
  };
  const A = await mkSalon('A');
  const B = await mkSalon('B');
  check('two salons created', !!A.id && !!B.id);

  console.log('\n[1] Admin links numbers');
  const linkA = await admin.req('PUT', `/api/admin/salons/${A.id}/whatsapp`, { phoneNumberId: A.pnid, wabaId: rnd(), displayPhone: '+973 3600 0000' });
  const linkB = await admin.req('PUT', `/api/admin/salons/${B.id}/whatsapp`, { phoneNumberId: B.pnid, displayPhone: '+973 3611 1111', accessToken: 'salon-b-own-token' });
  check('salon A linked (no token, uses system token)', linkA.status === 200 && linkA.json?.data?.hasToken === false, linkA.text.slice(0, 120));
  check('salon B linked with its own token; token never echoed', linkB.status === 200 && linkB.json?.data?.hasToken === true && !linkB.text.includes('salon-b-own-token'), linkB.text.slice(0, 120));
  const dup = await admin.req('PUT', `/api/admin/salons/${B.id}/whatsapp`, { phoneNumberId: A.pnid });
  check('a number cannot be linked to two salons (409)', dup.status === 409, `status=${dup.status}`);
  const badId = await admin.req('PUT', `/api/admin/salons/${B.id}/whatsapp`, { phoneNumberId: 'abc' });
  check('invalid phone number id rejected (400)', badId.status === 400);
  const ownerCantLink = await A.c.req('PUT', `/api/admin/salons/${A.id}/whatsapp`, { phoneNumberId: rnd() });
  check('an owner cannot use the admin link endpoint', ownerCantLink.status === 401 || ownerCantLink.status === 403, `status=${ownerCantLink.status}`);
  const waA = await A.c.req('GET', '/api/dashboard/whatsapp');
  check('owner sees connected status and display number', waA.json?.data?.connected === true && waA.json?.data?.displayPhone === '+973 3600 0000');

  console.log('\n[2] Webhook verification and authentication');
  const v1 = await pub.req('GET', `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=12345`);
  const v2 = await pub.req('GET', `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`);
  check('GET challenge returned for the right verify token', v1.status === 200 && v1.text === '12345');
  check('GET with a wrong token is refused (403)', v2.status === 403);
  const unsigned = await post(inboundPayload(A.pnid, '97333000111', `wamid.U${TAG}`, 'x'), { signed: false });
  const badsig = await post(inboundPayload(A.pnid, '97333000111', `wamid.V${TAG}`, 'x'), { badSig: true });
  const badjson = await post('{not json');
  check('unsigned POST is refused (401)', unsigned.status === 401, `status=${unsigned.status}`);
  check('POST with a wrong signature is refused (401)', badsig.status === 401, `status=${badsig.status}`);
  check('malformed JSON (even if unsigned) is refused', badjson.status === 401 || badjson.status === 400);
  const inbox0 = await A.c.req('GET', '/api/dashboard/conversations');
  check('refused requests stored nothing', (inbox0.json?.data || []).length === 0);

  console.log('\n[3] Inbound messages');
  // سجل CRM موجود بصيغة محلية مختلفة عن صيغة واتساب: يجب أن يُطابَق لا أن يتكرر
  await A.c.req('POST', '/api/dashboard/clients', { name: 'نورة (سجل قديم)', phone: '33123456' });
  const custPhone = '97333123456';
  const m1 = await post(inboundPayload(A.pnid, custPhone, `wamid.M1${TAG}`, 'السلام عليكم، كم سعر القص؟', { name: 'نورة' }));
  check('inbound webhook accepted (200)', m1.status === 200, `status=${m1.status} ${m1.text.slice(0, 100)}`);
  const list1 = await A.c.req('GET', '/api/dashboard/conversations');
  const conv = list1.json?.data?.[0];
  check('conversation appears for the owner as WhatsApp with 1 unread', list1.json?.data?.length === 1 && conv?.channel === 'whatsapp' && conv?.unreadCount === 1, list1.text.slice(0, 200));
  check('contact name and phone come from WhatsApp', conv?.customerName === 'نورة' && conv?.phone === custPhone);
  check('reply window is open', conv?.windowOpen === true);
  const clients = await A.c.req('GET', '/api/dashboard/clients');
  check('existing CRM client matched by last 8 digits (no duplicate)', (clients.json?.data || []).filter((c) => c.name.includes('نورة')).length === 1, clients.text.slice(0, 200));

  const dupM = await post(inboundPayload(A.pnid, custPhone, `wamid.M1${TAG}`, 'السلام عليكم، كم سعر القص؟', { name: 'نورة' }));
  const th1 = await A.c.req('GET', `/api/dashboard/conversations/${conv.id}/messages`);
  check('redelivery of the same message id is idempotent', dupM.status === 200 && th1.json?.data?.length === 1, `len=${th1.json?.data?.length}`);

  const voice = await post(inboundPayload(A.pnid, custPhone, `wamid.M2${TAG}`, '', { type: 'audio', extra: { audio: { id: 'MEDIA1', mime_type: 'audio/ogg' } } }));
  const th2 = await A.c.req('GET', `/api/dashboard/conversations/${conv.id}/messages`);
  check('voice note stored with a placeholder', voice.status === 200 && th2.json?.data?.some((m) => m.msgType === 'audio' && /صوتية/.test(m.body)));

  const unknown = await post(inboundPayload(rnd(), '97333999888', `wamid.UNK${TAG}`, 'who am i'));
  check('message to an unlinked number is ignored (200, nothing stored)', unknown.status === 200 && (await A.c.req('GET', '/api/dashboard/conversations')).json?.data?.length === 1);

  console.log('\n[4] Owner reply goes out through Meta');
  const before = sent.length;
  const reply = await A.c.req('POST', `/api/dashboard/conversations/${conv.id}/messages`, { body: 'أهلًا نورة، القص بـ 5 دنانير' });
  check('reply accepted (201) with status "sent"', reply.status === 201 && reply.json?.data?.status === 'sent', `status=${reply.status} ${reply.text.slice(0, 120)}`);
  const out = sent[sent.length - 1];
  check('exactly one request reached the mock Meta API', sent.length === before + 1);
  check('request targets the salon phone_number_id, right recipient and text', out?.url?.includes(`/${A.pnid}/messages`) && out?.body?.to === custPhone && out?.body?.text?.body === 'أهلًا نورة، القص بـ 5 دنانير');
  check('salon A (no own token) used the system token', out?.auth === 'Bearer system-token', out?.auth);

  console.log('\n[5] Delivery statuses');
  const wamid = reply.json?.data?.waMessageId ?? `wamid.MOCK${TAG}${seq}`;
  await post(statusPayload(A.pnid, wamid, 'delivered'));
  let th = await A.c.req('GET', `/api/dashboard/conversations/${conv.id}/messages`);
  check('status moves to delivered', th.json?.data?.find((m) => m.senderRole === 'OWNER')?.status === 'delivered');
  await post(statusPayload(A.pnid, wamid, 'read'));
  await post(statusPayload(A.pnid, wamid, 'delivered'));
  th = await A.c.req('GET', `/api/dashboard/conversations/${conv.id}/messages`);
  check('read is never downgraded by a late "delivered"', th.json?.data?.find((m) => m.senderRole === 'OWNER')?.status === 'read');

  console.log('\n[6] 24-hour window and Meta errors');
  const oldTs = nowSec() - 30 * 3600;
  await post(inboundPayload(A.pnid, '97333555000', `wamid.OLD${TAG}`, 'رسالة قديمة', { name: 'قديم', ts: oldTs }));
  const list2 = await A.c.req('GET', '/api/dashboard/conversations');
  const oldConv = list2.json?.data?.find((c) => c.phone === '97333555000');
  check('conversation older than 24h reports a closed window', oldConv && oldConv.windowOpen === false);
  const beforeOld = sent.length;
  const closed = await A.c.req('POST', `/api/dashboard/conversations/${oldConv.id}/messages`, { body: 'متأخر' });
  check('free-form reply is refused (409 WINDOW_CLOSED) and nothing is sent', closed.status === 409 && closed.json?.code === 'WINDOW_CLOSED' && sent.length === beforeOld, `status=${closed.status} sent+${sent.length - beforeOld}`);

  mockMode = 'token';
  const tokErr = await A.c.req('POST', `/api/dashboard/conversations/${conv.id}/messages`, { body: 'x' });
  check('invalid Meta token surfaces as 502 TOKEN_INVALID and stores nothing', tokErr.status === 502 && tokErr.json?.code === 'TOKEN_INVALID');
  mockMode = 'window';
  const winErr = await A.c.req('POST', `/api/dashboard/conversations/${conv.id}/messages`, { body: 'x' });
  check('Meta re-engagement error maps to WINDOW_CLOSED', winErr.status === 409 && winErr.json?.code === 'WINDOW_CLOSED');
  mockMode = 'ok';
  const th3 = await A.c.req('GET', `/api/dashboard/conversations/${conv.id}/messages`);
  check('failed sends left no ghost messages', th3.json?.data?.filter((m) => m.senderRole === 'OWNER').length === 1);

  console.log('\n[7] Tenant isolation');
  await post(inboundPayload(B.pnid, '97333777000', `wamid.B1${TAG}`, 'رسالة لصالون B', { name: 'عميلة B' }));
  const listA = await A.c.req('GET', '/api/dashboard/conversations');
  const listB = await B.c.req('GET', '/api/dashboard/conversations');
  check("salon A does not see salon B's contact", !listA.text.includes('عميلة B') && !listA.text.includes('97333777000'));
  check('salon B sees only its own message', listB.json?.data?.length === 1 && listB.json?.data?.[0]?.phone === '97333777000');
  const convB = listB.json.data[0];
  check("owner A cannot read B's thread (404)", (await A.c.req('GET', `/api/dashboard/conversations/${convB.id}/messages`)).status === 404);
  check("owner A cannot reply into B's conversation (404)", (await A.c.req('POST', `/api/dashboard/conversations/${convB.id}/messages`, { body: 'hijack' })).status === 404);
  const bBefore = sent.length;
  const bReply = await B.c.req('POST', `/api/dashboard/conversations/${convB.id}/messages`, { body: 'رد من B' });
  check("salon B's reply uses B's own decrypted token and number id", bReply.status === 201 && sent[sent.length - 1]?.auth === 'Bearer salon-b-own-token' && sent[sent.length - 1]?.url.includes(`/${B.pnid}/`) && sent.length === bBefore + 1, sent[sent.length - 1]?.auth);

  console.log('\n[8] Read state');
  await A.c.req('POST', `/api/dashboard/conversations/${conv.id}/read`);
  const listR = await A.c.req('GET', '/api/dashboard/conversations');
  check('unread count cleared after reading', listR.json?.data?.find((c) => c.id === conv.id)?.unreadCount === 0);

  console.log('\n[9] Outbound templates: appointment reminders and win-back (WhatsApp, to the customer number)');
  if (!process.env.CRON_SECRET) {
    console.log('  SKIP  template jobs (CRON_SECRET not provided)');
  } else {
    const cron = () => pub.req('GET', '/api/cron/daily', undefined, { Authorization: `Bearer ${process.env.CRON_SECRET}` });
    const tplSent = () => sent.filter((x) => x.body?.type === 'template');
    const hours = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), { open: '00:00', close: '23:30' }]));
    await A.c.req('PATCH', '/api/dashboard/settings', { workingHours: hours, minBookingNoticeHours: 0 });
    const svc = await A.c.req('POST', '/api/dashboard/services', { nameAr: 'خدمة', nameEn: 'Svc', basePrice: 5, baseDurationMinutes: 30 });
    const staff = await A.c.req('POST', '/api/dashboard/staff', { name: 'Staff', role: 'Stylist', status: 'ACTIVE' });
    const serviceId = svc.json?.data?.id;
    const staffId = staff.json?.data?.id;
    const mkClient = async (name, phone) => (await A.c.req('POST', '/api/dashboard/clients', { name, phone })).json?.data?.id;
    const book = (customerId, whenMs) => A.c.req('POST', '/api/dashboard/bookings', { customerId, serviceId, employeeId: staffId, startTime: new Date(whenMs).toISOString() });
    const HOUR = 3600 * 1000;

    // --- تذكير الموعد ---
    const rPhone = '97333555111';
    const rClient = await mkClient('عميلة التذكير', '33555111');
    const rBook = await book(rClient, Date.now() + 24 * HOUR);
    check('setup: reminder booking created', rBook.status === 201, `status=${rBook.status} ${rBook.text.slice(0, 100)}`);
    const t0 = tplSent().length;
    const run1 = await cron();
    check('daily cron succeeds', run1.status === 200 && run1.json?.success === true, `status=${run1.status}`);
    const rTpl = tplSent().slice(t0).filter((x) => x.body.to === rPhone);
    check('reminder sent as an approved template to the customer number', rTpl.length === 1 && rTpl[0].body.template.name === 'appointment_reminder' && rTpl[0].body.template.language.code === 'ar', String(JSON.stringify(rTpl[0]?.body ?? null)).slice(0, 200) + ' sentTotal=' + sent.length + ' tpl=' + tplSent().length);
    const params = rTpl[0]?.body?.template?.components?.[0]?.parameters?.map((p) => p.text) ?? [];
    check('template params: customer name, salon name, appointment time', params[0] === 'عميلة التذكير' && params[1] === A.name && !!params[2], JSON.stringify(params));
    check('reminder used the salon\'s own number id and token', rTpl[0]?.url.includes(`/${A.pnid}/`) && rTpl[0]?.auth === 'Bearer system-token', `${rTpl[0]?.url} ${rTpl[0]?.auth}`);
    await cron();
    check('reminder is idempotent (second run sends nothing more)', tplSent().slice(t0).filter((x) => x.body.to === rPhone).length === 1);
    const thread = await A.c.req('GET', '/api/dashboard/conversations');
    const rConv = (thread.json?.data || []).find((c) => c.phone === rPhone);
    check('the reminder is visible in the owner inbox', !!rConv && (await A.c.req('GET', `/api/dashboard/conversations/${rConv.id}/messages`)).text.includes('تذكير بموعدك'));

    // مفتاح الأدمن لهذا الصالون
    const offRes = await admin.req('POST', `/api/admin/salons/${A.id}/automations`, { key: 'reminders', enabled: false });
    check('admin turns reminders off for salon A', offRes.status === 200);
    const r2Phone = '97333555222';
    const r2Client = await mkClient('عميلة ثانية', '33555222');
    await book(r2Client, Date.now() + 25 * HOUR);
    const t1 = tplSent().length;
    await cron();
    check('no reminder while the salon switch is off', tplSent().slice(t1).filter((x) => x.body.to === r2Phone).length === 0);
    await admin.req('POST', `/api/admin/salons/${A.id}/automations`, { key: 'reminders', enabled: true });
    await cron();
    check('reminder goes out once the switch is back on', tplSent().slice(t1).filter((x) => x.body.to === r2Phone).length === 1);

    // salon without a linked WhatsApp number sends nothing
    const noWa = await mkSalon('C');
    const noWaSvc = await noWa.c.req('POST', '/api/dashboard/services', { nameAr: 'خ', nameEn: 'S', basePrice: 1, baseDurationMinutes: 30 });
    const noWaClient = (await noWa.c.req('POST', '/api/dashboard/clients', { name: 'x', phone: '33555999' })).json?.data?.id;
    await noWa.c.req('PATCH', '/api/dashboard/settings', { workingHours: hours });
    await noWa.c.req('POST', '/api/dashboard/bookings', { customerId: noWaClient, serviceId: noWaSvc.json?.data?.id, startTime: new Date(Date.now() + 24 * HOUR).toISOString() });
    const t2 = tplSent().length;
    await cron();
    check('a salon without a linked WhatsApp number sends nothing', tplSent().slice(t2).filter((x) => x.body.to === '97333555999').length === 0);
    await admin.req('DELETE', `/api/admin/salons/${noWa.id}`, { confirmName: noWa.name });

    // --- اشتقنا لك ---
    const settings = (await admin.req('GET', '/api/admin/settings')).json?.data;
    const setWinBack = (v) => admin.req('PUT', '/api/admin/settings', { ...settings, automations: { ...settings.automations, winBack: v } });
    check('win-back is OFF by default (marketing needs an explicit admin decision)', settings?.automations?.winBack === false, JSON.stringify(settings?.automations));
    const wPhone = '97333666111';
    const wClient = await mkClient('عميلة غائبة', '33666111');
    const wBook = await book(wClient, Date.now() - 60 * 24 * HOUR);
    check('setup: old booking created', wBook.status === 201, `status=${wBook.status} ${wBook.text.slice(0, 100)}`);
    if (wBook.json?.data?.id) await A.c.req('PATCH', `/api/dashboard/bookings/${wBook.json.data.id}`, { status: 'COMPLETED' });
    await post(inboundPayload(A.pnid, wPhone, `wamid.W${TAG}`, 'مرحبا', { name: 'عميلة غائبة' })); // دليل موافقة: راسلت الصالون
    const noInboundClient = await mkClient('لم تراسل أبدًا', '33666222');
    const nb = await book(noInboundClient, Date.now() - 61 * 24 * HOUR);
    if (nb.json?.data?.id) await A.c.req('PATCH', `/api/dashboard/bookings/${nb.json.data.id}`, { status: 'COMPLETED' });

    const t3 = tplSent().length;
    await cron();
    check('win-back sends nothing while the platform switch is OFF', tplSent().slice(t3).filter((x) => x.body.template?.name === 'we_miss_you').length === 0);
    check('admin enables win-back', (await setWinBack(true)).status === 200);
    await cron();
    const wTpl = tplSent().slice(t3).filter((x) => x.body.template?.name === 'we_miss_you');
    check('win-back goes to the lapsed customer who had messaged the salon', wTpl.length === 1 && wTpl[0].body.to === wPhone, JSON.stringify(wTpl.map((x) => x.body.to)));
    check('no win-back to a lapsed customer who never messaged the salon (no consent evidence)', !wTpl.some((x) => x.body.to === '97333666222'));
    await cron();
    check('win-back is sent once per period (idempotent)', tplSent().slice(t3).filter((x) => x.body.template?.name === 'we_miss_you').length === 1);
    await setWinBack(false);
  }

  console.log('\n[cleanup]');
  for (const s of [A, B]) await admin.req('DELETE', `/api/admin/salons/${s.id}`, { confirmName: s.name });
  console.log('  test salons deleted');

  console.log(`\nResult: ${pass} passed, ${fail} failed`);
  mock.close();
  if (fail) {
    console.log('\nFailures:');
    for (const f of failures) console.log(' - ' + f);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('\nTEST ERROR:', e.message);
  mock.close();
  process.exit(2);
});
