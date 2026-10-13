-- CreateEnum
CREATE TYPE "MeasurementDimension" AS ENUM ('MASS', 'VOLUME', 'COUNT');

-- CreateTable
CREATE TABLE "measurement_units" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "symbol" VARCHAR(12) NOT NULL,
    "dimension" "MeasurementDimension" NOT NULL,
    "factorToBase" DECIMAL(20,8) NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "measurement_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "normalizedName" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "baseUnitId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_prices" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "purchaseQuantity" DECIMAL(18,6) NOT NULL,
    "purchaseUnitId" TEXT NOT NULL,
    "totalPrice" DECIMAL(18,4) NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "measurement_units_code_key" ON "measurement_units"("code");

-- CreateIndex
CREATE INDEX "measurement_units_dimension_isActive_idx" ON "measurement_units"("dimension", "isActive");

-- CreateIndex
CREATE INDEX "ingredients_businessId_isActive_idx" ON "ingredients"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_businessId_normalizedName_key" ON "ingredients"("businessId", "normalizedName");

-- CreateIndex
CREATE INDEX "ingredient_prices_ingredientId_effectiveFrom_idx" ON "ingredient_prices"("ingredientId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_prices" ADD CONSTRAINT "ingredient_prices_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_prices" ADD CONSTRAINT "ingredient_prices_purchaseUnitId_fkey" FOREIGN KEY ("purchaseUnitId") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
