import { db } from '@/lib/db';

export const DashboardService = {
  async getAllProducts() {
    return db.product.findMany();
  },

  async getTodayNewOrders(today: Date) {
    return db.saleOrder.findMany({
      where: { saleDate: { gte: today } },
      include: { buyer: true },
    });
  },

  async getRecentNewOrders(weekAgo: Date) {
    return db.saleOrder.findMany({
      where: { saleDate: { gte: weekAgo } },
      orderBy: { saleDate: 'desc' },
      take: 10,
      include: { buyer: true },
    });
  },

  async getAllNewOrdersInPeriod(weekAgo: Date) {
    return db.saleOrder.findMany({
      where: { saleDate: { gte: weekAgo } },
    });
  },

  async getNewOrderItemsInPeriod(weekAgo: Date) {
    return db.orderItem.findMany({
      where: { createdAt: { gte: weekAgo } },
      include: { product: true },
    });
  },

  async getNewOrdersInPeriod(startDate: Date) {
    return db.saleOrder.findMany({
      where: { saleDate: { gte: startDate } },
      include: { payments: true },
    });
  },

  async getOrdersInDateRange(start: Date, end: Date) {
    return db.saleOrder.findMany({
      where: { saleDate: { gte: start, lte: end } },
      include: { payments: true, returns: true },
    });
  },

  async getCollectionsInDateRange(start: Date, end: Date) {
    return db.collectionRecord.findMany({
      where: { collectionDate: { gte: start, lte: end } },
      include: { customer: true },
    });
  },

  async getPurchasesInDateRange(start: Date, end: Date) {
    return db.purchase.findMany({
      where: { purchaseDate: { gte: start, lte: end } },
      include: { product: true, supplier: true },
    });
  },

  async getPurchaseReturnsInDateRange(start: Date, end: Date) {
    return db.purchaseReturn.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: { include: { product: true } } },
    });
  },
};