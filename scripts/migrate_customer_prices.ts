import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function initCustomerPrices() {
  console.log('开始初始化客户价格...');

  const orders = await db.saleOrder.findMany({
    include: {
      buyer: true,
      items: true,
    },
    orderBy: { saleDate: 'desc' },
  });

  console.log(`找到 ${orders.length} 个订单`);

  const priceMap = new Map<string, { price: number; count: number; customerId: string; productId: string }>();

  for (const order of orders) {
    if (!order.buyerId) continue;

    for (const item of order.items) {
      const key = `${order.buyerId}_${item.productId}`;
      const existing = priceMap.get(key);

      if (!existing) {
        priceMap.set(key, {
          price: item.unitPrice,
          count: 1,
          customerId: order.buyerId,
          productId: item.productId,
        });
      } else {
        existing.count++;
      }
    }
  }

  console.log(`生成了 ${priceMap.size} 个客户价格记录`);

  let created = 0;
  let updated = 0;

  for (const [_, data] of priceMap) {
    try {
      const existing = await db.customerPrice.findUnique({
        where: {
          customerId_productId: {
            customerId: data.customerId,
            productId: data.productId,
          },
        },
      });

      if (existing) {
        await db.customerPrice.update({
          where: { id: existing.id },
          data: {
            lastPrice: data.price,
            transactionCount: existing.transactionCount + data.count,
          },
        });
        updated++;
      } else {
        await db.customerPrice.create({
          data: {
            customerId: data.customerId,
            productId: data.productId,
            lastPrice: data.price,
            transactionCount: data.count,
          },
        });
        created++;
      }
    } catch (error) {
      console.error(`处理价格失败: ${error}`);
    }
  }

  console.log(`\n客户价格初始化完成: 新建 ${created}, 更新 ${updated}`);
}

async function main() {
  try {
    await initCustomerPrices();
    console.log('脚本执行完成');
  } catch (error) {
    console.error('脚本执行失败:', error);
  } finally {
    await db.$disconnect();
  }
}

main();