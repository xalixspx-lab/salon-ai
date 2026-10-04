BEGIN;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP(6);
ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP(6);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP(6);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_hidden_at TIMESTAMP(6);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS blocked_by_customer_at TIMESTAMP(6);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP(6);
COMMIT;
