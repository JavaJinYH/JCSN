import { db } from '@/lib/db';
import { EntityCreditService } from './EntityCreditService';
import { LegacyBillService } from './LegacyBillService';

export const CollectionService = {
  async getCollectionRecords() {
    return db.collectionRecord.findMany({
      include: { entity: true, receivable: { include: { order: true } } },
      orderBy: { collectionDate: 'desc' },
    });
  },

  async getEntities() {
    return db.entity.findMany({ orderBy: { name: 'asc' } });
  },

  async getReceivables(where?: any) {
    return db.receivable.findMany({
      where: where || { remainingAmount: { gt: 0 } },
      include: { order: { include: { buyer: true, paymentEntity: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getLegacyBills(entityId?: string) {
    return LegacyBillService.getLegacyBills(entityId);
  },

  async createCollectionRecord(data: {
    entityId: string;
    receivableId?: string;
    legacyBillId?: string;
    collectionDate: Date;
    collectionTime?: string;
    collectionMethod?: string;
    collectionResult?: string;
    attitude?: string;
    collectionAmount?: number;
    followUpDate?: Date;
    followUpTime?: string;
    communication?: string;
    nextPlan?: string;
    remark?: string;
  }) {
    const result = await db.collectionRecord.create({
      data: {
        entityId: data.entityId,
        receivableId: data.receivableId,
        collectionDate: data.collectionDate,
        collectionTime: data.collectionTime,
        collectionMethod: data.collectionMethod,
        collectionResult: data.collectionResult,
        attitude: data.attitude,
        collectionAmount: data.collectionAmount,
        followUpDate: data.followUpDate,
        followUpTime: data.followUpTime,
        communication: data.communication,
        nextPlan: data.nextPlan,
        remark: data.remark,
      },
    });

    if (data.receivableId && data.collectionAmount && data.collectionAmount > 0) {
      await this.updateReceivableAfterCollection(data.receivableId, data.collectionAmount);
    }

    if (data.legacyBillId && data.collectionAmount && data.collectionAmount > 0) {
      await LegacyBillService.recordPayment(data.legacyBillId, data.collectionAmount);
    }

    if (data.entityId) {
      await EntityCreditService.updateEntityCredit(data.entityId);
    }

    return result;
  },

  async deleteCollectionRecord(id: string) {
    const record = await db.collectionRecord.findUnique({ where: { id } });
    const result = await db.collectionRecord.delete({ where: { id } });

    if (record?.entityId) {
      await EntityCreditService.updateEntityCredit(record.entityId);
    }

    return result;
  },

  async updateCollectionRecord(id: string, data: {
    entityId?: string;
    receivableId?: string | null;
    collectionDate?: Date;
    collectionTime?: string | null;
    collectionMethod?: string;
    collectionResult?: string;
    attitude?: string | null;
    collectionAmount?: number | null;
    followUpDate?: Date | null;
    followUpTime?: string | null;
    communication?: string | null;
    nextPlan?: string | null;
    remark?: string | null;
  }) {
    const result = await db.collectionRecord.update({
      where: { id },
      data,
    });

    if (data.entityId) {
      await EntityCreditService.updateEntityCredit(data.entityId);
    }

    return result;
  },

  async updateReceivableAfterCollection(receivableId: string, amount: number) {
    const receivable = await db.receivable.findUnique({
      where: { id: receivableId },
    });

    if (!receivable) throw new Error('应收款不存在');

    const newPaidAmount = receivable.paidAmount + amount;
    const newRemainingAmount = Math.max(0, receivable.originalAmount - newPaidAmount);
    const newStatus = newRemainingAmount <= 0 ? 'settled' : (newPaidAmount > 0 ? 'partial' : 'pending');

    return db.receivable.update({
      where: { id: receivableId },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
      },
    });
  },
};
