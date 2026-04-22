import { db } from '@/lib/db';

function formatDateKey(date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

export const CounterService = {
  async getNextSaleSeq(): Promise<{ dateKey: string; seq: number }> {
    const dateKey = formatDateKey(new Date());

    const counter = await db.dailyCounter.upsert({
      where: { date: dateKey },
      update: { saleCount: { increment: 1 } },
      create: { date: dateKey, saleCount: 1, purchaseCount: 0 },
    });

    return { dateKey, seq: counter.saleCount };
  },

  async getNextPurchaseSeq(): Promise<{ dateKey: string; seq: number }> {
    const dateKey = formatDateKey(new Date());

    const counter = await db.dailyCounter.upsert({
      where: { date: dateKey },
      update: { purchaseCount: { increment: 1 } },
      create: { date: dateKey, saleCount: 0, purchaseCount: 1 },
    });

    return { dateKey, seq: counter.purchaseCount };
  },

  async getTodayCounts(dateKey: string) {
    const counter = await db.dailyCounter.findUnique({
      where: { date: dateKey },
    });
    return {
      saleCount: counter?.saleCount || 0,
      purchaseCount: counter?.purchaseCount || 0,
    };
  },
};
