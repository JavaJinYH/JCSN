const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('📊 数据库检查...\n');

  const purchases = await prisma.purchase.findMany({
    include: { product: true, supplier: true }
  });
  console.log(`进货记录: ${purchases.length} 条`);
  for (const p of purchases) {
    console.log(`  - ${p.product.name} | 数量: ${p.quantity} | 单价: ${p.unitPrice} | 供应商: ${p.supplier.name}`);
  }

  const products = await prisma.product.findMany({
    where: { stock: { gt: 0 } },
    include: { category: true }
  });
  console.log(`\n有库存的商品: ${products.length} 个`);
  for (const p of products) {
    console.log(`  - ${p.name} (${p.category.name}) | 库存: ${p.stock} ${p.unit} | 最近进价: ${p.lastPurchasePrice}`);
  }

  await prisma.$disconnect();
}

check();
