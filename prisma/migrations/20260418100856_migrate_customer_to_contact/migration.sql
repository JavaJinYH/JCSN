-- ============================================
-- Customer → Contact 数据迁移脚本
-- 此脚本正确地将 Customer 数据迁移到 Contact
-- ============================================

PRAGMA foreign_keys=off;

-- Step 0: 为 Contact 表添加新列
ALTER TABLE "Contact" ADD COLUMN "phones" TEXT;
ALTER TABLE "Contact" ADD COLUMN "autoTag" TEXT;
ALTER TABLE "Contact" ADD COLUMN "manualTag" TEXT;
ALTER TABLE "Contact" ADD COLUMN "creditLimit" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Contact" ADD COLUMN "creditUsed" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Contact" ADD COLUMN "creditLevel" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "Contact" ADD COLUMN "lastCreditReviewDate" DATETIME;
ALTER TABLE "Contact" ADD COLUMN "riskLevel" TEXT NOT NULL DEFAULT 'low';
ALTER TABLE "Contact" ADD COLUMN "blacklist" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "Contact" ADD COLUMN "blacklistReason" TEXT;
ALTER TABLE "Contact" ADD COLUMN "customerCategoryId" TEXT;

-- Step 1: 先将 Customer 数据迁移到 Contact
INSERT INTO "Contact" (
    "id",
    "code",
    "name",
    "primaryPhone",
    "phones",
    "address",
    "remark",
    "contactType",
    "valueScore",
    "autoTag",
    "manualTag",
    "creditLimit",
    "creditUsed",
    "creditLevel",
    "lastCreditReviewDate",
    "riskLevel",
    "blacklist",
    "blacklistReason",
    "customerCategoryId",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    'C' || substr("id", 4, 10) AS "code",
    "name",
    "phone" AS "primaryPhone",
    "phones",
    "address",
    "remark",
    CASE
        WHEN "customerType" = '普通客户' THEN 'customer'
        WHEN "customerType" = '水电工' THEN 'plumber'
        WHEN "customerType" = '装修公司' THEN 'company'
        ELSE 'other'
    END AS "contactType",
    "valueScore",
    "autoTag",
    "manualTag",
    "creditLimit",
    "creditUsed",
    "creditLevel",
    "lastCreditReviewDate",
    "riskLevel",
    "blacklist",
    "blacklistReason",
    "customerCategoryId",
    "createdAt",
    "updatedAt"
FROM "Customer";

-- Step 2: 更新 Sale 表的外键 (customerId -> Contact)
UPDATE "Sale" SET "customerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "Sale"."customerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "Sale"."customerId")
    LIMIT 1
)
WHERE "customerId" IN (SELECT id FROM "Customer");

-- Step 3: 更新 Sale 表的外键 (payerCustomerId -> Contact)
UPDATE "Sale" SET "payerCustomerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "Sale"."payerCustomerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "Sale"."payerCustomerId")
    LIMIT 1
)
WHERE "payerCustomerId" IN (SELECT id FROM "Customer");

-- Step 4: 更新 Sale 表的外键 (introducerCustomerId -> Contact)
UPDATE "Sale" SET "introducerCustomerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "Sale"."introducerCustomerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "Sale"."introducerCustomerId")
    LIMIT 1
)
WHERE "introducerCustomerId" IN (SELECT id FROM "Customer");

-- Step 5: 更新 Sale 表的外键 (pickerCustomerId -> Contact)
UPDATE "Sale" SET "pickerCustomerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "Sale"."pickerCustomerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "Sale"."pickerCustomerId")
    LIMIT 1
)
WHERE "pickerCustomerId" IN (SELECT id FROM "Customer");

-- Step 6: 更新 Project 表的外键
UPDATE "Project" SET "customerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "Project"."customerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "Project"."customerId")
    LIMIT 1
)
WHERE "customerId" IN (SELECT id FROM "Customer");

-- Step 7: 更新 SaleSlip 表的外键
UPDATE "SaleSlip" SET "customerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "SaleSlip"."customerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "SaleSlip"."customerId")
    LIMIT 1
)
WHERE "customerId" IN (SELECT id FROM "Customer");

UPDATE "SaleSlip" SET "payerCustomerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "SaleSlip"."payerCustomerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "SaleSlip"."payerCustomerId")
    LIMIT 1
)
WHERE "payerCustomerId" IN (SELECT id FROM "Customer");

UPDATE "SaleSlip" SET "introducerCustomerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "SaleSlip"."introducerCustomerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "SaleSlip"."introducerCustomerId")
    LIMIT 1
)
WHERE "introducerCustomerId" IN (SELECT id FROM "Customer");

UPDATE "SaleSlip" SET "pickerCustomerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "SaleSlip"."pickerCustomerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "SaleSlip"."pickerCustomerId")
    LIMIT 1
)
WHERE "pickerCustomerId" IN (SELECT id FROM "Customer");

-- Step 8: 更新其他表的外键
UPDATE "SettlementAdjustment" SET "customerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "SettlementAdjustment"."customerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "SettlementAdjustment"."customerId")
    LIMIT 1
)
WHERE "customerId" IN (SELECT id FROM "Customer");

UPDATE "PaymentPlan" SET "customerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "PaymentPlan"."customerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "PaymentPlan"."customerId")
    LIMIT 1
)
WHERE "customerId" IN (SELECT id FROM "Customer");

UPDATE "CollectionRecord" SET "customerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "CollectionRecord"."customerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "CollectionRecord"."customerId")
    LIMIT 1
)
WHERE "customerId" IN (SELECT id FROM "Customer");

UPDATE "CustomerFavoriteProduct" SET "customerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "CustomerFavoriteProduct"."customerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "CustomerFavoriteProduct"."customerId")
    LIMIT 1
)
WHERE "customerId" IN (SELECT id FROM "Customer");

UPDATE "CreditRecord" SET "customerId" = (
    SELECT c."id" FROM "Contact" c
    WHERE c."name" = (SELECT name FROM "Customer" WHERE id = "CreditRecord"."customerId")
    AND c."primaryPhone" = (SELECT "phone" FROM "Customer" WHERE id = "CreditRecord"."customerId")
    LIMIT 1
)
WHERE "customerId" IN (SELECT id FROM "Customer");

-- Step 9: 删除 Customer 表
DROP TABLE IF EXISTS "Customer";

PRAGMA foreign_keys=on;

-- 完成
