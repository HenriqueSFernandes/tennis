/*
  Warnings:

  - Added the required column `time` to the `booking_cache` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "booking_cache" ADD COLUMN     "time" TEXT NOT NULL;
