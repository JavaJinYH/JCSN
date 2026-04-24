const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validate() {
  console.log('🔍 验证数据库完整性...\n');

  let hasErrors = false;

  // 1. 检查销售订单的 buyer 是否存在
  console.log('📋 检查销售订单的联系人关联...');
  const saleOrders = await prisma.saleOrder.findMany({
    include: { 
      buyer: true, 
      paymentEntity: true, 
      project: true, 
      items: { include: { product: true } } 
    }
  });
  console.log(`  销售订单: ${saleOrders.length} 条`);
  for (const order of saleOrders) {
    if (order.buyerId && !order.buyer) {
      console.log(`  ❌ 订单 ${order.id} 的 buyerId=${order.buyerId} 不存在`);
      hasErrors = true;
    }
    if (order.paymentEntityId && !order.paymentEntity) {
      console.log(`  ❌ 订单 ${order.id} 的 paymentEntityId=${order.paymentEntityId} 不存在`);
      hasErrors = true;
    }
    if (order.projectId && !order.project) {
      console.log(`  ❌ 订单 ${order.id} 的 projectId=${order.projectId} 不存在`);
      hasErrors = true;
    }
    if (order.introducerId) {
      const intro = await prisma.contact.findUnique({ where: { id: order.introducerId } });
      if (!intro) {
        console.log(`  ❌ 订单 ${order.id} 的 introducerId=${order.introducerId} 不存在`);
        hasErrors = true;
      }
    }
  }

  // 2. 检查订单明细的商品是否都存在
  console.log('\n📦 检查订单明细的商品关联...');
  for (const order of saleOrders) {
    for (const item of order.items) {
      if (!item.product) {
        console.log(`  ❌ 订单明细 ${item.id} 的 productId=${item.productId} 不存在`);
        hasErrors = true;
      }
    }
  }

  // 3. 检查应收记录
  console.log('\n💰 检查应收记录...');
  const receivables = await prisma.receivable.findMany({
    include: { order: true }
  });
  console.log(`  应收记录: ${receivables.length} 条`);
  for (const rec of receivables) {
    if (!rec.order) {
      console.log(`  ❌ 应收 ${rec.id} 的 orderId=${rec.orderId} 不存在`);
      hasErrors = true;
    }
  }

  // 4. 检查进货单
  console.log('\n📥 检查进货单...');
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: { 
      supplier: true, 
      items: { include: { product: true } } 
    }
  });
  console.log(`  进货单: ${purchaseOrders.length} 条`);
  for (const order of purchaseOrders) {
    if (order.supplierId && !order.supplier) {
      console.log(`  ❌ 进货单 ${order.id} 的 supplierId=${order.supplierId} 不存在`);
      hasErrors = true;
    }
    for (const item of order.items) {
      if (!item.product) {
        console.log(`  ❌ 进货明细 ${item.id} 的 productId=${item.productId} 不存在`);
        hasErrors = true;
      }
    }
  }

  // 5. 检查实体
  console.log('\n🏢 检查实体...');
  const entities = await prisma.entity.findMany({
    include: { contact: true }
  });
  console.log(`  实体: ${entities.length} 个`);
  for (const entity of entities) {
    if (!entity.contact) {
      console.log(`  ❌ 实体 ${entity.id} 的 contactId=${entity.contactId} 不存在`);
      hasErrors = true;
    }
  }

  // 6. 检查项目
  console.log('\n🏗️ 检查项目...');
  const projects = await prisma.bizProject.findMany({
    include: { entity: true }
  });
  console.log(`  项目: ${projects.length} 个`);
  for (const project of projects) {
    if (!project.entity) {
      console.log(`  ❌ 项目 ${project.id} 的 entityId=${project.entityId} 不存在`);
      hasErrors = true;
    }
  }

  // 7. 统计一下数据量
  console.log('\n📊 数据统计:');
  console.log(`  商品: ${await prisma.product.count()}`);
  console.log(`  联系人: ${await prisma.contact.count()}`);
  console.log(`  实体: ${await prisma.entity.count()}`);
  console.log(`  项目: ${await prisma.bizProject.count()}`);
  console.log(`  供应商: ${await prisma.supplier.count()}`);
  console.log(`  进货单: ${await prisma.purchaseOrder.count()}`);
  console.log(`  进货明细: ${await prisma.purchase.count()}`);
  console.log(`  销售订单: ${await prisma.saleOrder.count()}`);
  console.log(`  订单明细: ${await prisma.orderItem.count()}`);
  console.log(`  应收: ${await prisma.receivable.count()}`);
  console.log(`  催账记录: ${await prisma.collectionRecord.count()}`);

  if (!hasErrors) {
    console.log('\n✅ 数据库验证通过，没有发现错误关联！');
  } else {
    console.log('\n⚠️ 数据库验证发现问题，请检查上面的错误！');
  }

  await prisma.$disconnect();
}

validate().catch(console.error);
