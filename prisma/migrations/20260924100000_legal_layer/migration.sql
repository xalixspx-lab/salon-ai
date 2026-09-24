BEGIN;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS refund_percent_after_deadline INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS tenant_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agreement_version VARCHAR(20) NOT NULL,
  accepted_at TIMESTAMP(6) NOT NULL DEFAULT now(),
  accepted_by_user_id UUID,
  ip_address VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS tenant_agreements_tenant_id_agreement_version_idx ON tenant_agreements (tenant_id, agreement_version);

CREATE TABLE IF NOT EXISTS consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  consent_type VARCHAR(50) NOT NULL,
  granted BOOLEAN NOT NULL,
  version VARCHAR(20),
  ip_address VARCHAR(50),
  recorded_at TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consent_logs_account_id_consent_type_recorded_at_idx ON consent_logs (account_id, consent_type, recorded_at DESC);
COMMIT;
