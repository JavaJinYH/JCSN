import { db } from '@/lib/db';
import { AuditLogService } from './AuditLogService';

export const DailyExpenseService = {
  async getExpenses() {
    return db.dailyExpense.findMany({
      orderBy: { date: 'desc' },
    });
  },

  async getExpensesByDateRange(start: Date, end: Date) {
    return db.dailyExpense.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'desc' },
    });
  },

  async createExpense(data: {
    date?: Date;
    category: string;
    amount: number;
    description?: string;
  }) {
    const result = await db.dailyExpense.create({
      data: {
        date: data.date || new Date(),
        category: data.category,
        amount: data.amount,
        description: data.description,
      },
    });

    await AuditLogService.createAuditLog({
      actionType: 'CREATE',
      entityType: 'DailyExpense',
      entityId: result.id,
      newValue: `${data.category}: ¥${data.amount}`,
    });

    return result;
  },

  async updateExpense(
    id: string,
    data: {
      date?: Date;
      category?: string;
      amount?: number;
      description?: string;
    }
  ) {
    const old = await db.dailyExpense.findUnique({ where: { id } });
    const result = await db.dailyExpense.update({
      where: { id },
      data,
    });

    await AuditLogService.createAuditLog({
      actionType: 'UPDATE',
      entityType: 'DailyExpense',
      entityId: id,
      oldValue: old ? `${old.category}: ¥${old.amount}` : undefined,
      newValue: data.amount !== undefined ? `${data.category || old?.category}: ¥${data.amount}` : undefined,
    });

    return result;
  },

  async deleteExpense(id: string) {
    const old = await db.dailyExpense.findUnique({ where: { id } });
    await db.dailyExpense.delete({ where: { id } });

    await AuditLogService.createAuditLog({
      actionType: 'DELETE',
      entityType: 'DailyExpense',
      entityId: id,
      oldValue: old ? `${old.category}: ¥${old.amount}` : undefined,
    });

    return { success: true };
  },
};
