-- CreateTable
CREATE TABLE "Pattern" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" DOUBLE PRECISION NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pattern_siteId_detectedAt_idx" ON "Pattern"("siteId", "detectedAt");

-- CreateIndex
CREATE INDEX "Pattern_siteId_severity_idx" ON "Pattern"("siteId", "severity");
