-- Additive marker for marketplace demo rows.
-- IF NOT EXISTS so this stays safe after `prisma db push` already added the columns.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Kitchen" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "User_isDemo_idx" ON "User"("isDemo");
CREATE INDEX IF NOT EXISTS "Kitchen_isDemo_idx" ON "Kitchen"("isDemo");
CREATE INDEX IF NOT EXISTS "MenuItem_isDemo_idx" ON "MenuItem"("isDemo");
