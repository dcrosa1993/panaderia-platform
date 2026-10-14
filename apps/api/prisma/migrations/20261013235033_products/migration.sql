-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "normalizedName" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "productionUnitId" TEXT NOT NULL,
    "targetFinishedWeight" DECIMAL(18,6),
    "targetWeightUnitId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_businessId_isActive_idx" ON "products"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "products_businessId_normalizedName_key" ON "products"("businessId", "normalizedName");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_productionUnitId_fkey" FOREIGN KEY ("productionUnitId") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_targetWeightUnitId_fkey" FOREIGN KEY ("targetWeightUnitId") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
