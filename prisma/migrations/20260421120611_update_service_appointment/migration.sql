/*
  Warnings:

  - You are about to drop the `CustomerCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `contactId` on the `BadDebtWriteOff` table. All the data in the column will be lost.
  - You are about to drop the column `customerCategoryId` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `CreditRecord` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `PaymentPlan` table. All the data in the column will be lost.
  - You are about to drop the column `installer` on the `ServiceAppointment` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `ServiceAppointment` table. All the data in the column will be lost.
  - Added the required column `entityId` to the `BadDebtWriteOff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactId` to the `CreditRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactId` to the `PaymentPlan` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CustomerCategory";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ContactPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lastPrice" REAL NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactPrice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServiceAppointmentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceAppointmentItem_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ServiceAppointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointmentItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SaleOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointmentItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointmentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BadDebtWriteOff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityId" TEXT NOT NULL,
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
    CONSTRAINT "BadDebtWriteOff_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BadDebtWriteOff_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BadDebtWriteOff" ("approvedAt", "approvedBy", "createdAt", "createdBy", "finalAmount", "id", "operatorNote", "originalAmount", "reason", "saleOrderId", "status", "updatedAt", "writeOffType", "writtenOffAmount") SELECT "approvedAt", "approvedBy", "createdAt", "createdBy", "finalAmount", "id", "operatorNote", "originalAmount", "reason", "saleOrderId", "status", "updatedAt", "writeOffType", "writtenOffAmount" FROM "BadDebtWriteOff";
DROP TABLE "BadDebtWriteOff";
ALTER TABLE "new_BadDebtWriteOff" RENAME TO "BadDebtWriteOff";
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
    "contactCategoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_contactCategoryId_fkey" FOREIGN KEY ("contactCategoryId") REFERENCES "ContactCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("address", "autoTag", "blacklist", "blacklistReason", "code", "contactType", "createdAt", "creditLevel", "creditLimit", "creditUsed", "id", "lastCreditReviewDate", "manualTag", "name", "primaryPhone", "remark", "riskLevel", "updatedAt", "valueScore") SELECT "address", "autoTag", "blacklist", "blacklistReason", "code", "contactType", "createdAt", "creditLevel", "creditLimit", "creditUsed", "id", "lastCreditReviewDate", "manualTag", "name", "primaryPhone", "remark", "riskLevel", "updatedAt", "valueScore" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE UNIQUE INDEX "Contact_code_key" ON "Contact"("code");
CREATE TABLE "new_CreditRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "creditLimit" REAL NOT NULL,
    "creditUsed" REAL NOT NULL,
    "creditLevel" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "reason" TEXT,
    "operator" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CreditRecord" ("createdAt", "creditLevel", "creditLimit", "creditUsed", "id", "operator", "reason", "recordType", "riskLevel") SELECT "createdAt", "creditLevel", "creditLimit", "creditUsed", "id", "operator", "reason", "recordType", "riskLevel" FROM "CreditRecord";
DROP TABLE "CreditRecord";
ALTER TABLE "new_CreditRecord" RENAME TO "CreditRecord";
CREATE TABLE "new_PaymentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "projectId" TEXT,
    "planAmount" REAL NOT NULL,
    "actualAmount" REAL NOT NULL DEFAULT 0,
    "dueDate" DATETIME NOT NULL,
    "paidDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentPlan_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PaymentPlan" ("actualAmount", "createdAt", "dueDate", "id", "paidDate", "planAmount", "projectId", "remark", "status", "updatedAt") SELECT "actualAmount", "createdAt", "dueDate", "id", "paidDate", "planAmount", "projectId", "remark", "status", "updatedAt" FROM "PaymentPlan";
DROP TABLE "PaymentPlan";
ALTER TABLE "new_PaymentPlan" RENAME TO "PaymentPlan";
CREATE TABLE "new_ServiceAppointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT,
    "projectId" TEXT,
    "appointmentDate" DATETIME NOT NULL,
    "serviceType" TEXT NOT NULL,
    "installerType" TEXT,
    "installerContactId" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "installationFee" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceAppointment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BizProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointment_installerContactId_fkey" FOREIGN KEY ("installerContactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceAppointment" ("appointmentDate", "contactId", "createdAt", "id", "installationFee", "notes", "serviceType", "status", "updatedAt") SELECT "appointmentDate", "contactId", "createdAt", "id", "installationFee", "notes", "serviceType", "status", "updatedAt" FROM "ServiceAppointment";
DROP TABLE "ServiceAppointment";
ALTER TABLE "new_ServiceAppointment" RENAME TO "ServiceAppointment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ContactPrice_contactId_productId_key" ON "ContactPrice"("contactId", "productId");
