import { db } from '@/lib/db';
import { AuditLogService } from './AuditLogService';

export const BusinessCommissionService = {
  async getCommissions() {
    return db.businessCommission.findMany({
      include: {
        saleOrder: true,
        contact: true,
        supplier: true,
        product: true,
      },
      orderBy: { recordedAt: 'desc' },
    });
  },

  async getCommissionsByDateRange(start: Date, end: Date) {
    return db.businessCommission.findMany({
      where: { recordedAt: { gte: start, lte: end } },
      include: {
        saleOrder: true,
        contact: true,
        supplier: true,
        product: true,
      },
      orderBy: { recordedAt: 'desc' },
    });
  },

  async getSaleOrders() {
    return db.saleOrder.findMany({
      include: {
        buyer: true,
        items: { include: { product: true } },
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  async getContacts() {
    return db.contact.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async getSuppliers() {
    return db.supplier.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async getProducts() {
    return db.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  },

  async createCommission(data: {
    type: 'OUTGOING' | 'INCOMING';
    category: 'INTRODUCER' | 'SUPPLIER';
    saleOrderId?: string;
    contactId?: string;
    supplierId?: string;
    productId?: string;
    amount: number;
    recordedAt?: Date;
    remark?: string;
  }) {
    const result = await db.businessCommission.create({
      data: {
        type: data.type,
        category: data.category,
        saleOrderId: data.saleOrderId,
        contactId: data.contactId,
        supplierId: data.supplierId,
        productId: data.productId,
        amount: data.amount,
        recordedAt: data.recordedAt || new Date(),
        remark: data.remark,
      },
    });

    await AuditLogService.createAuditLog({
      actionType: 'CREATE',
      entityType: 'BusinessCommission',
      entityId: result.id,
      newValue: `${data.type === 'INCOMING' ? '供应商返点' : '介绍人返点'}: ¥${data.amount}`,
    });

    return result;
  },

  async updateCommission(
    id: string,
    data: {
      type?: 'OUTGOING' | 'INCOMING';
      category?: 'INTRODUCER' | 'SUPPLIER';
      saleOrderId?: string;
      contactId?: string;
      supplierId?: string;
      productId?: string;
      amount?: number;
      recordedAt?: Date;
      remark?: string;
    }
  ) {
    const old = await db.businessCommission.findUnique({ where: { id } });
    const result = await db.businessCommission.update({
      where: { id },
      data: { ...data },
    });

    await AuditLogService.createAuditLog({
      actionType: 'UPDATE',
      entityType: 'BusinessCommission',
      entityId: id,
      oldValue: old ? `¥${old.amount}` : undefined,
      newValue: data.amount !== undefined ? `¥${data.amount}` : undefined,
    });

    return result;
  },

  async deleteCommission(id: string) {
    const old = await db.businessCommission.findUnique({ where: { id } });
    await db.businessCommission.delete({ where: { id } });

    await AuditLogService.createAuditLog({
      actionType: 'DELETE',
      entityType: 'BusinessCommission',
      entityId: id,
      oldValue: old ? `${old.type === 'INCOMING' ? '供应商返点' : '介绍人返点'}: ¥${old.amount}` : undefined,
    });

    return { success: true };
  },
};
