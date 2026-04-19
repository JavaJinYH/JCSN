const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 获取几个商品
  const products = await prisma.product.findMany({
    take: 5,
    select: { id: true, name: true, stock: true, minStock: true }
  });
  console.log('Current products:', JSON.stringify(products, null, 2));

  // 为每个商品设置预警状态：stock <= minStock 且 minStock > 0
  for (const p of products) {
    // 设置 minStock 为 10，stock 设置为低于 minStock
    await prisma.product.update({
      where: { id: p.id },
      data: {
        minStock: 10,
        stock: Math.floor(Math.random() * 8) + 1, // 1-8 之间随机数，确保低于 10
      }
    });
    console.log(`Updated ${p.name}: minStock=10, stock=${await prisma.product.findUnique({ where: { id: p.id }, select: { stock: true } }).then(r => r.stock)}`);
  }

  console.log('\nDone! Created warning stock products.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());