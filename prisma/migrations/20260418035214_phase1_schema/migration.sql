/*
  Warnings:

  - You are about to drop the column `customerId` on the `AccountReceivable` table. All the data in the column will be lost.
  - You are about to drop the column `supplier` on the `Purchase` table. All the data in the column will be lost.
  - Added the required column `contactId` to the `AccountReceivable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Contact` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "SaleOrderPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleOrderId" TEXT NOT NULL,
    "photoPath" TEXT NOT NULL,
    "photoType" TEXT NOT NULL DEFAULT 'handwritten',
    "photoRemark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaleOrderPhoto_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactId" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AccountReceivable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "saleId" TEXT,
    "projectId" TEXT,
    "entityId" TEXT,
    "originalAmount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "remainingAmount" REAL NOT NULL,
    "agreedPaymentDate" DATETIME,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "overdueDays" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "settlementDate" DATETIME,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountReceivable_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountReceivable_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AccountReceivable" ("agreedPaymentDate", "createdAt", "id", "isOverdue", "originalAmount", "overdueDays", "paidAmount", "projectId", "remainingAmount", "remark", "saleId", "settlementDate", "status", "updatedAt") SELECT "agreedPaymentDate", "createdAt", "id", "isOverdue", "originalAmount", "overdueDays", "paidAmount", "projectId", "remainingAmount", "remark", "saleId", "settlementDate", "status", "updatedAt" FROM "AccountReceivable";
DROP TABLE "AccountReceivable";
ALTER TABLE "new_AccountReceivable" RENAME TO "AccountReceivable";
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryPhone" TEXT,
    "address" TEXT,
    "remark" TEXT,
    "contactType" TEXT NOT NULL DEFAULT 'customer',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Contact" ("address", "createdAt", "id", "name", "primaryPhone", "remark", "updatedAt") SELECT "address", "createdAt", "id", "name", "primaryPhone", "remark", "updatedAt" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE UNIQUE INDEX "Contact_code_key" ON "Contact"("code");
CREATE TABLE "new_Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "batchNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("batchNo", "createdAt", "id", "productId", "purchaseDate", "quantity", "remark", "totalAmount", "unitPrice") SELECT "batchNo", "createdAt", "id", "productId", "purchaseDate", "quantity", "remark", "totalAmount", "unitPrice" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
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
    CONSTRAINT "Rebate_plumberId_fkey" FOREIGN KEY ("plumberId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Rebate" ("createdAt", "id", "isHidden", "plumberId", "rebateAmount", "rebateRate", "rebateType", "recordedAt", "remark", "saleId", "supplierName", "updatedAt") SELECT "createdAt", "id", "isHidden", "plumberId", "rebateAmount", "rebateRate", "rebateType", "recordedAt", "remark", "saleId", "supplierName", "updatedAt" FROM "Rebate";
DROP TABLE "Rebate";
ALTER TABLE "new_Rebate" RENAME TO "Rebate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");
