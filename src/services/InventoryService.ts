import { db } from '@/lib/db';

export interface CreateInventoryCheckDTO {
  productId: string;
  currentStock: number;
  actualStock: number;
  difference: number;
  remark?: string;
}

export const InventoryService = {
  async getInventoryStats() {
    const [
      totalProducts,
      totalStock,
      lowStockProducts,
      outOfStockProducts,
    ] = await Promise.all([
      db.product.count(),
      db.product.aggregate({
        _sum: { stock: true },
      }),
      db.product.findMany({
        where: {
          AND: [
            { stock: { gt: 0 } },
            { stock: { lt: db.product.fields.minStock } },
            { minStock: { gt: 0 } },
          ],
        },
        include: { category: true },
      }),
      db.product.findMany({
        where: { stock: 0 },
        include: { category: true },
      }),
    ]);

    return {
      totalProducts,
      totalStock: totalStock._sum.stock || 0,
      lowStockProducts,
      outOfStockProducts,
    };
  },

  async getInventoryList(filters?: {
    categoryId?: string;
    keyword?: string;
    stockStatus?: 'all' | 'normal' | 'low' | 'out';
  }) {
    const where: any = {};

    if (filters?.categoryId && filters.categoryId !== '__all__') {
      where.categoryId = filters.categoryId;
    }
    if (filters?.keyword) {
      where.OR = [
        { name: { contains: filters.keyword } },
        { brand: { contains: filters.keyword } },
        { productSpec: { contains: filters.keyword } },
      ];
    }
    if (filters?.stockStatus === 'low') {
      where.AND = [
        { stock: { gt: 0 } },
        { stock: { lt: db.product.fields.minStock } },
        { minStock: { gt: 0 } },
      ];
    } else if (filters?.stockStatus === 'out') {
      where.stock = 0;
    }

    return db.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  },

  async createInventoryCheck(data: CreateInventoryCheckDTO) {
    return db.inventoryCheck.create({
      data: {
        productId: data.productId,
        currentStock: data.currentStock,
        actualStock: data.actualStock,
        difference: data.difference,
        remark: data.remark,
        checkedBy: 'system',
      },
    });
  },

  async adjustStock(productId: string, adjustment: number, reason: string) {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new Error('商品不存在');
    }

    const newStock = product.stock + adjustment;
    if (newStock < 0) {
      throw new Error('库存不能为负数');
    }

    await db.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    await db.inventoryCheck.create({
      data: {
        productId,
        currentStock: product.stock,
        actualStock: newStock,
        difference: adjustment,
        remark: reason,
        checkedBy: 'manual',
      },
    });

    return { productId, oldStock: product.stock, newStock, adjustment };
  },

  async getInventoryChanges(productId?: string, startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (productId) where.productId = productId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return db.inventoryCheck.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getLowStockAlerts() {
    const products = await db.product.findMany({
      where: {
        AND: [
          { stock: { gt: 0 } },
          { stock: { lt: db.product.fields.minStock } },
          { minStock: { gt: 0 } },
        ],
      },
      include: { category: true },
      orderBy: { stock: 'asc' },
    });

    return products.map(p => ({
      ...p,
      alertLevel: p.stock === 0 ? 'out' : 'low',
    }));
  },

  async getProducts() {
    return db.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  },

  async getCategories() {
    return db.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  },
};
