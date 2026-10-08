# إعداد واتساب (Meta Cloud API) لمنصة Salon AI

## المتغيرات المطلوبة (تُضاف في Vercel وفي `.env` المحلي — لا تُلصق قيمها في أي محادثة)
| الاسم | المصدر | الغرض |
|---|---|---|
| `WHATSAPP_APP_SECRET` | تطبيقك في Meta ← Settings ← Basic ← App secret | التحقق من توقيع كل طلب Webhook |
| `WHATSAPP_VERIFY_TOKEN` | تختار أنت نصًا عشوائيًا طويلًا | يطابقه Meta عند تسجيل الـWebhook |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp ← API Setup (رمز مؤقت للاختبار) | رمز النظام لأرقام الاختبار حين لا يحمل الصالون رمزًا خاصًا |
| `WHATSAPP_TOKEN_ENC_KEY` | 32 بايت عشوائية بصيغة base64 (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) | تشفير رموز الصالونات في قاعدة البيانات |
| `WHATSAPP_API_VERSION` (اختياري) | مثل `v21.0` | نسخة Graph API |
| `WHATSAPP_API_BASE` (اختبارات فقط) | `http://127.0.0.1:4010` | توجيه الإرسال إلى خادم Meta الوهمي |

## تسجيل الـWebhook في Meta
1. تطبيقك ← WhatsApp ← Configuration ← Webhook ← Edit.
2. Callback URL: `https://salon-ai.co/api/whatsapp/webhook`
3. Verify token: نفس قيمة `WHATSAPP_VERIFY_TOKEN`.
4. بعد النجاح اشترك في الحقل **messages** (يشمل الرسائل الواردة وحالات التسليم).

## ربط رقم صالون
من لوحة الإدارة ← الصالونات ← تعديل صالون ← «ربط واتساب»: أدخل Phone number ID (من WhatsApp ← API Setup) واختياريًا WABA ID والرقم المعروض والرمز.

## الاختبار
- وحدات: `npx vitest run tests/whatsappCore.test.ts`
- شامل مع خادم Meta وهمي: شغّل الخادم بالمتغيرات أعلاه ثم `npm run test:wa` (يحتاج ADMIN_EMAIL / ADMIN_PASSWORD).
