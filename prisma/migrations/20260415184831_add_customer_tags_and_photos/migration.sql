-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "autoTag" TEXT;
ALTER TABLE "Customer" ADD COLUMN "manualTag" TEXT;
ALTER TABLE "Customer" ADD COLUMN "phones" TEXT;
ALTER TABLE "Customer" ADD COLUMN "valueScore" REAL;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "buyerCustomerId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "introducerCustomerId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "payerCustomerId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "pickerName" TEXT;
ALTER TABLE "Sale" ADD COLUMN "pickerPhone" TEXT;
ALTER TABLE "Sale" ADD COLUMN "pickerType" TEXT;

-- CreateTable
CREATE TABLE "SalePhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "photoPath" TEXT NOT NULL,
    "photoType" TEXT NOT NULL DEFAULT 'handwritten',
    "photoRemark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalePhoto_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchasePhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "photoPath" TEXT NOT NULL,
    "photoType" TEXT NOT NULL DEFAULT 'delivery',
    "photoRemark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchasePhoto_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "receivableId" TEXT,
    "collectionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectionMethod" TEXT NOT NULL,
    "collectionResult" TEXT NOT NULL,
    "collectionAmount" REAL,
    "followUpDate" DATETIME,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
