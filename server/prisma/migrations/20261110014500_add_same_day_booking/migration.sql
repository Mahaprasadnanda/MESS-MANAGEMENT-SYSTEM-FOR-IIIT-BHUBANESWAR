-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('WEEKLY', 'SAME_DAY');

-- DropIndex
DROP INDEX "WeeklyBooking_studentId_weekStartDate_key";

-- AlterTable
ALTER TABLE "WeeklyBooking" ADD COLUMN     "bookingType" "BookingType" NOT NULL DEFAULT 'WEEKLY',
ADD COLUMN     "sameDayDate" DATE,
ADD COLUMN     "weeklySlotKey" TEXT;

-- Backfill unique weeklySlotKey for existing WEEKLY bookings before creating unique index
UPDATE "WeeklyBooking"
SET "weeklySlotKey" = "studentId" || '|' || TO_CHAR("weekStartDate", 'YYYY-MM-DD')
WHERE "bookingType" = 'WEEKLY' AND "weeklySlotKey" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyBooking_weeklySlotKey_key" ON "WeeklyBooking"("weeklySlotKey");

-- CreateIndex
CREATE INDEX "WeeklyBooking_bookingType_sameDayDate_idx" ON "WeeklyBooking"("bookingType", "sameDayDate");
