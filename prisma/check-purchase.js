const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('检查进货单及其明细...\n');

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: {
      supplier: true,
      items: {
        include: { product: true }
      }
    },
    take: 1,
  });

  console.log(`进货单数量: ${purchaseOrders.length}`);

  for (const order of purchaseOrders) {
    console.log(`\n进货单 ID: ${order.id}`);
    console.log(`  internalSeq: ${order.internalSeq}`);
    console.log(`  supplier: ${order.supplier?.name}`);
    console.log(`  purchaseDate: ${order.purchaseDate}`);
    console.log(`  items 数量: ${order.items.length}`);

    for (const item of order.items) {
      console.log(`    商品: ${item.product?.name}`);
      console.log(`    数量: ${item.quantity}`);
      console.log(`    单价: ${item.unitPrice}`);
      console.log(`    小计: ${item.totalAmount}`);
    }

    const total = order.items.reduce((sum, item) => sum + item.totalAmount, 0);
    console.log(`  计算的总金额: ${total}`);
  }

  await prisma.$disconnect();
}

check();
