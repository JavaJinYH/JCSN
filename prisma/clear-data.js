require('../scripts/set-encoding');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearData() {
  console.log('🗑️ 开始清空数据库...');

  // 按照外键依赖顺序删除
  const tablesInOrder = [
    'deliveryFee',
    'rebate',
    'deliveryRecord',
    'badDebtWriteOff',
    'saleReturnItem',
    'saleReturn',
    'purchaseReturnItem',
    'purchaseReturn',
    'collectionRecord',
    'receivableAuditLog',
    'receivable',
    'orderPayment',
    'orderItem',
    'saleOrderPhoto',
    'saleOrder',
    'purchasePhoto',
    'purchase',
    'purchaseOrder',
    'customerFavoriteProduct',
    'customerPrice',
    'customerPhone',
    'contactPhone',
    'creditRecord',
    'contactProjectRole',
    'contactEntityRole',
    'bizProject',
    'entity',
    'contact',
    'supplier',
    'productSpec',
    'brand',
    'product',
    'category',
    'inventoryCheckItem',
    'inventoryCheck',
    'systemSetting',
    'saleSlipItem',
    'saleSlip',
    'paymentPlan',
    'auditLog',
    'legacyBill',
  ];

  for (const table of tablesInOrder) {
    try {
      const pascalTable = table.charAt(0).toUpperCase() + table.slice(1);
      const count = await prisma[pascalTable].count();
      if (count > 0) {
        await prisma[pascalTable].deleteMany();
        console.log(`✅ 已清空 ${pascalTable} (${count} 条记录)`);
      }
    } catch (e) {
      // 忽略可能不存在的表错误
    }
  }

  console.log('\n🎉 数据库已清空完成！');
  await prisma.$disconnect();
}

clearData().catch(console.error);
