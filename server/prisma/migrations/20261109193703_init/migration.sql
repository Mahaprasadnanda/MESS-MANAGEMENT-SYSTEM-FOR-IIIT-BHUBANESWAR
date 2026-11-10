-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'MESS');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "studentId" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyBooking" (
    "id" TEXT NOT NULL,
    "bookingCode" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "breakfastCount" INTEGER NOT NULL DEFAULT 0,
    "lunchCount" INTEGER NOT NULL DEFAULT 0,
    "dinnerCount" INTEGER NOT NULL DEFAULT 0,
    "totalMeals" INTEGER NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "bookingStatus" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealBooking" (
    "id" TEXT NOT NULL,
    "weeklyBookingId" TEXT NOT NULL,
    "mealDate" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "weeklyBookingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "transactionId" TEXT,
    "razorpaySignature" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "weeklyBookingId" TEXT NOT NULL,
    "mealBookingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mealDate" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "qrPayload" TEXT NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "redeemedAt" TIMESTAMP(3),
    "redeemedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_studentId_idx" ON "User"("studentId");

-- CreateIndex
CREATE INDEX "Menu_date_idx" ON "Menu"("date");

-- CreateIndex
CREATE INDEX "Menu_date_mealType_idx" ON "Menu"("date", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_date_mealType_key" ON "Menu"("date", "mealType");

-- CreateIndex
CREATE INDEX "MenuItem_menuId_idx" ON "MenuItem"("menuId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyBooking_bookingCode_key" ON "WeeklyBooking"("bookingCode");

-- CreateIndex
CREATE INDEX "WeeklyBooking_studentId_idx" ON "WeeklyBooking"("studentId");

-- CreateIndex
CREATE INDEX "WeeklyBooking_weekStartDate_idx" ON "WeeklyBooking"("weekStartDate");

-- CreateIndex
CREATE INDEX "WeeklyBooking_bookingStatus_paymentStatus_idx" ON "WeeklyBooking"("bookingStatus", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyBooking_studentId_weekStartDate_key" ON "WeeklyBooking"("studentId", "weekStartDate");

-- CreateIndex
CREATE INDEX "MealBooking_mealDate_mealType_idx" ON "MealBooking"("mealDate", "mealType");

-- CreateIndex
CREATE INDEX "MealBooking_weeklyBookingId_idx" ON "MealBooking"("weeklyBookingId");

-- CreateIndex
CREATE UNIQUE INDEX "MealBooking_weeklyBookingId_mealDate_mealType_key" ON "MealBooking"("weeklyBookingId", "mealDate", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");

-- CreateIndex
CREATE INDEX "Payment_weeklyBookingId_idx" ON "Payment"("weeklyBookingId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_couponCode_key" ON "Coupon"("couponCode");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_mealBookingId_key" ON "Coupon"("mealBookingId");

-- CreateIndex
CREATE INDEX "Coupon_studentId_mealDate_idx" ON "Coupon"("studentId", "mealDate");

-- CreateIndex
CREATE INDEX "Coupon_mealDate_mealType_status_idx" ON "Coupon"("mealDate", "mealType", "status");

-- CreateIndex
CREATE INDEX "Coupon_status_idx" ON "Coupon"("status");

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyBooking" ADD CONSTRAINT "WeeklyBooking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealBooking" ADD CONSTRAINT "MealBooking_weeklyBookingId_fkey" FOREIGN KEY ("weeklyBookingId") REFERENCES "WeeklyBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_weeklyBookingId_fkey" FOREIGN KEY ("weeklyBookingId") REFERENCES "WeeklyBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_weeklyBookingId_fkey" FOREIGN KEY ("weeklyBookingId") REFERENCES "WeeklyBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_mealBookingId_fkey" FOREIGN KEY ("mealBookingId") REFERENCES "MealBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
