-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeliveryRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT,
    "saleOrderId" TEXT,
    "projectId" TEXT,
    "zoneName" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "distance" REAL NOT NULL DEFAULT 0,
    "weight" REAL NOT NULL DEFAULT 0,
    "baseFee" REAL NOT NULL DEFAULT 0,
    "distanceFee" REAL NOT NULL DEFAULT 0,
    "weightFee" REAL NOT NULL DEFAULT 0,
    "totalFee" REAL NOT NULL DEFAULT 0,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'pending',
    "deliveryDate" DATETIME,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryRecord_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryRecord_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryRecord" ("baseFee", "createdAt", "deliveryAddress", "deliveryDate", "deliveryStatus", "distance", "distanceFee", "driverName", "driverPhone", "id", "projectId", "recipientName", "recipientPhone", "remark", "saleId", "totalFee", "updatedAt", "weight", "weightFee", "zoneName") SELECT "baseFee", "createdAt", "deliveryAddress", "deliveryDate", "deliveryStatus", "distance", "distanceFee", "driverName", "driverPhone", "id", "projectId", "recipientName", "recipientPhone", "remark", "saleId", "totalFee", "updatedAt", "weight", "weightFee", "zoneName" FROM "DeliveryRecord";
DROP TABLE "DeliveryRecord";
ALTER TABLE "new_DeliveryRecord" RENAME TO "DeliveryRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
