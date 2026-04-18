-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SaleOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT,
    "writtenInvoiceNo" TEXT,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyerId" TEXT NOT NULL,
    "payerId" TEXT,
    "introducerId" TEXT,
    "pickerId" TEXT,
    "pickerName" TEXT,
    "pickerPhone" TEXT,
    "needDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAddress" TEXT,
    "deliveryFee" REAL NOT NULL DEFAULT 0,
    "projectId" TEXT,
    "paymentEntityId" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "writeOffAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaleOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleOrder_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleOrder_introducerId_fkey" FOREIGN KEY ("introducerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleOrder_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BizProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleOrder_paymentEntityId_fkey" FOREIGN KEY ("paymentEntityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SaleOrder" ("buyerId", "createdAt", "discount", "id", "introducerId", "invoiceNo", "paidAmount", "payerId", "paymentEntityId", "pickerId", "pickerName", "pickerPhone", "projectId", "remark", "saleDate", "status", "totalAmount", "updatedAt", "writeOffAmount", "writtenInvoiceNo") SELECT "buyerId", "createdAt", "discount", "id", "introducerId", "invoiceNo", "paidAmount", "payerId", "paymentEntityId", "pickerId", "pickerName", "pickerPhone", "projectId", "remark", "saleDate", "status", "totalAmount", "updatedAt", "writeOffAmount", "writtenInvoiceNo" FROM "SaleOrder";
DROP TABLE "SaleOrder";
ALTER TABLE "new_SaleOrder" RENAME TO "SaleOrder";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
