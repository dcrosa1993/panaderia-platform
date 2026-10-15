-- CreateEnum
CREATE TYPE "EstimationMode" AS ENUM ('PRODUCT_COUNT', 'FLOUR_QUANTITY');

-- CreateTable
CREATE TABLE "Estimation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "mode" "EstimationMode" NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "productProductionUnitCodeSnapshot" TEXT NOT NULL,
    "recipeVersionNumber" INTEGER NOT NULL,
    "plannedProductCount" INTEGER,
    "targetFinishedWeightInput" DECIMAL(20,8),
    "targetFinishedWeightUnitCode" TEXT,
    "targetFinishedWeightUnitName" TEXT,
    "targetFinishedWeightUnitSymbol" TEXT,
    "targetFinishedWeightUnitFactorToBase" DECIMAL(20,8),
    "flourQuantity" DECIMAL(20,8),
    "flourUnitCode" TEXT,
    "flourUnitName" TEXT,
    "flourUnitSymbol" TEXT,
    "flourUnitFactorToBase" DECIMAL(20,8),
    "expectedBakeLossPercent" DECIMAL(7,4) NOT NULL,
    "recipeTotalPercentage" DECIMAL(12,6) NOT NULL,
    "flourMassGrams" DECIMAL(20,8) NOT NULL,
    "rawDoughMassGrams" DECIMAL(20,8) NOT NULL,
    "expectedFinishedMassGrams" DECIMAL(20,8) NOT NULL,
    "targetFinishedWeightPerUnitGrams" DECIMAL(20,8),
    "theoreticalProductCount" DECIMAL(20,8),
    "wholeProductCount" INTEGER,
    "costingComplete" BOOLEAN NOT NULL,
    "estimatedIngredientCost" DECIMAL(20,8),
    "knownIngredientCostSubtotal" DECIMAL(20,8) NOT NULL,
    "missingPriceIngredientNames" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Estimation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimationIngredient" (
    "id" TEXT NOT NULL,
    "estimationId" TEXT NOT NULL,
    "sourceIngredientId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "bakerPercentage" DECIMAL(12,6) NOT NULL,
    "isFlourBase" BOOLEAN NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "baseUnitCode" TEXT NOT NULL,
    "baseUnitName" TEXT NOT NULL,
    "baseUnitSymbol" TEXT NOT NULL,
    "baseUnitDimension" TEXT NOT NULL,
    "baseUnitFactorToBase" DECIMAL(20,8) NOT NULL,
    "densityGramsPerMl" DECIMAL(20,8),
    "ingredientMassGrams" DECIMAL(20,8) NOT NULL,
    "ingredientVolumeMl" DECIMAL(20,8),
    "quantityInBaseUnit" DECIMAL(20,8) NOT NULL,
    "purchaseQuantity" DECIMAL(20,8),
    "purchaseUnitCode" TEXT,
    "purchaseUnitName" TEXT,
    "purchaseUnitSymbol" TEXT,
    "purchaseUnitDimension" TEXT,
    "purchaseUnitFactorToBase" DECIMAL(20,8),
    "purchaseTotalPrice" DECIMAL(20,8),
    "estimatedCost" DECIMAL(20,8),

    CONSTRAINT "EstimationIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Estimation_businessId_createdAt_idx" ON "Estimation"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Estimation_productId_createdAt_idx" ON "Estimation"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "Estimation_recipeVersionId_idx" ON "Estimation"("recipeVersionId");

-- CreateIndex
CREATE INDEX "Estimation_createdByUserId_idx" ON "Estimation"("createdByUserId");

-- CreateIndex
CREATE INDEX "EstimationIngredient_estimationId_sortOrder_idx" ON "EstimationIngredient"("estimationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationIngredient" ADD CONSTRAINT "EstimationIngredient_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
