-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('NEW', 'PLANNED', 'IMPLEMENTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problemStatement" TEXT NOT NULL,
    "actionSteps" TEXT[],
    "expectedImpact" TEXT NOT NULL,
    "confidenceLevel" "ConfidenceLevel" NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'NEW',
    "impactLevel" "ImpactLevel" NOT NULL,
    "peerSuccessData" TEXT,
    "implementedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recommendation_businessId_status_idx" ON "Recommendation"("businessId", "status");

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
