import { db } from '@/lib/db';
import type { LegacyBill } from '@/lib/types';

export const LegacyBillService = {
  async getLegacyBills(entityId?: string): Promise<LegacyBill[]> {
    return db.LegacyBill.findMany({
      where: entityId ? { entityId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        entity: true,
        project: true,
      },
    });
  },

  async getLegacyBillsByEntity(entityId: string): Promise<LegacyBill[]> {
    return db.LegacyBill.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        project: true,
      },
    });
  },

  async createLegacyBill(data: {
    entityId: string;
    projectId?: string;
    billDate?: Date;
    originalAmount: number;
    paidAmount?: number;
    remark?: string;
  }): Promise<LegacyBill> {
    const paid = data.paidAmount || 0;
    const remaining = data.originalAmount - paid;

    return db.LegacyBill.create({
      data: {
        entityId: data.entityId,
        projectId: data.projectId || null,
        billDate: data.billDate || new Date(),
        originalAmount: data.originalAmount,
        paidAmount: paid,
        remainingAmount: remaining,
        status: remaining > 0 ? 'pending' : 'settled',
        remark: data.remark,
      },
      include: {
        entity: true,
        project: true,
      },
    });
  },

  async updateLegacyBill(
    id: string,
    data: {
      projectId?: string;
      billDate?: Date;
      originalAmount?: number;
      paidAmount?: number;
      status?: string;
      remark?: string;
    }
  ): Promise<LegacyBill> {
    const existing = await db.LegacyBill.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('历史账单不存在');
    }

    const originalAmount = data.originalAmount ?? existing.originalAmount;
    const paidAmount = data.paidAmount ?? existing.paidAmount;
    const remainingAmount = originalAmount - paidAmount;
    const status = data.status ?? (remainingAmount > 0 ? 'pending' : 'settled');

    return db.LegacyBill.update({
      where: { id },
      data: {
        projectId: data.projectId,
        billDate: data.billDate,
        originalAmount,
        paidAmount,
        remainingAmount,
        status,
        remark: data.remark,
      },
      include: {
        entity: true,
        project: true,
      },
    });
  },

  async deleteLegacyBill(id: string): Promise<void> {
    await db.LegacyBill.delete({ where: { id } });
  },
};
