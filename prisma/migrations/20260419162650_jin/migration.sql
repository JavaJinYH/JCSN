/*
  Warnings:

  - You are about to drop the `AccountReceivable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `batchNo` on the `Purchase` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `BadDebtWriteOff` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AccountReceivable";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchNo" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentDate" DATETIME,
    "deliveredDate" DATETIME,
    "completedDate" DATETIME,
    "needDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'not_delivered',
    "driverName" TEXT,
    "driverPhone" TEXT,
    "estimatedDeliveryDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceivableAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receivableId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "oldAmount" REAL,
    "newAmount" REAL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "operator" TEXT,
    "reason" TEXT,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReceivableAuditLog_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BadDebtWriteOff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "saleOrderId" TEXT,
    "originalAmount" REAL NOT NULL,
    "writtenOffAmount" REAL NOT NULL,
    "finalAmount" REAL NOT NULL,
    "writeOffType" TEXT NOT NULL DEFAULT 'bad_debt',
    "reason" TEXT,
    "operatorNote" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BadDebtWriteOff_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BadDebtWriteOff_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BadDebtWriteOff" ("contactId", "createdAt", "createdBy", "finalAmount", "id", "operatorNote", "originalAmount", "reason", "saleOrderId", "writtenOffAmount") SELECT "contactId", "createdAt", "createdBy", "finalAmount", "id", "operatorNote", "originalAmount", "reason", "saleOrderId", "writtenOffAmount" FROM "BadDebtWriteOff";
DROP TABLE "BadDebtWriteOff";
ALTER TABLE "new_BadDebtWriteOff" RENAME TO "BadDebtWriteOff";
CREATE TABLE "new_CollectionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "receivableId" TEXT,
    "collectionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectionTime" TEXT DEFAULT '00:00',
    "collectionMethod" TEXT NOT NULL,
    "collectionResult" TEXT NOT NULL,
    "collectionAmount" REAL,
    "followUpDate" DATETIME,
    "followUpTime" TEXT,
    "communication" TEXT,
    "nextPlan" TEXT,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionRecord_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CollectionRecord" ("collectionAmount", "collectionDate", "collectionMethod", "collectionResult", "collectionTime", "communication", "createdAt", "customerId", "followUpDate", "followUpTime", "id", "nextPlan", "receivableId", "remark") SELECT "collectionAmount", "collectionDate", "collectionMethod", "collectionResult", "collectionTime", "communication", "createdAt", "customerId", "followUpDate", "followUpTime", "id", "nextPlan", "receivableId", "remark" FROM "CollectionRecord";
DROP TABLE "CollectionRecord";
ALTER TABLE "new_CollectionRecord" RENAME TO "CollectionRecord";
CREATE TABLE "new_Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentDate" DATETIME,
    "deliveredDate" DATETIME,
    "completedDate" DATETIME,
    "needDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'not_delivered',
    "driverName" TEXT,
    "driverPhone" TEXT,
    "estimatedDeliveryDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Purchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("createdAt", "id", "productId", "purchaseDate", "quantity", "remark", "supplierId", "supplierName", "totalAmount", "unitPrice") SELECT "createdAt", "id", "productId", "purchaseDate", "quantity", "remark", "supplierId", "supplierName", "totalAmount", "unitPrice" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
CREATE INDEX "Purchase_orderId_idx" ON "Purchase"("orderId");
CREATE TABLE "new_SaleSlip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "projectId" TEXT,
    "buyerCustomerId" TEXT,
    "payerCustomerId" TEXT,
    "introducerCustomerId" TEXT,
    "pickerCustomerId" TEXT,
    "pickerName" TEXT,
    "pickerPhone" TEXT,
    "pickerType" TEXT,
    "writtenInvoiceNo" TEXT,
    "paymentEntityId" TEXT,
    "needDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAddress" TEXT,
    "deliveryFee" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "discountRate" REAL NOT NULL DEFAULT 100,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "payments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaleSlip_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleSlip_buyerCustomerId_fkey" FOREIGN KEY ("buyerCustomerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleSlip_payerCustomerId_fkey" FOREIGN KEY ("payerCustomerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleSlip_introducerCustomerId_fkey" FOREIGN KEY ("introducerCustomerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleSlip_pickerCustomerId_fkey" FOREIGN KEY ("pickerCustomerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SaleSlip" ("buyerCustomerId", "createdAt", "customerId", "discount", "discountRate", "id", "introducerCustomerId", "paidAmount", "payerCustomerId", "payments", "pickerCustomerId", "pickerName", "pickerPhone", "pickerType", "projectId", "remark", "saleDate", "status", "totalAmount", "updatedAt", "writtenInvoiceNo") SELECT "buyerCustomerId", "createdAt", "customerId", "discount", "discountRate", "id", "introducerCustomerId", "paidAmount", "payerCustomerId", "payments", "pickerCustomerId", "pickerName", "pickerPhone", "pickerType", "projectId", "remark", "saleDate", "status", "totalAmount", "updatedAt", "writtenInvoiceNo" FROM "SaleSlip";
DROP TABLE "SaleSlip";
ALTER TABLE "new_SaleSlip" RENAME TO "SaleSlip";
CREATE TABLE "new_SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "shopName" TEXT NOT NULL DEFAULT '折柳建材店',
    "ownerName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "idleTimeoutMinutes" INTEGER NOT NULL DEFAULT 5,
    "lockPassword" TEXT NOT NULL DEFAULT '123456',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemSetting" ("address", "id", "ownerName", "phone", "shopName", "updatedAt") SELECT "address", "id", "ownerName", "phone", "shopName", "updatedAt" FROM "SystemSetting";
DROP TABLE "SystemSetting";
ALTER TABLE "new_SystemSetting" RENAME TO "SystemSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_batchNo_key" ON "PurchaseOrder"("batchNo");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "ReceivableAuditLog_receivableId_idx" ON "ReceivableAuditLog"("receivableId");

-- CreateIndex
CREATE INDEX "ReceivableAuditLog_createdAt_idx" ON "ReceivableAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ReceivableAuditLog_actionType_idx" ON "ReceivableAuditLog"("actionType");
