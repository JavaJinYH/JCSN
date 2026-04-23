import { db } from '@/lib/db';
import { LegacyBillService } from './LegacyBillService';

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

  async getEntityReceivableSummary(entityId: string) {
    const orders = await db.saleOrder.findMany({
      where: { paymentEntityId: entityId },
      include: {
        payments: true,
        returns: true,
        badDebtWriteOffs: true,
      },
    });

    const legacyBills = await LegacyBillService.getLegacyBillsByEntity(entityId);

    let totalReceivable = 0;
    let totalPending = 0;

    for (const order of orders) {
      const orderTotal = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);
      let orderPaid = order.paidAmount;
      for (const ret of order.returns) {
        orderPaid -= ret.totalAmount;
      }
      for (const writeOff of order.badDebtWriteOffs) {
        orderPaid -= writeOff.writtenOffAmount;
      }
      totalReceivable += orderTotal;
      totalPending += Math.max(0, orderTotal - orderPaid);
    }

    for (const bill of legacyBills) {
      totalReceivable += bill.originalAmount;
      totalPending += bill.remainingAmount;
    }

    return { totalReceivable, totalPending };
  },

  async getEntityReceivableWithLegacy(entityId: string) {
    const [orders, legacyBills] = await Promise.all([
      db.saleOrder.findMany({
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
      }),
      LegacyBillService.getLegacyBillsByEntity(entityId),
    ]);

    const legacyFormatted = legacyBills.map(bill => ({
      id: `legacy-${bill.id}`,
      type: 'legacy' as const,
      invoiceNo: `历史-${bill.id.slice(0, 8)}`,
      saleDate: bill.billDate,
      buyer: { name: bill.entity?.name || '' },
      project: bill.project,
      totalAmount: bill.originalAmount,
      paidAmount: bill.paidAmount,
      remainingAmount: bill.remainingAmount,
      status: bill.status,
      remark: bill.remark,
      isHistorical: true,
    }));

    const ordersFormatted = orders.map(order => ({
      id: order.id,
      type: 'order' as const,
      invoiceNo: order.invoiceNo,
      saleDate: order.saleDate,
      buyer: order.buyer,
      project: order.project,
      totalAmount: order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0),
      paidAmount: order.paidAmount,
      remainingAmount: order.remainingAmount,
      status: order.status,
      remark: order.remark || '',
      isHistorical: false,
    }));

    return [...ordersFormatted, ...legacyFormatted].sort(
      (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
    );
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
