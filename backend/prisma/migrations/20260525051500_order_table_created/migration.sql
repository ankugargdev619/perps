-- CreateEnum
CREATE TYPE "orderStatus" AS ENUM ('Filled', 'PartiallyFilled', 'Cancelled', 'Open');

-- CreateEnum
CREATE TYPE "side" AS ENUM ('Bid', 'Ask');

-- CreateEnum
CREATE TYPE "orderType" AS ENUM ('Market', 'Limit');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "orderType" "orderType" NOT NULL,
    "side" "side" NOT NULL,
    "price" TEXT NOT NULL,
    "slippage" INTEGER NOT NULL,
    "qty" TEXT NOT NULL,
    "initialMargin" TEXT NOT NULL,
    "status" "orderStatus" NOT NULL,
    "filledQty" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
