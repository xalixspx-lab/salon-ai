BEGIN;

CREATE TABLE IF NOT EXISTS report_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope        VARCHAR(10) NOT NULL,
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  admin_id     UUID,
  report_type  VARCHAR(30) NOT NULL,
  frequency    VARCHAR(10) NOT NULL,
  day_of_week  INTEGER,
  day_of_month INTEGER,
  locale       VARCHAR(5) NOT NULL DEFAULT 'ar',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  last_run_at  TIMESTAMP(6),
  last_error   TEXT,
  created_at   TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_schedules_is_active_scope_idx ON report_schedules (is_active, scope);

-- عزل RLS: صفوف المالك مقيدة بـ tenant_id؛ صفوف المشرف (tenant_id فارغ) لا يراها أي مالك
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'salon_app') THEN
    ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON report_schedules;
    CREATE POLICY tenant_isolation ON report_schedules TO salon_app
      USING (NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;

COMMIT;
