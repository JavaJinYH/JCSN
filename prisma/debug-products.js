const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('🔍 调试商品数组...\n');

  // 重新执行seed的创建逻辑
  const products = [];

  // 创建分类
  const catWires = await prisma.category.create({ data: { name: '电线电缆', sortOrder: 1 } });
  const catPipes = await prisma.category.create({ data: { name: '水管管材', sortOrder: 2 } });
  const catSanitary = await prisma.category.create({ data: { name: '卫浴洁具', sortOrder: 3 } });
  const catFittings = await prisma.category.create({ data: { name: '五金配件', sortOrder: 4 } });
  const catTools = await prisma.category.create({ data: { name: '工具配件', sortOrder: 5 } });

  const wires = [
    { name: 'BV-2.5mm² 单芯硬线', unit: '米', purchaseUnit: '卷', unitRatio: 100, referencePrice: 3.5, brand: '德力西', isVolatile: true },
    { name: 'BV-4mm² 单芯硬线', unit: '米', purchaseUnit: '卷', unitRatio: 100, referencePrice: 5.2, brand: '德力西', isVolatile: true },
    { name: 'BV-6mm² 单芯硬线', unit: '米', purchaseUnit: '卷', unitRatio: 100, referencePrice: 8.0, brand: '德力西', isVolatile: true },
  ];

  const pipes = [
    { name: 'PPR冷水管 20mm S5', unit: '米', purchaseUnit: '根', unitRatio: 4, referencePrice: 8.5, brand: '日丰管', isVolatile: true },
    { name: 'PPR冷水管 25mm S5', unit: '米', purchaseUnit: '根', unitRatio: 4, referencePrice: 12.0, brand: '日丰管', isVolatile: true },
  ];

  const sanitaries = [
    { name: '坐便器 9101S', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 899, brand: '九牧卫浴', isVolatile: false },
  ];

  const fittings = [
    { name: 'PPR直接头 20mm', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 2.5, brand: '日丰管', isVolatile: false },
    { name: 'PPR90度弯头 20mm', unit: '个', purchaseUnit: '个', unitRatio: 1, referencePrice: 3.0, brand: '日丰管', isVolatile: false },
  ];

  const tools = [
    { name: 'PPR热熔机 20-32mm', unit: '台', purchaseUnit: '台', unitRatio: 1, referencePrice: 120, brand: '其他', isVolatile: false },
  ];

  const productsToCreate = [...wires, ...pipes, ...sanitaries, ...fittings, ...tools];

  console.log('productsToCreate 长度:', productsToCreate.length);
  console.log('wires 长度:', wires.length);
  console.log('pipes 长度:', pipes.length);
  console.log('sanitaries 长度:', sanitaries.length);
  console.log('fittings 长度:', fittings.length);
  console.log('tools 长度:', tools.length);

  for (const [idx, p] of productsToCreate.entries()) {
    let categoryId;
    if (wires.includes(p)) categoryId = catWires.id;
    else if (pipes.includes(p)) categoryId = catPipes.id;
    else if (sanitaries.includes(p)) categoryId = catSanitary.id;
    else if (fittings.includes(p)) categoryId = catFittings.id;
    else categoryId = catTools.id;

    const product = await prisma.product.create({
      data: {
        code: `P${idx.toString().padStart(3, '0')}`,
        name: p.name,
        categoryId,
        unit: p.unit,
        purchaseUnit: p.purchaseUnit,
        unitRatio: p.unitRatio,
        referencePrice: p.referencePrice,
        isPriceVolatile: p.isVolatile,
      }
    });
    products.push(product);
  }

  console.log('\n商品数组长度:', products.length);

  // 验证关键索引
  console.log('\n验证关键商品:');
  console.log('products[0]:', products[0]?.name, 'ID:', products[0]?.id);
  console.log('products[1]:', products[1]?.name, 'ID:', products[1]?.id);
  console.log('products[2]:', products[2]?.name, 'ID:', products[2]?.id);
  console.log('products[7]:', products[7]?.name, 'ID:', products[7]?.id);
  console.log('products[8]:', products[8]?.name, 'ID:', products[8]?.id);
  console.log('products[14]:', products[14]?.name, 'ID:', products[14]?.id);
  console.log('products[17]:', products[17]?.name, 'ID:', products[17]?.id);
  console.log('products[22]:', products[22]?.name, 'ID:', products[22]?.id);
  console.log('products[23]:', products[23]?.name, 'ID:', products[23]?.id);
  console.log('products[28]:', products[28]?.name, 'ID:', products[28]?.id);

  await prisma.$disconnect();
}

debug().catch(console.error);
