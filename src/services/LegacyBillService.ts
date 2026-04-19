import { db } from '@/lib/db';

export const LegacyBillService = {
  async getAccountReceivables(where?: any, include?: any) {
    return db.accountReceivable.findMany({
      where,
      include: include || {
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getAccountReceivablesByContact(contactId: string) {
    return db.accountReceivable.findMany({
      where: {
        contactId,
        saleId: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createAccountReceivable(data: {
    contactId?: string;
    projectId?: string;
    originalAmount: number;
    paidAmount?: number;
    remainingAmount?: number;
    amount?: number;
    dueDate?: Date;
    description?: string;
    status?: string;
    remark?: string;
  }) {
    return db.accountReceivable.create({
      data: {
        contactId: data.contactId,
        projectId: data.projectId,
        originalAmount: data.originalAmount || data.amount || 0,
        paidAmount: data.paidAmount || 0,
        remainingAmount: data.remainingAmount || data.amount || 0,
        status: data.status || (data.remainingAmount && data.remainingAmount > 0 ? 'pending' : 'settled'),
        remark: data.remark,
      },
    });
  },

  async updateAccountReceivable(id: string, data: {
    amount?: number;
    originalAmount?: number;
    paidAmount?: number;
    remainingAmount?: number;
    dueDate?: Date;
    description?: string;
    status?: string;
    projectId?: string;
    contactId?: string;
    remark?: string;
  }) {
    return db.accountReceivable.update({
      where: { id },
      data: {
        originalAmount: data.originalAmount,
        paidAmount: data.paidAmount,
        remainingAmount: data.remainingAmount,
        dueDate: data.dueDate,
        description: data.description,
        status: data.status,
        projectId: data.projectId,
        contactId: data.contactId,
        remark: data.remark,
      },
    });
  },

  async deleteAccountReceivable(id: string) {
    return db.accountReceivable.delete({
      where: { id },
    });
  },
};
