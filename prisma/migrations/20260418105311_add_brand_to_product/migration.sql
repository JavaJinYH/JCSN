-- AlterTable
ALTER TABLE "Product" ADD COLUMN "brand" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "CollectionRecord_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "AccountReceivable" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CollectionRecord" ("collectionAmount", "collectionDate", "collectionMethod", "collectionResult", "collectionTime", "communication", "createdAt", "customerId", "followUpDate", "followUpTime", "id", "nextPlan", "receivableId", "remark") SELECT "collectionAmount", "collectionDate", "collectionMethod", "collectionResult", "collectionTime", "communication", "createdAt", "customerId", "followUpDate", "followUpTime", "id", "nextPlan", "receivableId", "remark" FROM "CollectionRecord";
DROP TABLE "CollectionRecord";
ALTER TABLE "new_CollectionRecord" RENAME TO "CollectionRecord";
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryPhone" TEXT,
    "phones" TEXT,
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
INSERT INTO "new_Contact" ("address", "autoTag", "blacklist", "blacklistReason", "code", "contactType", "createdAt", "creditLevel", "creditLimit", "creditUsed", "customerCategoryId", "id", "lastCreditReviewDate", "manualTag", "name", "phones", "primaryPhone", "remark", "riskLevel", "updatedAt", "valueScore") SELECT "address", "autoTag", "blacklist", "blacklistReason", "code", "contactType", "createdAt", "creditLevel", "creditLimit", "creditUsed", "customerCategoryId", "id", "lastCreditReviewDate", "manualTag", "name", "phones", "primaryPhone", "remark", "riskLevel", "updatedAt", "valueScore" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE UNIQUE INDEX "Contact_code_key" ON "Contact"("code");
CREATE TABLE "new_CreditRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "creditLimit" REAL NOT NULL,
    "creditUsed" REAL NOT NULL,
    "creditLevel" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "reason" TEXT,
    "operator" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CreditRecord" ("createdAt", "creditLevel", "creditLimit", "creditUsed", "customerId", "id", "operator", "reason", "recordType", "riskLevel") SELECT "createdAt", "creditLevel", "creditLimit", "creditUsed", "customerId", "id", "operator", "reason", "recordType", "riskLevel" FROM "CreditRecord";
DROP TABLE "CreditRecord";
ALTER TABLE "new_CreditRecord" RENAME TO "CreditRecord";
CREATE TABLE "new_CustomerFavoriteProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerFavoriteProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerFavoriteProduct_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomerFavoriteProduct" ("createdAt", "customerId", "id", "productId", "quantity", "remark", "unitPrice", "updatedAt") SELECT "createdAt", "customerId", "id", "productId", "quantity", "remark", "unitPrice", "updatedAt" FROM "CustomerFavoriteProduct";
DROP TABLE "CustomerFavoriteProduct";
ALTER TABLE "new_CustomerFavoriteProduct" RENAME TO "CustomerFavoriteProduct";
CREATE UNIQUE INDEX "CustomerFavoriteProduct_customerId_productId_key" ON "CustomerFavoriteProduct"("customerId", "productId");
CREATE TABLE "new_CustomerPhone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneType" TEXT NOT NULL DEFAULT 'mobile',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerPhone_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomerPhone" ("createdAt", "customerId", "id", "isPrimary", "phone", "phoneType", "remark", "updatedAt") SELECT "createdAt", "customerId", "id", "isPrimary", "phone", "phoneType", "remark", "updatedAt" FROM "CustomerPhone";
DROP TABLE "CustomerPhone";
ALTER TABLE "new_CustomerPhone" RENAME TO "CustomerPhone";
CREATE INDEX "CustomerPhone_customerId_idx" ON "CustomerPhone"("customerId");
CREATE UNIQUE INDEX "CustomerPhone_customerId_phone_key" ON "CustomerPhone"("customerId", "phone");
CREATE TABLE "new_CustomerPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lastPrice" REAL NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerPrice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomerPrice" ("customerId", "id", "lastPrice", "productId", "transactionCount", "updatedAt") SELECT "customerId", "id", "lastPrice", "productId", "transactionCount", "updatedAt" FROM "CustomerPrice";
DROP TABLE "CustomerPrice";
ALTER TABLE "new_CustomerPrice" RENAME TO "CustomerPrice";
CREATE UNIQUE INDEX "CustomerPrice_customerId_productId_key" ON "CustomerPrice"("customerId", "productId");
CREATE TABLE "new_PaymentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "planAmount" REAL NOT NULL,
    "actualAmount" REAL NOT NULL DEFAULT 0,
    "dueDate" DATETIME NOT NULL,
    "paidDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentPlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PaymentPlan" ("actualAmount", "createdAt", "customerId", "dueDate", "id", "paidDate", "planAmount", "projectId", "remark", "status", "updatedAt") SELECT "actualAmount", "createdAt", "customerId", "dueDate", "id", "paidDate", "planAmount", "projectId", "remark", "status", "updatedAt" FROM "PaymentPlan";
DROP TABLE "PaymentPlan";
ALTER TABLE "new_PaymentPlan" RENAME TO "PaymentPlan";
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT '进行中',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("address", "createdAt", "customerId", "endDate", "id", "name", "remark", "startDate", "status", "updatedAt") SELECT "address", "createdAt", "customerId", "endDate", "id", "name", "remark", "startDate", "status", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT,
    "writtenInvoiceNo" TEXT,
    "customerId" TEXT,
    "projectId" TEXT,
    "payerCustomerId" TEXT,
    "introducerCustomerId" TEXT,
    "pickerCustomerId" TEXT,
    "pickerName" TEXT,
    "pickerPhone" TEXT,
    "pickerType" TEXT,
    "totalAmount" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "paidAmount" REAL NOT NULL,
    "writeOffAmount" REAL NOT NULL DEFAULT 0,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_payerCustomerId_fkey" FOREIGN KEY ("payerCustomerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_introducerCustomerId_fkey" FOREIGN KEY ("introducerCustomerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_pickerCustomerId_fkey" FOREIGN KEY ("pickerCustomerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("createdAt", "customerId", "discount", "id", "introducerCustomerId", "invoiceNo", "paidAmount", "payerCustomerId", "pickerCustomerId", "pickerName", "pickerPhone", "pickerType", "projectId", "remark", "saleDate", "status", "totalAmount", "writeOffAmount", "writtenInvoiceNo") SELECT "createdAt", "customerId", "discount", "id", "introducerCustomerId", "invoiceNo", "paidAmount", "payerCustomerId", "pickerCustomerId", "pickerName", "pickerPhone", "pickerType", "projectId", "remark", "saleDate", "status", "totalAmount", "writeOffAmount", "writtenInvoiceNo" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
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
CREATE TABLE "new_SettlementAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "adjustType" TEXT NOT NULL,
    "adjustMethod" TEXT NOT NULL,
    "adjustValue" REAL NOT NULL,
    "adjustAmount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SettlementAdjustment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SettlementAdjustment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SettlementAdjustment" ("adjustAmount", "adjustMethod", "adjustType", "adjustValue", "approvedAt", "approvedBy", "createdAt", "customerId", "id", "reason", "remark", "saleId", "status", "updatedAt") SELECT "adjustAmount", "adjustMethod", "adjustType", "adjustValue", "approvedAt", "approvedBy", "createdAt", "customerId", "id", "reason", "remark", "saleId", "status", "updatedAt" FROM "SettlementAdjustment";
DROP TABLE "SettlementAdjustment";
ALTER TABLE "new_SettlementAdjustment" RENAME TO "SettlementAdjustment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
