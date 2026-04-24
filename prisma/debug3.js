const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('检查订单明细...\n');

  const saleOrders = await prisma.saleOrder.findMany({
    include: { items: true }
  });

  console.log(`销售订单数: ${saleOrders.length}`);
  console.log(`订单明细总数: ${saleOrders.reduce((sum, o) => sum + o.items.length, 0)}`);

  for (const order of saleOrders) {
    console.log(`\n订单 ${order.id} (seq: ${order.internalSeq}):`);
    console.log(`  明细数: ${order.items.length}`);
    for (const item of order.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      console.log(`    item ${item.id}: productId=${item.productId}`);
      console.log(`      商品存在: ${!!product}, 名称: ${product?.name || 'N/A'}`);
    }
  }

  const purchases = await prisma.purchase.findMany();
  console.log(`\n进货明细总数: ${purchases.length}`);
  for (const p of purchases) {
    const product = await prisma.product.findUnique({ where: { id: p.productId } });
    console.log(`  purchase ${p.id}: productId=${p.productId}, 商品存在: ${!!product}, 名称: ${product?.name || 'N/A'}`);
  }

  await prisma.$disconnect();
}

check();
