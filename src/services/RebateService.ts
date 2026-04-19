import { db } from '@/lib/db';

export const RebateService = {
  async getRebates() {
    return db.rebate.findMany({
      include: {
        sale: true,
        plumber: true,
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

  async getPlumbers() {
    return db.contact.findMany({
      where: { contactType: 'plumber' },
      orderBy: { name: 'asc' },
    });
  },

  async createRebate(data: {
    saleId?: string;
    plumberId?: string;
    supplierName?: string;
    rebateAmount: number;
    rebateType?: string;
    rebateRate?: number;
    recordedAt?: Date;
    remark?: string;
    isHidden?: boolean;
  }) {
    return db.rebate.create({
      data: {
        saleId: data.saleId,
        plumberId: data.plumberId,
        supplierName: data.supplierName,
        rebateAmount: data.rebateAmount,
        rebateType: data.rebateType,
        rebateRate: data.rebateRate,
        recordedAt: data.recordedAt || new Date(),
        remark: data.remark,
        isHidden: data.isHidden,
      },
    });
  },

  async deleteRebate(id: string) {
    return db.rebate.delete({ where: { id } });
  },
};
