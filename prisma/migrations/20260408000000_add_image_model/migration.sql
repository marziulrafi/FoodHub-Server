-- Database migration for Image model
-- Created by: prisma migrate dev --name add_image_model
-- Generated at: 2026-04-08

-- CreateTable
CREATE TABLE IF NOT EXISTS "images" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for unique publicId
CREATE UNIQUE INDEX "images_publicId_key" ON "images"("publicId");

-- CreateIndex for userId
CREATE INDEX "images_userId_idx" ON "images"("userId");

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
