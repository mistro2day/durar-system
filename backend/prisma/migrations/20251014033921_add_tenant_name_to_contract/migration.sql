/*
  Warnings:

  - Added the required column `amount` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rentalType` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantName` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Contract" DROP CONSTRAINT "Contract_tenantId_fkey";

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rentalType" TEXT NOT NULL,
ADD COLUMN     "tenantName" TEXT NOT NULL,
ALTER COLUMN "tenantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
