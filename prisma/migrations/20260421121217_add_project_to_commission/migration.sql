-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BusinessCommission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'OUTGOING',
    "category" TEXT NOT NULL DEFAULT 'INTRODUCER',
    "projectId" TEXT,
    "saleOrderId" TEXT,
    "contactId" TEXT,
    "supplierId" TEXT,
    "productId" TEXT,
    "amount" REAL NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessCommission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BizProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BusinessCommission_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusinessCommission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BusinessCommission_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BusinessCommission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BusinessCommission" ("amount", "category", "contactId", "createdAt", "id", "productId", "recordedAt", "remark", "saleOrderId", "supplierId", "type", "updatedAt") SELECT "amount", "category", "contactId", "createdAt", "id", "productId", "recordedAt", "remark", "saleOrderId", "supplierId", "type", "updatedAt" FROM "BusinessCommission";
DROP TABLE "BusinessCommission";
ALTER TABLE "new_BusinessCommission" RENAME TO "BusinessCommission";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
