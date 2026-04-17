/*
  Warnings:

  - You are about to drop the column `purchaseId` on the `Rebate` table. All the data in the column will be lost.
  - You are about to drop the column `costPrice` on the `SaleItem` table. All the data in the column will be lost.
  - Added the required column `saleId` to the `Rebate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costPriceSnapshot` to the `SaleItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingPriceSnapshot` to the `SaleItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "pickerCustomerId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "phones" TEXT,
    "customerType" TEXT NOT NULL DEFAULT '普通客户',
    "address" TEXT,
    "remark" TEXT,
    "customerCategoryId" TEXT,
    "valueScore" REAL,
    "autoTag" TEXT,
    "manualTag" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_customerCategoryId_fkey" FOREIGN KEY ("customerCategoryId") REFERENCES "CustomerCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "autoTag", "createdAt", "customerCategoryId", "customerType", "id", "manualTag", "name", "phone", "phones", "remark", "updatedAt", "valueScore") SELECT "address", "autoTag", "createdAt", "customerCategoryId", "customerType", "id", "manualTag", "name", "phone", "phones", "remark", "updatedAt", "valueScore" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE TABLE "new_Rebate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "plumberId" TEXT,
    "supplierName" TEXT NOT NULL,
    "rebateAmount" REAL NOT NULL,
    "rebateType" TEXT NOT NULL DEFAULT 'cash',
    "rebateRate" REAL NOT NULL DEFAULT 0,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rebate_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rebate_plumberId_fkey" FOREIGN KEY ("plumberId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Rebate" ("createdAt", "id", "isHidden", "rebateAmount", "rebateRate", "rebateType", "recordedAt", "remark", "supplierName", "updatedAt") SELECT "createdAt", "id", "isHidden", "rebateAmount", "rebateRate", "rebateType", "recordedAt", "remark", "supplierName", "updatedAt" FROM "Rebate";
DROP TABLE "Rebate";
ALTER TABLE "new_Rebate" RENAME TO "Rebate";
CREATE TABLE "new_SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "costPriceSnapshot" REAL NOT NULL,
    "sellingPriceSnapshot" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "purchaseUnitPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SaleItem" ("createdAt", "id", "productId", "purchaseUnitPrice", "quantity", "saleId", "subtotal", "unitPrice") SELECT "createdAt", "id", "productId", "purchaseUnitPrice", "quantity", "saleId", "subtotal", "unitPrice" FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
