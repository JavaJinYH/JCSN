const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log('测试进货数据...\n');

  // 1. 检查 PurchaseOrder
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: { supplier: true, items: { include: { product: true } } },
    take: 1,
  });

  console.log('PurchaseOrder 数量:', purchaseOrders.length);
  if (purchaseOrders.length > 0) {
    console.log('第一个 PurchaseOrder:');
    console.log('  ID:', purchaseOrders[0].id);
    console.log('  internalSeq:', purchaseOrders[0].internalSeq);
    console.log('  supplier:', purchaseOrders[0].supplier?.name);
    console.log('  items 数量:', purchaseOrders[0].items.length);
  }

  // 2. 检查 Purchase (旧数据，可能没有关联到 PurchaseOrder)
  const purchases = await prisma.purchase.findMany({
    include: { supplier: true, product: true },
    take: 3,
  });

  console.log('\nPurchase 数量:', await prisma.purchase.count());
  console.log('前3个 Purchase:');
  for (const p of purchases) {
    console.log('  ID:', p.id);
    console.log('  orderId:', p.orderId);
    console.log('  product:', p.product?.name);
    console.log('  quantity:', p.quantity);
  }

  await prisma.$disconnect();
}

test();
