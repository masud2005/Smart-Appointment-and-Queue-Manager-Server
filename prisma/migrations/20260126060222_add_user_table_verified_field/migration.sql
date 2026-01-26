/*
  Warnings:

  - You are about to drop the column `notes` on the `appointments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
