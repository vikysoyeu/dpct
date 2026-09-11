DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionMethod') THEN
    CREATE TYPE "TransactionMethod" AS ENUM ('BANK_TRANSFER', 'CASH');
  END IF;
END $$;

ALTER TABLE "FundTransaction"
  ADD COLUMN IF NOT EXISTS "method" "TransactionMethod" NOT NULL DEFAULT 'BANK_TRANSFER';
