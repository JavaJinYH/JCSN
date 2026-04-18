-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "Rebate_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "SaleOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rebate_plumberId_fkey" FOREIGN KEY ("plumberId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Rebate" ("createdAt", "id", "isHidden", "plumberId", "rebateAmount", "rebateRate", "rebateType", "recordedAt", "remark", "saleId", "supplierName", "updatedAt") SELECT "createdAt", "id", "isHidden", "plumberId", "rebateAmount", "rebateRate", "rebateType", "recordedAt", "remark", "saleId", "supplierName", "updatedAt" FROM "Rebate";
DROP TABLE "Rebate";
ALTER TABLE "new_Rebate" RENAME TO "Rebate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
