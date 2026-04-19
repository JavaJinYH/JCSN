import { db } from '@/lib/db';

export const StatementService = {
  async getContacts(where?: any) {
    return db.contact.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  },

  async getEntities(include?: any) {
    return db.entity.findMany({
      where: { entityType: { not: 'cash' } },
      orderBy: { name: 'asc' },
      include,
    });
  },

  async getProjects(where?: any, include?: any) {
    return db.bizProject.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getSaleOrders(where?: any, include?: any) {
    return db.saleOrder.findMany({
      where,
      include: include || {
        buyer: true,
        payer: true,
        project: true,
        paymentEntity: true,
        returns: true,
        badDebtWriteOffs: true,
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  async getReceivables(where?: any, include?: any) {
    return db.receivable.findMany({
      where,
      include: include || { order: { include: { buyer: true, paymentEntity: true, returns: true, badDebtWriteOffs: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getSuppliers(include?: any) {
    return db.supplier.findMany({
      orderBy: { name: 'asc' },
      include,
    });
  },

  async getPurchases(where?: any, include?: any) {
    return db.purchase.findMany({
      where,
      include: include || { product: true, supplier: true },
    });
  },

  async getShopInfo() {
    return db.systemSetting.findFirst();
  },

  calculateAdjustedReceivable(order: any): { original: number; paid: number; remaining: number } {
    let original = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);
    let paid = order.paidAmount;

    for (const ret of order.returns || []) {
      original -= ret.totalAmount;
    }

    for (const writeOff of order.badDebtWriteOffs || []) {
      original -= writeOff.writtenOffAmount;
    }

    const remaining = Math.max(0, original - paid);
    return { original, paid, remaining };
  },
};
