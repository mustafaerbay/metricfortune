-- AddColumn: email notification preferences to User model (Story 2.7)
ALTER TABLE "User" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "emailDigestFrequency" TEXT NOT NULL DEFAULT 'weekly';
ALTER TABLE "User" ADD COLUMN "emailUnsubscribeToken" TEXT;
ALTER TABLE "User" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "User" ADD COLUMN "lastDigestSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailUnsubscribeToken_key" ON "User"("emailUnsubscribeToken");
CREATE INDEX "User_emailUnsubscribeToken_idx" ON "User"("emailUnsubscribeToken");

-- Backfill: generate unsubscribe tokens for existing users
UPDATE "User" SET "emailUnsubscribeToken" = gen_random_uuid()::text WHERE "emailUnsubscribeToken" IS NULL;
