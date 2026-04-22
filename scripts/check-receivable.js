const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function check() {
  const receivableCount = await db.receivable.count();
  console.log('Receivable count:', receivableCount);

  const receivables = await db.receivable.findMany({ take: 5 });
  console.log('Sample receivables:', receivables);

  const ordersWithBalance = await db.saleOrder.findMany({
    where: {
      paidAmount: { lt: db.saleOrder.fields.totalAmount }
    },
    select: { id: true, totalAmount: true, paidAmount: true }
  });
  console.log('Orders with balance (partial payment):', ordersWithBalance);

  await db.$disconnect();
}

check();
