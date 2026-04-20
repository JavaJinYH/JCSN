/*
  Warnings:

  - You are about to drop the column `contactId` on the `LegacyBill` table. All the data in the column will be lost.
  - You are about to drop the column `projectName` on the `LegacyBill` table. All the data in the column will be lost.
  - Added the required column `entityId` to the `LegacyBill` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LegacyBill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT,
    "billDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalAmount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "remainingAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LegacyBill_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LegacyBill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BizProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LegacyBill" ("billDate", "createdAt", "id", "originalAmount", "paidAmount", "remainingAmount", "remark", "status", "updatedAt") SELECT "billDate", "createdAt", "id", "originalAmount", "paidAmount", "remainingAmount", "remark", "status", "updatedAt" FROM "LegacyBill";
DROP TABLE "LegacyBill";
ALTER TABLE "new_LegacyBill" RENAME TO "LegacyBill";
CREATE INDEX "LegacyBill_entityId_idx" ON "LegacyBill"("entityId");
CREATE INDEX "LegacyBill_status_idx" ON "LegacyBill"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
