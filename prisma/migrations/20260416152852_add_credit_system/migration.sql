-- CreateTable
CREATE TABLE "CreditRecord" (
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
    CONSTRAINT "CreditRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AccountReceivable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "projectId" TEXT,
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
    CONSTRAINT "AccountReceivable_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountReceivable_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AccountReceivable" ("agreedPaymentDate", "createdAt", "customerId", "id", "isOverdue", "originalAmount", "overdueDays", "paidAmount", "projectId", "remainingAmount", "remark", "settlementDate", "status", "updatedAt") SELECT "agreedPaymentDate", "createdAt", "customerId", "id", "isOverdue", "originalAmount", "overdueDays", "paidAmount", "projectId", "remainingAmount", "remark", "settlementDate", "status", "updatedAt" FROM "AccountReceivable";
DROP TABLE "AccountReceivable";
ALTER TABLE "new_AccountReceivable" RENAME TO "AccountReceivable";
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
    CONSTRAINT "CollectionRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionRecord_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "AccountReceivable" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CollectionRecord" ("collectionAmount", "collectionDate", "collectionMethod", "collectionResult", "collectionTime", "communication", "createdAt", "customerId", "followUpDate", "followUpTime", "id", "nextPlan", "receivableId", "remark") SELECT "collectionAmount", "collectionDate", "collectionMethod", "collectionResult", "collectionTime", "communication", "createdAt", "customerId", "followUpDate", "followUpTime", "id", "nextPlan", "receivableId", "remark" FROM "CollectionRecord";
DROP TABLE "CollectionRecord";
ALTER TABLE "new_CollectionRecord" RENAME TO "CollectionRecord";
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
    "creditLimit" REAL NOT NULL DEFAULT 0,
    "creditUsed" REAL NOT NULL DEFAULT 0,
    "creditLevel" TEXT NOT NULL DEFAULT 'normal',
    "lastCreditReviewDate" DATETIME,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "blacklist" BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_customerCategoryId_fkey" FOREIGN KEY ("customerCategoryId") REFERENCES "CustomerCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "autoTag", "createdAt", "customerCategoryId", "customerType", "id", "manualTag", "name", "phone", "phones", "remark", "updatedAt", "valueScore") SELECT "address", "autoTag", "createdAt", "customerCategoryId", "customerType", "id", "manualTag", "name", "phone", "phones", "remark", "updatedAt", "valueScore" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
