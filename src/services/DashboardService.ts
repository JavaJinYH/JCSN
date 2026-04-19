import { db } from '@/lib/db';

export const DashboardService = {
  async getAllProducts() {
    return db.product.findMany();
  },

  async getTodayLegacySales(today: Date) {
    return db.sale.findMany({
      where: { saleDate: { gte: today } },
      include: { customer: true },
    });
  },

  async getRecentLegacySales(weekAgo: Date) {
    return db.sale.findMany({
      where: { saleDate: { gte: weekAgo } },
      orderBy: { saleDate: 'desc' },
      take: 10,
      include: { customer: true },
    });
  },

  async getAllLegacySalesInPeriod(weekAgo: Date) {
    return db.sale.findMany({
      where: { saleDate: { gte: weekAgo } },
    });
  },

  async getLegacySaleItemsInPeriod(weekAgo: Date) {
    return db.saleItem.findMany({
      where: { createdAt: { gte: weekAgo } },
      include: { product: true },
    });
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

  async getLegacySalesInPeriod(startDate: Date) {
    return db.sale.findMany({
      where: { saleDate: { gte: startDate } },
      include: { payments: true },
    });
  },

  async getNewOrdersInPeriod(startDate: Date) {
    return db.saleOrder.findMany({
      where: { saleDate: { gte: startDate } },
      include: { payments: true },
    });
  },
};
