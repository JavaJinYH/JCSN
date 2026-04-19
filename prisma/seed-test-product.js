const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  let category = await prisma.category.findFirst({
    where: { name: '水暖' }
  });

  if (!category) {
    category = await prisma.category.create({
      data: { name: '水暖', sortOrder: 1 }
    });
    console.log('已创建"水暖"分类');
  }

  // 库存预警商品
  const product1 = await prisma.product.upsert({
    where: { id: 'test-pvc-coupling-001' },
    update: {
      stock: 5,
      minStock: 10,
      lastPurchasePrice: 3.0,
      referencePrice: 8.0
    },
    create: {
      id: 'test-pvc-coupling-001',
      name: 'PVC直接头 50mm',
      categoryId: category.id,
      brand: '联塑',
      specification: '50mm',
      model: 'PVC-U',
      unit: '个',
      stock: 5,
      minStock: 10,
      lastPurchasePrice: 3.0,
      referencePrice: 8.0,
      isPriceVolatile: false,
    },
  });

  // 缺货商品
  const product2 = await prisma.product.upsert({
    where: { id: 'test-pvc-elbow-002' },
    update: {
      stock: 0,
      minStock: 5,
      lastPurchasePrice: 2.5,
      referencePrice: 6.0
    },
    create: {
      id: 'test-pvc-elbow-002',
      name: 'PVC弯头 50mm',
      categoryId: category.id,
      brand: '联塑',
      specification: '50mm',
      model: 'PVC-U',
      unit: '个',
      stock: 0,
      minStock: 5,
      lastPurchasePrice: 2.5,
      referencePrice: 6.0,
      isPriceVolatile: false,
    },
  });

  console.log('');
  console.log('=== Test Products Created ===');
  console.log('');
  console.log('[1] Low Stock Warning Product:');
  console.log('  Name: ' + product1.name);
  console.log('  Stock: ' + product1.stock + ' / MinStock: ' + product1.minStock);
  console.log('  Status: LOW STOCK (stock <= minStock)');
  console.log('');
  console.log('[2] Out of Stock Product:');
  console.log('  Name: ' + product2.name);
  console.log('  Stock: ' + product2.stock + ' / MinStock: ' + product2.minStock);
  console.log('  Status: OUT OF STOCK (stock = 0)');
  console.log('');
  console.log('Test steps:');
  console.log('  1. Go to Inventory page');
  console.log('  2. Select "low" filter -> see product [1]');
  console.log('  3. Select "out" filter -> see product [2]');
  console.log('  4. Check products and click "Generate Purchase"');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
