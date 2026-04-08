-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "provider_profiles" ADD COLUMN     "status" "ProviderStatus" NOT NULL DEFAULT 'PENDING';
