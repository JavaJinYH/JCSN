import { db } from '@/lib/db';

export interface SupplierPaymentRecord {
  id: string;
  supplierId: string;
  supplier?: any;
  purchaseId: string | null;
  purchase?: any;
  amount: number;
  paymentDate: Date;
  paymentMethod: string | null;
  remark: string | null;
  createdAt: Date;
}

export const SupplierPaymentService = {
  async getAllPayments(): Promise<SupplierPaymentRecord[]> {
    return db.supplierPayment.findMany({
      include: {
        supplier: true,
        purchase: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  },

  async getPaymentsBySupplier(supplierId: string): Promise<SupplierPaymentRecord[]> {
    return db.supplierPayment.findMany({
      where: { supplierId },
      include: {
        supplier: true,
        purchase: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  },

  async getPaymentsByPurchase(purchaseId: string): Promise<SupplierPaymentRecord[]> {
    return db.supplierPayment.findMany({
      where: { purchaseId },
      orderBy: { paymentDate: 'desc' },
    });
  },

  async createPayment(data: {
    supplierId: string;
    purchaseId?: string;
    amount: number;
    paymentDate?: Date;
    paymentMethod?: string;
    remark?: string;
  }): Promise<SupplierPaymentRecord> {
    return db.supplierPayment.create({
      data: {
        supplierId: data.supplierId,
        purchaseId: data.purchaseId || null,
        amount: data.amount,
        paymentDate: data.paymentDate || new Date(),
        paymentMethod: data.paymentMethod || null,
        remark: data.remark || null,
      },
      include: {
        supplier: true,
        purchase: true,
      },
    });
  },

  async deletePayment(id: string): Promise<SupplierPaymentRecord> {
    return db.supplierPayment.delete({
      where: { id },
      include: {
        supplier: true,
        purchase: true,
      },
    });
  },

  async getTotalPaidBySupplier(supplierId: string): Promise<number> {
    const result = await db.supplierPayment.aggregate({
      where: { supplierId },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  },

  async getTotalPaidByPurchase(purchaseId: string): Promise<number> {
    const result = await db.supplierPayment.aggregate({
      where: { purchaseId },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  },

  async getSupplierPayableInfo(supplierId: string) {
    const [purchases, totalPaid] = await Promise.all([
      db.purchase.findMany({
        where: { supplierId, totalAmount: { gt: 0 } },
      }),
      this.getTotalPaidBySupplier(supplierId),
    ]);

    const totalPurchaseAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const remaining = Math.max(0, totalPurchaseAmount - totalPaid);

    return {
      supplierId,
      totalPurchaseAmount,
      totalPaid,
      remaining,
      purchaseCount: purchases.length,
    };
  },
};