import { db } from '@/lib/db';

export const SettlementService = {
  async getEntitiesWithContact() {
    return db.entity.findMany({
      include: { contact: true },
      orderBy: { name: 'asc' },
    });
  },

  async getOrdersByEntity(entityId: string) {
    return db.saleOrder.findMany({
      where: { paymentEntityId: entityId },
      include: {
        buyer: true,
        project: true,
        payments: true,
        items: true,
        returns: true,
        badDebtWriteOffs: true,
        photos: true,
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  async getAllOrders() {
    return db.saleOrder.findMany({
      include: {
        buyer: true,
        project: true,
        paymentEntity: true,
        payments: true,
        items: true,
        returns: true,
        badDebtWriteOffs: true,
        photos: true,
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  async getPendingOrders(entityId: string) {
    return db.saleOrder.findMany({
      where: {
        paymentEntityId: entityId,
        status: { in: ['pending', 'partial'] },
      },
      include: {
        buyer: true,
        project: true,
        payments: true,
        items: true,
        returns: true,
        badDebtWriteOffs: true,
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  async updateOrderPayment(id: string, data: {
    paidAmount: number;
    status: string;
  }) {
    return db.saleOrder.update({
      where: { id },
      data,
    });
  },

  async createPayment(data: {
    orderId: string;
    amount: number;
    method: string;
    payerName?: string;
    remark?: string;
  }) {
    return db.orderPayment.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        payerName: data.payerName,
        remark: data.remark,
      },
    });
  },

  async updateEntityCredit(entityId: string, creditUsed: number) {
    return db.entity.update({
      where: { id: entityId },
      data: { creditUsed: Math.max(0, creditUsed) },
    });
  },

  async getReceivables(entityId: string) {
    return db.receivable.findMany({
      where: { order: { paymentEntityId: entityId } },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async calculateOrderBalance(orderId: string) {
    const order = await db.saleOrder.findUnique({
      where: { id: orderId },
      include: { returns: true, badDebtWriteOffs: true, payments: true },
    });

    if (!order) return 0;

    let total = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);
    let paid = order.paidAmount;

    for (const ret of order.returns) {
      total -= ret.totalAmount;
    }

    for (const writeOff of order.badDebtWriteOffs) {
      total -= writeOff.writtenOffAmount;
    }

    return Math.max(0, total - paid);
  },
};
