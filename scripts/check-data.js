const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function check() {
  const saleCount = await db.saleOrder.count();
  const purchaseCount = await db.purchaseOrder.count();
  const contactCount = await db.contact.count();

  console.log('SaleOrder count:', saleCount);
  console.log('PurchaseOrder count:', purchaseCount);
  console.log('Contact count:', contactCount);

  const lastSale = await db.saleOrder.findFirst({ orderBy: { saleDate: 'desc' } });
  console.log('Last sale:', lastSale ? { id: lastSale.id, invoiceNo: lastSale.invoiceNo, totalAmount: lastSale.totalAmount } : 'none');

  await db.$disconnect();
}

check();
