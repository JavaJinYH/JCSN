/*
  Warnings:

  - You are about to drop the `CustomerPrice` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CustomerPrice";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "EntityPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lastPrice" REAL NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EntityPrice_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EntityPrice_entityId_productId_key" ON "EntityPrice"("entityId", "productId");
