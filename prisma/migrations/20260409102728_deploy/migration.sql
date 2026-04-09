/*
  Warnings:

  - A unique constraint covering the columns `[orderId,mealId]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "reviews_customerId_mealId_key";

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reviews_orderId_mealId_key" ON "reviews"("orderId", "mealId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
