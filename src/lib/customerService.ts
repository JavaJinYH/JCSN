import { db } from '@/lib/db';
import { calculateCustomerScore, CustomerScoreInput } from '@/lib/utils';

export async function calculateAndUpdateCustomerScore(customerId: string): Promise<{
  score: number;
  tag: string;
} | null> {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const sales = await db.sale.findMany({
    where: {
      OR: [
        { customerId },
        { buyerCustomerId: customerId },
        { payerCustomerId: customerId },
        { introducerCustomerId: customerId },
      ],
      saleDate: { gte: oneYearAgo },
    },
    include: {
      items: { include: { product: true } },
      payments: true,
      rebates: { where: { plumberId: customerId } },
    },
  });

  if (sales.length === 0) {
    await db.customer.update({
      where: { id: customerId },
      data: { valueScore: null, autoTag: null },
    });
    return null;
  }

  let totalSales = 0;
  let totalProfit = 0;
  let totalCost = 0;
  let totalRebate = 0;
  const paymentDaysList: number[] = [];
  let overdueCount = 0;
  let totalOverdueDays = 0;

  for (const sale of sales) {
    const saleAmount = sale.totalAmount;
    totalSales += saleAmount;

    let saleCost = 0;
    for (const item of sale.items) {
      saleCost += item.costPriceSnapshot * item.quantity;
    }
    totalCost += saleCost;
    totalProfit += saleAmount - saleCost;

    for (const rebate of sale.rebates) {
      totalRebate += rebate.rebateAmount;
    }

    const paymentDays = sale.payments.length > 0
      ? Math.max(...sale.payments.map(p => Math.floor((new Date(p.paidAt).getTime() - new Date(sale.saleDate).getTime()) / (1000 * 60 * 60 * 24))))
      : Math.floor((now.getTime() - new Date(sale.saleDate).getTime()) / (1000 * 60 * 60 * 24));

    paymentDaysList.push(paymentDays);

    if (paymentDays > 30) {
      overdueCount++;
      totalOverdueDays += paymentDays - 30;
    }
  }

  const avgProfitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const avgPaymentDays = paymentDaysList.length > 0
    ? paymentDaysList.reduce((a, b) => a + b, 0) / paymentDaysList.length
    : 0;
  const overdueRate = sales.length > 0 ? overdueCount / sales.length : 0;
  const rebateRatio = totalSales > 0 ? (totalRebate / totalSales) * 100 : 0;

  const input: CustomerScoreInput = {
    totalSales,
    totalProfit,
    avgProfitMargin,
    avgPaymentDays,
    overdueRate: overdueRate * 100,
    rebateRatio,
  };

  const result = calculateCustomerScore(input);

  await db.customer.update({
    where: { id: customerId },
    data: {
      valueScore: result.score,
      autoTag: result.tag,
    },
  });

  return { score: result.score, tag: result.tag };
}

export async function batchUpdateAllCustomerScores(): Promise<number> {
  const customers = await db.customer.findMany({
    where: { customerType: { not: '散客' } },
  });

  let updatedCount = 0;
  for (const customer of customers) {
    const result = await calculateAndUpdateCustomerScore(customer.id);
    if (result) updatedCount++;
  }

  return updatedCount;
}
