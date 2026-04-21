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

  async getDailyExpensesInDateRange(start: Date, end: Date) {
    return db.dailyExpense.findMany({
      where: { date: { gte: start, lte: end } },
    });
  },

  async getServiceAppointmentsInDateRange(start: Date, end: Date) {
    return db.serviceAppointment.findMany({
      where: { appointmentDate: { gte: start, lte: end } },
      include: {
        contact: true,
        project: true,
        installerContact: true,
        items: { include: { product: true, order: true } },
      },
    });
  },

  async getBusinessCommissionsInDateRange(start: Date, end: Date) {
    return db.businessCommission.findMany({
      where: { recordedAt: { gte: start, lte: end } },
      include: {
        contact: true,
        supplier: true,
        product: true,
      },
    });
  },

  async getDeliveringOrders() {
    return db.deliveryRecord.findMany({
      where: {
        deliveryStatus: { in: ['pending', 'shipped', 'in_transit'] },
      },
      include: {
        saleOrder: {
          include: {
            buyer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  },

  async getUpcomingAppointments() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return db.serviceAppointment.findMany({
      where: {
        status: { in: ['待上门', '已上门'] },
        appointmentDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        contact: true,
        project: true,
        installerContact: true,
        items: { include: { product: true, order: true } },
      },
      orderBy: { appointmentDate: 'asc' },
    });
  },
};