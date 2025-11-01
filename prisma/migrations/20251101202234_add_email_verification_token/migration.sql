-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerificationToken" TEXT;

-- CreateIndex
CREATE INDEX "Business_siteId_idx" ON "Business"("siteId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
