-- CreateTable
CREATE TABLE "PreCadastro" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreCadastro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreCadastro_companyId_category_idx" ON "PreCadastro"("companyId", "category");

-- AddForeignKey
ALTER TABLE "PreCadastro" ADD CONSTRAINT "PreCadastro_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
