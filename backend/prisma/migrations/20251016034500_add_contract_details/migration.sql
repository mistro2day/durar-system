-- AlterTable
ALTER TABLE "Contract"
  ADD COLUMN "ejarContractNumber" TEXT,
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "paymentFrequency" TEXT,
  ADD COLUMN "servicesIncluded" TEXT,
  ADD COLUMN "notes" TEXT;
