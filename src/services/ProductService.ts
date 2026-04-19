import { db } from '@/lib/db';

export interface CreateProductDTO {
  name: string;
  categoryId?: string;
  brand?: string;
  specification?: string;
  model?: string;
  unit?: string;
  purchaseUnit?: string;
  unitRatio?: string;
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
    return db.product.create({
      data: {
        name: data.name,
        categoryId: data.categoryId || null,
        brand: data.brand || null,
        productSpec: data.specification || null,
        model: data.model || null,
        unit: data.unit || '个',
        purchaseUnit: data.purchaseUnit || null,
        unitRatio: data.unitRatio || '1',
        referencePrice: data.referencePrice || null,
        lastPurchasePrice: data.lastPurchasePrice || null,
        stock: data.stock || 0,
        minStock: data.minStock || 0,
        remark: data.remark || null,
        isPriceVolatile: data.isPriceVolatile || false,
      },
      include: { category: true },
    });
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
        { productSpec: { contains: filters.keyword } },
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

  async updateProduct(id: string, data: Partial<CreateProductDTO>) {
    return db.product.update({
      where: { id },
      data: {
        name: data.name,
        categoryId: data.categoryId,
        brand: data.brand,
        productSpec: data.specification,
        model: data.model,
        unit: data.unit,
        purchaseUnit: data.purchaseUnit,
        unitRatio: data.unitRatio,
        referencePrice: data.referencePrice,
        lastPurchasePrice: data.lastPurchasePrice,
        stock: data.stock,
        minStock: data.minStock,
        remark: data.remark,
        isPriceVolatile: data.isPriceVolatile,
      },
      include: { category: true },
    });
  },

  async deleteProduct(id: string) {
    return db.product.delete({ where: { id } });
  },

  async updateStock(id: string, quantity: number, operation: 'increment' | 'decrement') {
    const updateData = operation === 'increment'
      ? { stock: { increment: quantity } }
      : { stock: { decrement: quantity } };

    return db.product.update({
      where: { id },
      data: updateData,
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
      select: { id: true, name: true, brand: true, specification: true },
    });
  },
};
