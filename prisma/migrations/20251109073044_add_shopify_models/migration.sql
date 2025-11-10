-- CreateTable
CREATE TABLE "ShopifyStore" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scriptTagId" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMP(3),

    CONSTRAINT "ShopifyStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyOrder" (
    "id" TEXT NOT NULL,
    "shopifyStoreId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "orderData" JSONB NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyStore_businessId_key" ON "ShopifyStore"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyStore_shopDomain_key" ON "ShopifyStore"("shopDomain");

-- CreateIndex
CREATE INDEX "ShopifyStore_businessId_idx" ON "ShopifyStore"("businessId");

-- CreateIndex
CREATE INDEX "ShopifyStore_shopDomain_idx" ON "ShopifyStore"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyOrder_shopifyOrderId_key" ON "ShopifyOrder"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "ShopifyOrder_shopifyStoreId_idx" ON "ShopifyOrder"("shopifyStoreId");

-- CreateIndex
CREATE INDEX "ShopifyOrder_shopifyOrderId_idx" ON "ShopifyOrder"("shopifyOrderId");

-- AddForeignKey
ALTER TABLE "ShopifyStore" ADD CONSTRAINT "ShopifyStore_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyOrder" ADD CONSTRAINT "ShopifyOrder_shopifyStoreId_fkey" FOREIGN KEY ("shopifyStoreId") REFERENCES "ShopifyStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
