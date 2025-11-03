-- CreateTable
CREATE TABLE "PeerGroup" (
    "id" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "businessIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeerGroup_createdAt_idx" ON "PeerGroup"("createdAt");

-- CreateIndex
CREATE INDEX "Business_industry_idx" ON "Business"("industry");

-- CreateIndex
CREATE INDEX "Business_revenueRange_idx" ON "Business"("revenueRange");

-- CreateIndex
CREATE INDEX "Business_industry_revenueRange_idx" ON "Business"("industry", "revenueRange");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_peerGroupId_fkey" FOREIGN KEY ("peerGroupId") REFERENCES "PeerGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
