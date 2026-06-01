/*
  Warnings:

  - You are about to drop the column `filledQty` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `initialMargin` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `market_id` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `orderType` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `qty` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `slippage` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Order` table. All the data in the column will be lost.
  - The `price` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `accountId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `marketId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT', 'STOP_LIMIT', 'STOP_MARKET');

-- CreateEnum
CREATE TYPE "PositionSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "MarginMode" AS ENUM ('CROSS', 'ISOLATED');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "filledQty",
DROP COLUMN "initialMargin",
DROP COLUMN "market_id",
DROP COLUMN "orderType",
DROP COLUMN "qty",
DROP COLUMN "slippage",
DROP COLUMN "user_id",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "clientOrderId" TEXT,
ADD COLUMN     "filledSize" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "marketId" TEXT NOT NULL,
ADD COLUMN     "postOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reduceOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "size" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "type" "OrderType" NOT NULL,
DROP COLUMN "price",
ADD COLUMN     "price" DECIMAL(65,30),
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL;

-- DropEnum
DROP TYPE "orderStatus";

-- DropEnum
DROP TYPE "orderType";

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "baseAsset" TEXT NOT NULL,
    "quoteAsset" TEXT NOT NULL,
    "tickSize" DECIMAL(65,30) NOT NULL,
    "lotSize" DECIMAL(65,30) NOT NULL,
    "maxLeverage" INTEGER NOT NULL,
    "maintenanceMargin" DECIMAL(65,30) NOT NULL,
    "initialMargin" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fundingInterval" INTEGER NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "side" "PositionSide" NOT NULL,
    "size" DECIMAL(65,30) NOT NULL,
    "entryPrice" DECIMAL(65,30) NOT NULL,
    "leverage" INTEGER NOT NULL,
    "marginMode" "MarginMode" NOT NULL,
    "unrealizedPnl" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "liquidationPx" DECIMAL(65,30),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
