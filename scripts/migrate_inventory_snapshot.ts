import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function importInventorySnapshot() {
  console.log('开始导入历史库存快照...');

  const products = await db.product.findMany();
  console.log(`找到 ${products.length} 个商品`);

  let updated = 0;

  for (const product of products) {
    const purchases = await db.purchase.aggregate({
      where: { productId: product.id },
      _sum: { quantity: true },
    });

    const purchaseTotal = purchases._sum.quantity || 0;

    const sales = await db.orderItem.aggregate({
      where: { productId: product.id },
      _sum: { quantity: true },
    });

    const saleTotal = sales._sum.quantity || 0;

    const newStock = purchaseTotal - saleTotal;

    if (newStock !== product.stock) {
      await db.product.update({
        where: { id: product.id },
        data: { stock: newStock },
      });
      updated++;
      console.log(`更新商品 ${product.name}: 库存 ${product.stock} -> ${newStock}`);
    }
  }

  console.log(`\n库存快照导入完成: 更新了 ${updated} 个商品`);
}

async function main() {
  try {
    await importInventorySnapshot();
    console.log('脚本执行完成');
  } catch (error) {
    console.error('脚本执行失败:', error);
  } finally {
    await db.$disconnect();
  }
}

main();