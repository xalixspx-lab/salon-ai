-- مهام تلقائية يوقفها الأدمن لكل صالون (reports | reminders | reviews)
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "automation_off" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
