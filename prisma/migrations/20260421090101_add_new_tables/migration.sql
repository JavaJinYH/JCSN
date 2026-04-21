/*
  Warnings:

  - You are about to drop the `Rebate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Rebate";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "BusinessCommission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'OUTGOING',
    "category" TEXT NOT NULL DEFAULT 'INTRODUCER',
    "saleOrderId" TEXT,
    "contactId" TEXT,
    "supplierId" TEXT,
    "productId" TEXT,
    "amount" REAL NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessCommission_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusinessCommission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BusinessCommission_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BusinessCommission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServiceAppointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT,
    "productId" TEXT,
    "appointmentDate" DATETIME NOT NULL,
    "serviceType" TEXT NOT NULL,
    "installer" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "installationFee" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceAppointment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
