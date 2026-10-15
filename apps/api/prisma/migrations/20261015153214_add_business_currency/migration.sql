-- AlterTable
ALTER TABLE "Estimation" ADD COLUMN     "currencyCodeSnapshot" VARCHAR(3) NOT NULL DEFAULT 'CUP';

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'CUP';
