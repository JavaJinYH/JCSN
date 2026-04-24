const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('📊 检查进货单(PurchaseOrder)...\n');

  const orders = await prisma.purchaseOrder.findMany({
    include: { 
      items: { include: { product: true } },
      supplier: true 
    }
  });
  
  console.log(`进货单数量: ${orders.length}`);
  for (const order of orders) {
    console.log(`\n进货单 #${order.internalSeq}:`);
    console.log(`  ID: ${order.id}`);
    console.log(`  批次号: ${order.batchNo}`);
    console.log(`  供应商: ${order.supplier?.name || order.supplierName}`);
    console.log(`  日期: ${order.purchaseDate}`);
    console.log(`  状态: ${order.status}`);
    console.log(`  商品数量: ${order.items.length}`);
    for (const item of order.items) {
      console.log(`    - ${item.product.name} | 数量: ${item.quantity} | 单价: ${item.unitPrice}`);
    }
  }

  await prisma.$disconnect();
}

check();
