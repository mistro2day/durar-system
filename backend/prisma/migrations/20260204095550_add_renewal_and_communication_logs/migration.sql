-- CreateEnum
CREATE TYPE "RenewalStatus" AS ENUM ('PENDING', 'RENEWED', 'NOT_RENEWING');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "renewalStatus" "RenewalStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedBy" TEXT,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_CommunicationLog_tenantId" ON "CommunicationLog"("tenantId");

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
