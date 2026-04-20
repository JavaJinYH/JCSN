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
};