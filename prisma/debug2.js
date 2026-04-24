const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugProducts() {
  console.log('调试商品数组...\n');

  const allProducts = await prisma.product.findMany({
    orderBy: { code: 'asc' }
  });

  console.log(`商品总数: ${allProducts.length}\n`);

  for (let i = 0; i < allProducts.length; i++) {
    const p = allProducts[i];
    console.log(`products[${i}]: ${p.name} (ID: ${p.id})`);
  }

  console.log('\n检查关键索引:');
  const indices = [0, 1, 7, 8, 14, 17, 22, 23, 28];
  for (const idx of indices) {
    if (allProducts[idx]) {
      console.log(`products[${idx}] = ${allProducts[idx].name}`);
    } else {
      console.log(`products[${idx}] = UNDEFINED (数组长度: ${allProducts.length})`);
    }
  }

  await prisma.$disconnect();
}

debugProducts();
