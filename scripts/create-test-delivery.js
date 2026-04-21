const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.saleOrder.findMany({ take: 1 });
  if (orders.length === 0) {
    console.log('没有找到销售订单');
    return;
  }
  const order = orders[0];
  console.log('找到订单:', order.id);

  const record = await prisma.deliveryRecord.create({
    data: {
      saleOrderId: order.id,
      zoneName: '市中心区',
      recipientName: '测试客户',
      recipientPhone: '13800138000',
      deliveryAddress: '江城市中心区测试地址',
      distance: 5.0,
      weight: 50.0,
      baseFee: 0,
      distanceFee: 10.0,
      weightFee: 25.0,
      totalFee: 35.0,
      deliveryStatus: 'pending',
    }
  });
  console.log('创建配送记录成功:', record.id);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
