const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function cleanupDuplicateWalkIn() {
  console.log('🔍 正在查找所有叫"散客"的联系人...');

  const walkIns = await db.contact.findMany({
    where: { name: '散客' },
  });

  console.log(`找到 ${walkIns.length} 个"散客"联系人`);

  if (walkIns.length <= 1) {
    console.log('✅ 没有重复，无需清理');
    await db.$disconnect();
    return;
  }

  // 找到最早创建的那个散客（保留它）
  const oldestWalkIn = walkIns.reduce((oldest, current) => {
    return current.createdAt < oldest.createdAt ? current : oldest;
  });

  console.log(`\n⏰ 保留最早的散客: ID=${oldestWalkIn.id} (${oldestWalkIn.createdAt})`);

  // 其他散客需要迁移
  for (const walkIn of walkIns) {
    if (walkIn.id === oldestWalkIn.id) continue;

    console.log(`\n⏳ 处理散客: ID=${walkIn.id}`);
    
    // 查找这个散客的订单
    const orders = await db.saleOrder.findMany({
      where: { buyerId: walkIn.id },
    });
    console.log(`  └─ 关联订单数: ${orders.length}`);

    if (orders.length > 0) {
      // 把这个散客的订单迁移给保留的散客
      await db.saleOrder.updateMany({
        where: { buyerId: walkIn.id },
        data: { buyerId: oldestWalkIn.id },
      });
      console.log(`  └─ ✅ 已迁移 ${orders.length} 个订单`);
    }

    // 删除这个散客
    await db.contact.delete({ where: { id: walkIn.id } });
    console.log(`  └─ ✅ 已删除重复散客`);
  }

  console.log('\n🎉 清理完成！现在只剩下一个"散客"了');

  // 再确认一下
  const remaining = await db.contact.findMany({ where: { name: '散客' } });
  console.log(`现在有 ${remaining.length} 个"散客"联系人`);

  await db.$disconnect();
}

cleanupDuplicateWalkIn().catch(console.error);
