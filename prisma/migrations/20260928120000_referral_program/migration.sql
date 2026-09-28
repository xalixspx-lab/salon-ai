BEGIN;
ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16);
ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS referred_by_account_id UUID;

-- كود إحالة مؤقت لأي صفوف موجودة مسبقًا قبل فرض NOT NULL/UNIQUE عليه
UPDATE customer_accounts
SET referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

ALTER TABLE customer_accounts ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customer_accounts_referral_code_key ON customer_accounts(referral_code);

ALTER TABLE customer_accounts
  ADD CONSTRAINT customer_accounts_referred_by_account_id_fkey
  FOREIGN KEY (referred_by_account_id) REFERENCES customer_accounts(id)
  ON DELETE SET NULL ON UPDATE NO ACTION;
COMMIT;
