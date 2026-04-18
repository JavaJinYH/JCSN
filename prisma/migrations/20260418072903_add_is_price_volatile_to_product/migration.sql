-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "specification" TEXT,
    "model" TEXT,
    "unit" TEXT NOT NULL DEFAULT '个',
    "purchaseUnit" TEXT,
    "unitRatio" REAL NOT NULL DEFAULT 1,
    "lastPurchasePrice" REAL,
    "referencePrice" REAL,
    "isPriceVolatile" BOOLEAN NOT NULL DEFAULT false,
    "stock" REAL NOT NULL DEFAULT 0,
    "minStock" REAL NOT NULL DEFAULT 0,
    "imagePath" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "createdAt", "id", "imagePath", "imageUrl", "lastPurchasePrice", "minStock", "model", "name", "purchaseUnit", "referencePrice", "specification", "stock", "unit", "unitRatio", "updatedAt") SELECT "categoryId", "createdAt", "id", "imagePath", "imageUrl", "lastPurchasePrice", "minStock", "model", "name", "purchaseUnit", "referencePrice", "specification", "stock", "unit", "unitRatio", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
