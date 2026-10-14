-- CreateEnum
CREATE TYPE "RecipeVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "recipe_versions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "RecipeVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "expectedBakeLossPercent" DECIMAL(7,4) NOT NULL,
    "notes" VARCHAR(1000),
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipe_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "bakerPercentage" DECIMAL(9,4) NOT NULL,
    "isFlourBase" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_versions_productId_status_idx" ON "recipe_versions"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_versions_productId_versionNumber_key" ON "recipe_versions"("productId", "versionNumber");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredientId_idx" ON "recipe_ingredients"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeVersionId_ingredientId_key" ON "recipe_ingredients"("recipeVersionId", "ingredientId");

-- AddForeignKey
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
