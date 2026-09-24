import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from '@/lib/sentryScrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
  // لا نرسل شيئًا إذا لم يُضبط DSN بعد (مثل بيئة التطوير المحلية بدون فيرسل)
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});
