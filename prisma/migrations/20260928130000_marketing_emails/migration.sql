BEGIN;
ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS last_marketing_email_at TIMESTAMP(6);
COMMIT;
