BEGIN;

CREATE TABLE IF NOT EXISTS conversations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id               UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  last_message_at          TIMESTAMP(6) NOT NULL DEFAULT now(),
  last_read_by_owner_at    TIMESTAMP(6),
  last_read_by_customer_at TIMESTAMP(6),
  created_at               TIMESTAMP(6) NOT NULL DEFAULT now(),
  CONSTRAINT conversations_tenant_id_account_id_key UNIQUE (tenant_id, account_id)
);
CREATE INDEX IF NOT EXISTS conversations_tenant_id_last_message_at_idx ON conversations (tenant_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  sender_role     VARCHAR(20) NOT NULL,
  body            TEXT NOT NULL,
  created_at      TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx ON messages (conversation_id, created_at);

-- عزل RLS على مستوى القاعدة، بنفس نمط بقية جداول المستأجر (راجع scripts/rls-setup.mjs
-- وdocs/security/RLS_CUTOVER.md) — الجدولان جديدان فلا يغطيهما تشغيل السكربت السابق تلقائيًا
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'salon_app') THEN
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON conversations;
    CREATE POLICY tenant_isolation ON conversations TO salon_app
      USING (NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON messages;
    CREATE POLICY tenant_isolation ON messages TO salon_app
      USING (NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (NULLIF(current_setting('app.tenant_id', true), '') IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;

COMMIT;
