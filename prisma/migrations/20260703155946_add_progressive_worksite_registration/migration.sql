-- CreateEnum
CREATE TYPE "WorksiteRegistrationMode" AS ENUM ('SIMPLE', 'COMPLETE');

-- AlterTable
ALTER TABLE "Worksite" ADD COLUMN     "contractType" VARCHAR(100),
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "hasTaskList" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrationMode" "WorksiteRegistrationMode" NOT NULL DEFAULT 'SIMPLE',
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "cep" DROP NOT NULL,
ALTER COLUMN "responsibleName" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WorksiteGroup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorksiteGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorksiteGroup_companyId_idx" ON "WorksiteGroup"("companyId");

-- CreateIndex
CREATE INDEX "Worksite_companyId_isProfileComplete_idx" ON "Worksite"("companyId", "isProfileComplete");

-- AddForeignKey
ALTER TABLE "WorksiteGroup" ADD CONSTRAINT "WorksiteGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worksite" ADD CONSTRAINT "Worksite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "WorksiteGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
