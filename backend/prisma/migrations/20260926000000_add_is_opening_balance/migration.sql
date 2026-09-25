-- Flag opening-balance transactions explicitly instead of matching on description text
ALTER TABLE "transactions" ADD COLUMN "isOpeningBalance" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: rows created by WalletsService.create for a wallet's starting balance
UPDATE "transactions"
SET "isOpeningBalance" = true
WHERE "description" = 'Opening Balance'
  AND "type" = 'INCOME'
  AND "categoryId" IS NULL
  AND "walletId" IS NOT NULL;
