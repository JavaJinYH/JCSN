-- AlterTable
ALTER TABLE "CollectionRecord" ADD COLUMN "collectionTime" TEXT DEFAULT '00:00';
ALTER TABLE "CollectionRecord" ADD COLUMN "communication" TEXT;
ALTER TABLE "CollectionRecord" ADD COLUMN "followUpTime" TEXT;
ALTER TABLE "CollectionRecord" ADD COLUMN "nextPlan" TEXT;

-- CreateTable
CREATE TABLE "CustomerPhone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneType" TEXT NOT NULL DEFAULT 'mobile',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerPhone_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "SaleSlip_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SaleSlip" ("createdAt", "customerId", "discount", "id", "paidAmount", "remark", "saleDate", "status", "totalAmount", "updatedAt") SELECT "createdAt", "customerId", "discount", "id", "paidAmount", "remark", "saleDate", "status", "totalAmount", "updatedAt" FROM "SaleSlip";
DROP TABLE "SaleSlip";
ALTER TABLE "new_SaleSlip" RENAME TO "SaleSlip";
CREATE TABLE "new_SaleSlipItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slipId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaleSlipItem_slipId_fkey" FOREIGN KEY ("slipId") REFERENCES "SaleSlip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SaleSlipItem" ("createdAt", "id", "productId", "quantity", "slipId", "subtotal", "unitPrice") SELECT "createdAt", "id", "productId", "quantity", "slipId", "subtotal", "unitPrice" FROM "SaleSlipItem";
DROP TABLE "SaleSlipItem";
ALTER TABLE "new_SaleSlipItem" RENAME TO "SaleSlipItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CustomerPhone_customerId_idx" ON "CustomerPhone"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPhone_customerId_phone_key" ON "CustomerPhone"("customerId", "phone");
