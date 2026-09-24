# نقل قاعدة البيانات إلى Supabase وتفعيل RLS

الهدف: أن تحجب قاعدة البيانات نفسها بيانات صالون عن صالون آخر حتى لو أخطأ كود التطبيق. سبب النقل أن قاعدة Prisma Postgres الحالية تتصل بدور superuser يتجاوز RLS.

الجاهز والمُختبَر محليًا بدور غير superuser: `scripts/rls-setup.mjs` (دور التطبيق + السياسات)، `scripts/copy-db.mjs` (نسخ مع مطابقة أعداد الصفوف)، `lib/prisma.ts` + `lib/tenantScope.ts` (تقييد مسارات المالك)، و`tests/rls.integration.test.ts` مع `scripts/isolation-test.mjs` (50 فحصًا) يعملان في CI بهذا الدور.

## كيف يعمل
- دور `salon_app` بلا `BYPASSRLS`، وله `app.bypass='on'` افتراضيًا على مستوى الدور: المسارات العامة (السوق، التسجيل، الأدمن) تعمل كما هي.
- كل مسار مالك مغلَّف بـ `withTenantScope`. عند `TENANT_RLS=on` تُنفَّذ عملياته في معاملة تضبط `app.bypass='off'` و`app.tenant_id`، فتقتصر السياسات على صفوف صالونه.
- بدون `TENANT_RLS=on` لا يتغير شيء (لذلك يمكن نشر الكود قبل النقل).
- حدود: صفحات لوحة المالك المولَّدة على الخادم (`app/[locale]/dashboard/*/page.tsx` و`layout.tsx`) وحجز `createAppointmentGuarded` (معاملة Serializable) تعمل بمسار `bypass`، وتعتمد على شروط `tenantId` في كودها كما كانت.

## الخطوات
1. **[منك]** أضف إلى `.env` المحلي سطرًا واحدًا (لا تلصقه في المحادثة):
   `SUPA_DB_ADMIN_URL="postgresql://postgres.<project-ref>:<DB-password>@aws-0-<region>.pooler.supabase.com:5432/postgres"`
   من Supabase → Connect → Session pooler (منفذ 5432). إن نسيت كلمة السر: Project Settings → Database → Reset password.
2. تجهيز المخطط في Supabase: `DATABASE_URL=<admin> DIRECT_URL=<admin> npx prisma db push --skip-generate`، ثم `prisma migrate resolve --applied` لكل مجلد في `prisma/migrations`.
3. إنشاء دور التطبيق والسياسات: `ADMIN_URL=<admin> APP_PASSWORD=<عشوائية> node scripts/rls-setup.mjs`.
4. نسخ البيانات: `SOURCE_URL=<PROD_DATABASE_URL> TARGET_URL=<admin> node scripts/copy-db.mjs --wipe` والتأكد من "All tables match".
5. تحقق على النسخة الجديدة قبل التحويل: `RLS_TEST_URL=<salon_app url> npx vitest run tests/rls.integration.test.ts`، ثم تشغيل التطبيق محليًا بها مع `TENANT_RLS=on` و`npm run test:isolation`.
6. **التحويل (يحتاج تأكيدك وقت التنفيذ):** إعادة نسخ أخيرة (`--wipe`) لالتقاط أي كتابة حدثت بعد الخطوة 4، ثم في Vercel (Production): `DATABASE_URL` = رابط `salon_app` عبر Supavisor (منفذ 6543 مع `?pgbouncer=true`)، `DIRECT_URL` = رابط المشرف (للهجرات)، `TENANT_RLS=on`، ثم إعادة النشر.
7. تحقق بعد التحويل: `/api/health`، دخول أدمن ومالك وعميل، حجز تجريبي.
8. **الرجوع:** أعد `DATABASE_URL`/`DIRECT_URL` القديمين وأزل `TENANT_RLS` وأعد النشر. قاعدة Prisma Postgres القديمة تبقى كما هي دون تعديل حتى تقرر حذفها.

## ملاحظات Supabase
- كل الجداول تُنشأ في `public` وSupabase يعرضها افتراضيًا عبر REST بمفتاح `anon`. السكربت يفعّل RLS على كل جدول ويسحب صلاحيات `anon` و`authenticated`، فلا يرى مفتاح `anon` شيئًا. تحقق منه بعد التنفيذ بطلب REST إلى أحد الجداول بمفتاح `anon` (يجب أن يرجع فارغًا أو خطأ).
- اسم المستخدم عبر Supavisor هو `salon_app.<project-ref>`.
- تخزين الصور (Storage) على نفس المشروع ولا يتأثر.
