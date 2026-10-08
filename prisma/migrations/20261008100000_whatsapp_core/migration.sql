BEGIN;

-- رقم واتساب مربوط بصالون
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number_id  VARCHAR(64) NOT NULL UNIQUE,
  waba_id          VARCHAR(64),
  display_phone    VARCHAR(32),
  status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  access_token_enc TEXT,
  created_at       TIMESTAMP(6) NOT NULL DEFAULT now()
);

-- جهات اتصال واتساب (هوية العميل = رقمه)
CREATE TABLE IF NOT EXISTS contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone            VARCHAR(32) NOT NULL,
  name             VARCHAR(255),
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  last_inbound_at  TIMESTAMP(6),
  created_at       TIMESTAMP(6) NOT NULL DEFAULT now(),
  CONSTRAINT contacts_tenant_id_phone_key UNIQUE (tenant_id, phone)
);

-- المحادثات: تدعم الآن جهة اتصال واتساب إلى جانب حساب العميل القديم
ALTER TABLE conversations ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMP(6);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NOT NULL DEFAULT 'HUMAN';
CREATE UNIQUE INDEX IF NOT EXISTS conversations_tenant_id_contact_id_key ON conversations (tenant_id, contact_id);

-- الرسائل: بيانات واتساب وحالة التسليم
ALTER TABLE messages ADD COLUMN IF NOT EXISTS wa_message_id VARCHAR(128);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction VARCHAR(10);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS msg_type VARCHAR(20) NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_id VARCHAR(255);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS error TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS messages_wa_message_id_key ON messages (wa_message_id);

-- عزل RLS للجدولين الجديدين (نفس نمط بقية جداول المستأجر؛ راجع scripts/rls-setup.mjs)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'salon_app') THEN
    ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON whatsapp_accounts;
    CREATE POLICY tenant_isolation ON whatsapp_accounts TO salon_app
      USING (NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

    ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON contacts;
    CREATE POLICY tenant_isolation ON contacts TO salon_app
      USING (NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;

COMMIT;
