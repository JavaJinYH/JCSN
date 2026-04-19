import { db } from '@/lib/db';

export const CollectionService = {
  async getCollectionRecords() {
    return db.collectionRecord.findMany({
      include: { customer: true, receivable: { include: { order: true } } },
      orderBy: { collectionDate: 'desc' },
    });
  },

  async getContacts() {
    return db.contact.findMany({ orderBy: { name: 'asc' } });
  },

  async getReceivables(where?: any) {
    return db.receivable.findMany({
      where: where || { remainingAmount: { gt: 0 } },
      include: { order: { include: { buyer: true, paymentEntity: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createCollectionRecord(data: {
    customerId: string;
    receivableId?: string;
    collectionDate: Date;
    collectionTime?: string;
    collectionMethod?: string;
    collectionResult?: string;
    collectionAmount?: number;
    followUpDate?: Date;
    followUpTime?: string;
    communication?: string;
    nextPlan?: string;
    remark?: string;
    amount?: number;
    paymentMethod?: string;
    operator?: string;
  }) {
    return db.collectionRecord.create({
      data: {
        customerId: data.customerId,
        receivableId: data.receivableId,
        collectionDate: data.collectionDate,
        collectionTime: data.collectionTime,
        collectionMethod: data.collectionMethod,
        collectionResult: data.collectionResult,
        collectionAmount: data.collectionAmount || data.amount,
        followUpDate: data.followUpDate,
        followUpTime: data.followUpTime,
        communication: data.communication,
        nextPlan: data.nextPlan,
        remark: data.remark,
      },
    });
  },

  async deleteCollectionRecord(id: string) {
    return db.collectionRecord.delete({ where: { id } });
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
