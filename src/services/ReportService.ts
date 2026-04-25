import { db } from '@/lib/db';
import { calculateNetSales, calculateOrderProfit } from '@/lib/calculations';

export const ReportService = {
  async getSalesInPeriod(start: Date, end: Date) {
    return db.saleOrder.findMany({
      where: { saleDate: { gte: start, lte: end } },
      include: { items: true, returns: true, badDebtWriteOffs: true, payments: true },
    });
  },

  async getOrderItemsInPeriod(start: Date, end: Date) {
    return db.orderItem.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        order: {
          saleDate: { gte: start, lte: end },
        },
      },
      include: { product: true, order: true },
    });
  },

  async getPurchasesInPeriod(start: Date, end: Date) {
    return db.purchase.findMany({
      where: { purchaseDate: { gte: start, lte: end } },
      include: { product: true },
    });
  },

  async getServiceAppointmentsInPeriod(start: Date, end: Date) {
    return db.serviceAppointment.findMany({
      where: {
        appointmentDate: { gte: start, lte: end },
        status: '已完成',
        installerType: '店主',
        installationFee: { gt: 0 },
      },
    });
  },

  async getContacts() {
    return db.contact.findMany({
      where: { contactType: { in: ['customer', 'plumber'] } },
      orderBy: { name: 'asc' },
    });
  },

  calculateNetSales(order: any) {
    return calculateNetSales(order);
  },

  calculateNetProfit(order: any) {
    return calculateOrderProfit(order);
  },

  async getReturnsInPeriod(start: Date, end: Date) {
    return db.saleReturn.findMany({
      where: { returnDate: { gte: start, lte: end } },
      include: {
        items: { include: { product: true } },
        saleOrder: { include: { buyer: true, paymentEntity: true } },
      },
      orderBy: { returnDate: 'desc' },
    });
  },

  async getReturnStats(start: Date, end: Date) {
    const returns = await this.getReturnsInPeriod(start, end);
    
    let totalReturns = 0;
    let totalReturnAmount = 0;
    let productReturns = new Map();
    
    for (const ret of returns) {
      totalReturns++;
      totalReturnAmount += ret.totalAmount;
      
      for (const item of ret.items) {
        const productId = item.productId;
        if (!productReturns.has(productId)) {
          productReturns.set(productId, {
            product: item.product,
            quantity: 0,
            amount: 0,
          });
        }
        const data = productReturns.get(productId);
        data.quantity += item.returnQuantity;
        data.amount += item.amount;
      }
    }
    
    const topProducts = Array.from(productReturns.entries())
      .map(([_, data]) => data)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    
    const dailyReturns = new Map();
    for (const ret of returns) {
      const dateKey = ret.returnDate.toISOString().split('T')[0];
      if (!dailyReturns.has(dateKey)) {
        dailyReturns.set(dateKey, { count: 0, amount: 0 });
      }
      const dayData = dailyReturns.get(dateKey);
      dayData.count++;
      dayData.amount += ret.totalAmount;
    }
    
    return {
      totalReturns,
      totalReturnAmount,
      topProducts,
      dailyReturns: Array.from(dailyReturns.entries()).map(([date, data]) => ({
        date,
        ...data
      })),
    };
  },

  async getBadDebtWriteOffsInPeriod(start: Date, end: Date) {
    return db.badDebtWriteOff.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        entity: true,
        saleOrder: { include: { buyer: true, paymentEntity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getBadDebtStats(start: Date, end: Date) {
    const writeOffs = await this.getBadDebtWriteOffsInPeriod(start, end);
    
    let totalWriteOffs = 0;
    let totalWriteOffAmount = 0;
    let entityWriteOffs = new Map();
    
    for (const writeOff of writeOffs) {
      totalWriteOffs++;
      totalWriteOffAmount += writeOff.writtenOffAmount;
      
      const entityId = writeOff.entityId;
      if (!entityWriteOffs.has(entityId)) {
        entityWriteOffs.set(entityId, {
          entity: writeOff.entity,
          count: 0,
          amount: 0,
        });
      }
      const data = entityWriteOffs.get(entityId);
      data.count++;
      data.amount += writeOff.writtenOffAmount;
    }
    
    const topEntities = Array.from(entityWriteOffs.entries())
      .map(([_, data]) => data)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    
    const dailyWriteOffs = new Map();
    for (const writeOff of writeOffs) {
      const dateKey = writeOff.createdAt.toISOString().split('T')[0];
      if (!dailyWriteOffs.has(dateKey)) {
        dailyWriteOffs.set(dateKey, { count: 0, amount: 0 });
      }
      const dayData = dailyWriteOffs.get(dateKey);
      dayData.count++;
      dayData.amount += writeOff.writtenOffAmount;
    }
    
    return {
      totalWriteOffs,
      totalWriteOffAmount,
      topEntities,
      dailyWriteOffs: Array.from(dailyWriteOffs.entries()).map(([date, data]) => ({
        date,
        ...data
      })),
    };
  },

  async getReturnsComparePeriod(start1: Date, end1: Date, start2: Date, end2: Date) {
    const stats1 = await this.getReturnStats(start1, end1);
    const stats2 = await this.getReturnStats(start2, end2);
    
    return {
      period1: stats1,
      period2: stats2,
      countChange: stats1.totalReturns - stats2.totalReturns,
      amountChange: stats1.totalReturnAmount - stats2.totalReturnAmount,
    };
  },

  async getBadDebtComparePeriod(start1: Date, end1: Date, start2: Date, end2: Date) {
    const stats1 = await this.getBadDebtStats(start1, end1);
    const stats2 = await this.getBadDebtStats(start2, end2);
    
    return {
      period1: stats1,
      period2: stats2,
      countChange: stats1.totalWriteOffs - stats2.totalWriteOffs,
      amountChange: stats1.totalWriteOffAmount - stats2.totalWriteOffAmount,
    };
  },
};
