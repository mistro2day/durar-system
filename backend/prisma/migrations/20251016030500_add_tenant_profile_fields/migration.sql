-- AlterTable
ALTER TABLE "Tenant"
  ADD COLUMN "nationalId" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "nationality" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "employer" TEXT,
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_nationalId_key" ON "Tenant"("nationalId");
