import { db } from '@/lib/db';
import { AuditLogService } from './AuditLogService';

export interface CreateProductDTO {
  code?: string;
  name: string;
  categoryId?: string;
  brand?: string;
  specification?: string;
  model?: string;
  unit?: string;
  purchaseUnit?: string;
  unitRatio?: number | string;
  referencePrice?: number;
  lastPurchasePrice?: number;
  stock?: number;
  minStock?: number;
  remark?: string;
  isPriceVolatile?: boolean;
  photos?: string[];
}

export const ProductService = {
  async createProduct(data: CreateProductDTO) {
    const product = await db.product.create({
      data: {
        code: data.code || null,
        name: data.name,
        categoryId: data.categoryId || undefined,
        brand: data.brand || null,
        specification: data.specification || null,
        model: data.model || null,
        unit: data.unit || '个',
        purchaseUnit: data.purchaseUnit || null,
        unitRatio: typeof data.unitRatio === 'string'
          ? parseFloat(data.unitRatio) || 1
          : data.unitRatio || 1,
        referencePrice: data.referencePrice || null,
        lastPurchasePrice: data.lastPurchasePrice || null,
        stock: data.stock || 0,
        minStock: data.minStock || 0,
        isPriceVolatile: data.isPriceVolatile || false,
      },
      include: { category: true },
    });

    await AuditLogService.createAuditLog({
      actionType: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      newValue: JSON.stringify({ name: product.name, category: product.category?.name }),
    });

    return product;
  },

  async getProducts(filters?: {
    categoryId?: string;
    keyword?: string;
    brand?: string;
    showLowStock?: boolean;
  }) {
    const where: any = {};

    if (filters?.categoryId && filters.categoryId !== '__all__') {
      where.categoryId = filters.categoryId;
    }
    if (filters?.keyword) {
      where.OR = [
        { name: { contains: filters.keyword } },
        { brand: { contains: filters.keyword } },
        { specification: { contains: filters.keyword } },
        { model: { contains: filters.keyword } },
      ];
    }
    if (filters?.brand) {
      where.brand = filters.brand;
    }
    if (filters?.showLowStock) {
      where.AND = [
        { stock: { lt: db.product.fields.minStock } },
        { minStock: { gt: 0 } },
      ];
    }

    return db.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  },

  async getProductById(id: string) {
    return db.product.findUnique({
      where: { id },
      include: { category: true },
    });
  },

  async updateProduct(id: string, data: {
    name?: string;
    categoryId?: string;
    brand?: string;
    specification?: string;
    model?: string;
    unit?: string;
    purchaseUnit?: string;
    unitRatio?: number | string;
    referencePrice?: number;
    lastPurchasePrice?: number;
    stock?: number | { increment?: number; decrement?: number };
    minStock?: number;
    remark?: string;
    isPriceVolatile?: boolean;
    photos?: string[];
  }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.specification !== undefined) updateData.specification = data.specification;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.purchaseUnit !== undefined) updateData.purchaseUnit = data.purchaseUnit;
    if (data.unitRatio !== undefined) {
      updateData.unitRatio = typeof data.unitRatio === 'string'
        ? parseFloat(data.unitRatio) || 1
        : data.unitRatio;
    }
    if (data.referencePrice !== undefined) updateData.referencePrice = data.referencePrice;
    if (data.lastPurchasePrice !== undefined) updateData.lastPurchasePrice = data.lastPurchasePrice;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.minStock !== undefined) updateData.minStock = data.minStock;
    if (data.remark !== undefined) updateData.remark = data.remark;
    if (data.isPriceVolatile !== undefined) updateData.isPriceVolatile = data.isPriceVolatile;
    if (data.photos !== undefined) updateData.photos = data.photos;

    return db.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  },

  async deleteProduct(id: string) {
    const product = await db.product.findUnique({ where: { id } });
    if (!product) throw new Error('商品不存在');

    await AuditLogService.createAuditLog({
      actionType: 'DELETE',
      entityType: 'Product',
      entityId: id,
      oldValue: JSON.stringify({ name: product.name }),
    });

    return db.product.delete({ where: { id } });
  },

  async updateStock(id: string, quantity: number, operation: 'increment' | 'decrement') {
    const updateData = operation === 'increment'
      ? { stock: { increment: quantity } }
      : { stock: { decrement: quantity } };

    return db.product.update({
       where: { id },
       data: updateData,
       include: { category: true },
     });
  },

  async getLowStockProducts() {
    return db.product.findMany({
      where: {
        AND: [
          { stock: { lt: db.product.fields.minStock } },
          { minStock: { gt: 0 } },
        ],
      },
      include: { category: true },
      orderBy: { stock: 'asc' },
    });
  },

  async getProductsByBrand(brand: string) {
    return db.product.findMany({
      where: { brand },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  },

  async getBrands() {
    const products = await db.product.findMany({
      where: { brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
    });
    return products.map(p => p.brand).filter(Boolean) as string[];
  },

  async getCategories() {
    return db.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  },

  async createCategory(data: { name: string; sortOrder?: number }) {
    return db.category.create({
      data: {
        name: data.name,
        sortOrder: data.sortOrder || 0,
      },
    });
  },

  async getProductNames() {
    return db.product.findMany({
      select: { 
        id: true, 
        name: true, 
        brand: true, 
        specification: true,
        categoryId: true 
      },
    });
  },

  async findSimilarProducts(name: string, brand?: string | null, specification?: string | null) {
    const where: any = { name };
    if (brand) where.brand = brand;
    if (specification) where.specification = specification;

    return db.product.findMany({
      where,
      include: { category: true },
    });
  },

  async checkDuplicateCode(code: string) {
    const existing = await db.product.findUnique({ where: { code } });
    return !!existing;
  },

  async generateProductCode() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `P${dateStr}`;

    const lastProduct = await db.product.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
    });

    let sequence = 1;
    if (lastProduct?.code) {
      const lastSeq = parseInt(lastProduct.code.replace(prefix, ''), 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  },

  // 新增：获取商品销售统计
  async getProductSalesStats(productId: string, days: number = 90): Promise<{
    totalPurchased: number;
    totalSold: number;
    recentSold: number;
    lastSaleDate: Date | null;
    firstPurchaseDate: Date | null;
    turnoverRate: number;
  }> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 累计采购量
    const purchases = await db.purchase.findMany({
      where: { productId },
    });
    const totalPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0);
    const firstPurchaseDate = purchases.length > 0
      ? new Date(Math.min(...purchases.map(p => p.createdAt.getTime())))
      : null;

    // 近N天销售
    const recentOrderItems = await db.orderItem.findMany({
      where: {
        productId,
        order: { saleDate: { gte: cutoffDate } },
      },
    });
    const recentSold = recentOrderItems.reduce((sum, item) => sum + item.quantity, 0);

    // 累计销售
    const allOrderItems = await db.orderItem.findMany({
      where: { productId },
      include: { order: true },
    });
    const totalSold = allOrderItems.reduce((sum, item) => sum + item.quantity, 0);

    // 最后销售日期
    const lastSaleOrderItem = allOrderItems.length > 0
      ? allOrderItems.sort((a, b) => b.order.saleDate.getTime() - a.order.saleDate.getTime())[0]
      : null;
    const lastSaleDate = lastSaleOrderItem ? lastSaleOrderItem.order.saleDate : null;

    // 周转率
    const turnoverRate = totalPurchased > 0 ? (totalSold / totalPurchased) * 100 : 0;

    return {
      totalPurchased,
      totalSold,
      recentSold,
      lastSaleDate,
      firstPurchaseDate,
      turnoverRate,
    };
  },

  // 新增：获取商品销售状态
  async getProductSalesStatus(productId: string): Promise<'hot' | 'normal' | 'slow'> {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) return 'normal';

    // 手动标记优先
    if (product.isManualSlowMoving) return 'slow';
    if (product.isManualHot) return 'hot';

    const stats = await this.getProductSalesStats(productId);

    // 畅销判断：近30天有销售 且 周转率 >=30%
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const isRecentSold = stats.lastSaleDate && stats.lastSaleDate >= thirtyDaysAgo;
    if (isRecentSold && stats.turnoverRate >= 30) {
      return 'hot';
    }

    // 滞销判断：入库 >90天 且 周转率 <15%
    if (stats.firstPurchaseDate) {
      const daysSinceFirstPurchase = (Date.now() - stats.firstPurchaseDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceFirstPurchase > 90 && stats.turnoverRate < 15) {
        return 'slow';
      }
    }

    return 'normal';
  },
};
