import { db } from '@/lib/db';

export const InventoryCheckService = {
  async getProducts() {
    return db.product.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async getCheckHistory() {
    return db.inventoryCheck.findMany({
      orderBy: { checkDate: 'desc' },
      take: 10,
    });
  },

  async createCheck(data: {
    checkDate: Date;
    operator?: string;
    totalItems: number;
    totalProfit: number;
    totalLoss: number;
    status?: string;
    details?: any;
    items?: {
      create: Array<{
        productId: string;
        systemStock: number;
        actualStock: number;
        profitLoss: number;
        costPrice: number;
        amount: number;
      }>;
    };
  }) {
    return db.inventoryCheck.create({
      data: {
        checkDate: data.checkDate,
        operator: data.operator,
        totalItems: data.totalItems,
        totalProfit: data.totalProfit,
        totalLoss: data.totalLoss,
        status: data.status || 'completed',
        details: data.details,
        items: data.items,
      },
    });
  },

  async updateProductStock(productId: string, stock: number) {
    return db.product.update({
      where: { id: productId },
      data: { stock },
    });
  },
};
