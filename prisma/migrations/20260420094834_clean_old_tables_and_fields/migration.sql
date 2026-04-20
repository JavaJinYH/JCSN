/*
  Warnings:

  - You are about to drop the `CustomerFavoriteProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerPhone` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sale` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaleItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalePhoto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaleSlip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaleSlipItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SettlementAdjustment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `phones` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `DeliveryRecord` table. All the data in the column will be lost.
  - You are about to drop the column `saleId` on the `DeliveryRecord` table. All the data in the column will be lost.
  - You are about to drop the column `pickerName` on the `SaleOrder` table. All the data in the column will be lost.
  - You are about to drop the column `pickerPhone` on the `SaleOrder` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `PurchasePhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SaleOrderPhoto` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CustomerFavoriteProduct_customerId_productId_key";

-- DropIndex
DROP INDEX "CustomerPhone_customerId_phone_key";

-- DropIndex
DROP INDEX "CustomerPhone_customerId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CustomerFavoriteProduct";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CustomerPhone";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Payment";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Project";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Sale";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SaleItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SalePhoto";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SaleSlip";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SaleSlipItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SettlementAdjustment";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryPhone" TEXT,
    "address" TEXT,
    "remark" TEXT,
    "contactType" TEXT NOT NULL DEFAULT 'customer',
    "valueScore" REAL,
    "autoTag" TEXT,
    "manualTag" TEXT,
    "creditLimit" REAL NOT NULL DEFAULT 0,
    "creditUsed" REAL NOT NULL DEFAULT 0,
    "creditLevel" TEXT NOT NULL DEFAULT 'normal',
    "lastCreditReviewDate" DATETIME,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "blacklist" BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" TEXT,
    "customerCategoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_customerCategoryId_fkey" FOREIGN KEY ("customerCategoryId") REFERENCES "CustomerCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("address", "autoTag", "blacklist", "blacklistReason", "code", "contactType", "createdAt", "creditLevel", "creditLimit", "creditUsed", "customerCategoryId", "id", "lastCreditReviewDate", "manualTag", "name", "primaryPhone", "remark", "riskLevel", "updatedAt", "valueScore") SELECT "address", "autoTag", "blacklist", "blacklistReason", "code", "contactType", "createdAt", "creditLevel", "creditLimit", "creditUsed", "customerCategoryId", "id", "lastCreditReviewDate", "manualTag", "name", "primaryPhone", "remark", "riskLevel", "updatedAt", "valueScore" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE UNIQUE INDEX "Contact_code_key" ON "Contact"("code");
CREATE TABLE "new_DeliveryRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleOrderId" TEXT,
    "zoneName" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "distance" REAL NOT NULL DEFAULT 0,
    "weight" REAL NOT NULL DEFAULT 0,
    "baseFee" REAL NOT NULL DEFAULT 0,
    "distanceFee" REAL NOT NULL DEFAULT 0,
    "weightFee" REAL NOT NULL DEFAULT 0,
    "totalFee" REAL NOT NULL DEFAULT 0,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'pending',
    "deliveryDate" DATETIME,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryRecord_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryRecord" ("baseFee", "createdAt", "deliveryAddress", "deliveryDate", "deliveryStatus", "distance", "distanceFee", "driverName", "driverPhone", "id", "recipientName", "recipientPhone", "remark", "saleOrderId", "totalFee", "updatedAt", "weight", "weightFee", "zoneName") SELECT "baseFee", "createdAt", "deliveryAddress", "deliveryDate", "deliveryStatus", "distance", "distanceFee", "driverName", "driverPhone", "id", "recipientName", "recipientPhone", "remark", "saleOrderId", "totalFee", "updatedAt", "weight", "weightFee", "zoneName" FROM "DeliveryRecord";
DROP TABLE "DeliveryRecord";
ALTER TABLE "new_DeliveryRecord" RENAME TO "DeliveryRecord";
CREATE TABLE "new_PurchasePhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "photoPath" TEXT NOT NULL,
    "photoType" TEXT NOT NULL DEFAULT 'delivery',
    "photoRemark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchasePhoto_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PurchasePhoto" ("createdAt", "id", "photoPath", "photoRemark", "photoType", "purchaseId") SELECT "createdAt", "id", "photoPath", "photoRemark", "photoType", "purchaseId" FROM "PurchasePhoto";
DROP TABLE "PurchasePhoto";
ALTER TABLE "new_PurchasePhoto" RENAME TO "PurchasePhoto";
CREATE TABLE "new_SaleOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT,
    "writtenInvoiceNo" TEXT,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyerId" TEXT NOT NULL,
    "payerId" TEXT,
    "introducerId" TEXT,
    "pickerId" TEXT,
    "needDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAddress" TEXT,
    "deliveryFee" REAL NOT NULL DEFAULT 0,
    "projectId" TEXT,
    "paymentEntityId" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "writeOffAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaleOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleOrder_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleOrder_introducerId_fkey" FOREIGN KEY ("introducerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleOrder_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BizProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleOrder_paymentEntityId_fkey" FOREIGN KEY ("paymentEntityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SaleOrder" ("buyerId", "createdAt", "deliveryAddress", "deliveryFee", "discount", "id", "introducerId", "invoiceNo", "needDelivery", "paidAmount", "payerId", "paymentEntityId", "pickerId", "projectId", "remark", "saleDate", "status", "totalAmount", "updatedAt", "writeOffAmount", "writtenInvoiceNo") SELECT "buyerId", "createdAt", "deliveryAddress", "deliveryFee", "discount", "id", "introducerId", "invoiceNo", "needDelivery", "paidAmount", "payerId", "paymentEntityId", "pickerId", "projectId", "remark", "saleDate", "status", "totalAmount", "updatedAt", "writeOffAmount", "writtenInvoiceNo" FROM "SaleOrder";
DROP TABLE "SaleOrder";
ALTER TABLE "new_SaleOrder" RENAME TO "SaleOrder";
CREATE TABLE "new_SaleOrderPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleOrderId" TEXT NOT NULL,
    "photoPath" TEXT NOT NULL,
    "photoType" TEXT NOT NULL DEFAULT 'handwritten',
    "photoRemark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaleOrderPhoto_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SaleOrderPhoto" ("createdAt", "id", "photoPath", "photoRemark", "photoType", "saleOrderId") SELECT "createdAt", "id", "photoPath", "photoRemark", "photoType", "saleOrderId" FROM "SaleOrderPhoto";
DROP TABLE "SaleOrderPhoto";
ALTER TABLE "new_SaleOrderPhoto" RENAME TO "SaleOrderPhoto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
