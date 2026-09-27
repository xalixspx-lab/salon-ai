# ملاحظة تسليم بين الجهازين

آخر تحديث: 2026-09-27. تُقرأ عند بدء العمل من جهاز آخر. كل الكود مدفوع إلى `origin/main` ولا يوجد عمل غير محفوظ.

## أين وصلنا

**الموقع الحي** (`salon-ai.co`) يعمل على Vercel + Prisma Postgres + Supabase Storage + Redis + Resend + Sentry، ولم يتغير شيء فيه في هذه الجلسة الأخيرة عدا نشر كود جاهز ومعطَّل بالمفتاح.

مبني ومدفوع في الجولات الأخيرة: لوحة أدمن كاملة، نقاط الولاء وتصنيف العملاء، الصالونات المميزة، رسائل الحجز، الحماية من الروبوتات (honeypot + Turnstile غير مفعّل)، **الطبقة القانونية** (وثائق للعميل ولصاحب الصالون وموافقات مسجّلة وحقوق البيانات)، **اختبار عزل المستأجرين** (50 فحصًا) وCI يشغّله، وخطة الأمان في `docs/SECURITY_PLAN.md`.

## المهمة المفتوحة: نقل القاعدة إلى Supabase (مومباي) لتفعيل RLS

السبب: قاعدة Prisma Postgres تتصل بدور superuser يتجاوز RLS. الخطوات في `docs/security/RLS_CUTOVER.md`.

- **القرار (2026-09-27):** مشروع Supabase جديد في **مومباي** (`hyvczmqajvetveqjxvfz`، اسمه salon-ai1) مع نقل دوال Vercel إلى `bom1`. مشروع سيول (`jnuqncvgmbcfmrcyguwv`) يبقى نحو أسبوع كاحتياط ثم يُحذف بعد نجاح التحويل.
- **جاهز ومُختبَر على مومباي:** المخطط + 18 هجرة، RLS على 21/21 جدولًا، صلاحيات anon/authenticated = 0، دور `salon_app` (لا superuser ولا BYPASSRLS)، نسخة مطابقة من بيانات الإنتاج، bucket `salon-media` (رفع/قراءة/حذف ناجح)، واختبار RLS التكاملي عبر الـpooler بالمنفذين 5432 و6543، واختبار العزل 50/50 مع `TENANT_RLS=on`. بيانات الاختبار حُذفت.
- **لم يُنفَّذ:** التحويل الحي. يحتاج تأكيد المالك: إعادة نسخ أخيرة (`copy-db.mjs --wipe`)، ثم في Vercel Production: `DATABASE_URL` (رابط salon_app عبر pooler المنفذ 6543 مع `pgbouncer=true&connection_limit=1`، المضيف `aws-0-ap-south-1.pooler.supabase.com`)، `DIRECT_URL` (رابط المشرف)، `TENANT_RLS=on`، `SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` للمشروع الجديد، وإضافة `"regions": ["bom1"]` إلى `vercel.json` (لم تُضَف بعد عمدًا كي لا تُنشر الدوال في مومباي قبل نقل القاعدة)، ثم إعادة النشر والتحقق.
- **الرجوع:** أعد `DATABASE_URL`/`DIRECT_URL` القديمين، أزل `TENANT_RLS`، وأعد النشر. قاعدة Prisma Postgres لا تُعدَّل.
- **مفتوح:** هل مشروع Supabase على الخطة المجانية؟ (تتوقف بعد أسبوع خمول ولا نسخ يومية؛ يُنصح بـPro لموقع إنتاج). وموقع Redis (تحديد المعدّل) غالبًا في واشنطن ويُراجع.

## ما لا ينتقل عبر git (يُنسخ يدويًا بأمان)

ملف `.env` المحلي غير مرفوع. مفاتيحه (الأسماء فقط): `DATABASE_URL` (Postgres محلي للتطوير)، `PROD_DATABASE_URL`، `PROD_DIRECT_URL`، `QA_SUPABASE_URL`، `QA_SUPABASE_SERVICE_ROLE_KEY`، `QA_RESEND_API_KEY`، `SESSION_SECRET`، `SUPA_DB_ADMIN_URL`، `SUPA_APP_PASSWORD`. انسخه بوسيلة آمنة (لا بريد ولا محادثة). ومفاتيح مومباي: `MUM_SUPABASE_URL`، `MUM_DB_ADMIN_URL`، `MUM_SUPABASE_SERVICE_ROLE_KEY`، `MUM_APP_PASSWORD`.

على الجهاز الجديد أيضًا: Node.js وGit، `npm install`، تسجيل دخول GitHub، و`vercel login`، وPostgres محلي للتطوير إن لزم. وثيقة PRD الأصلية (`وثيقة_المواصفات_الفنية_PRD_V3.docx`) في مجلد التنزيلات وليست في المستودع.

## بند مؤجل بقرار المالك

**وكيل الذكاء الاصطناعي (واتساب + 8 لغات) مؤجل.** لا يُبدأ إلا بطلبه.

## بنود أخرى تنتظر المالك

مراجعة قانونية للوثائق في `/legal` (مسودات)، مفاتيح Cloudflare Turnstile المجانية، تأكيد النسخ الاحتياطي لدى المزوّد وتمرين استعادة، تدوير المفاتيح التي لُصقت في المحادثات سابقًا (Supabase `service_role`، Prisma Postgres، Resend)، بوابة دفع حقيقية (تمنع الإطلاق العام)، وSMS-OTP (يحتاج مزوّدًا مدفوعًا). القائمة الكاملة في القسم 7 من `docs/SECURITY_PLAN.md`.

## تنبيهات تشغيلية تعلّمناها

- `pkill` غير موجود في Git Bash على Windows؛ أوقف خادمًا بـ PowerShell (`Get-NetTCPConnection -LocalPort N | Stop-Process`)، وتأكد أن المنفذ فارغ قبل أي اختبار وإلا تُختبَر نسخة قديمة دون أن تعلم.
- لا تضع نصًا فيه backticks داخل `node -e "..."` بين علامتي اقتباس مزدوجتين في bash (تُنفَّذ كأوامر). استعمل ملفًا.
- كلمة سر قاعدة Supabase منفصلة عن تسجيل الدخول عبر GitHub، وتُكتب أبجدية رقمية لتفادي ترميز الرابط.
- قبل أي عمل: `git pull` تلقائيًا (قاعدة `CLAUDE.md`)، وأي تعديل على قاعدة الإنتاج الحية يتطلب تأكيد المالك أولًا.
