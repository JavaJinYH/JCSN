import { db } from '@/lib/db';
import { generateBatchNo } from '@/lib/utils';

export interface CreatePurchaseDTO {
  items: CreatePurchaseItemDTO[];
  supplierId?: string | null;
  supplierName?: string | null;
  commonBatchNo?: string;
  commonRemark?: string;
  purchaseDate: Date;
}

export interface CreatePurchaseItemDTO {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export const PurchaseService = {
  async createPurchase(data: CreatePurchaseDTO) {
    const batchNo = data.commonBatchNo || generateBatchNo();
    const createdPurchases = [];

    for (const item of data.items) {
      const purchase = await db.purchase.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.quantity * item.unitPrice,
          supplierId: data.supplierId || null,
          supplierName: data.supplierName || null,
          batchNo,
          purchaseDate: data.purchaseDate,
          remark: data.commonRemark || null,
        },
      });
      createdPurchases.push(purchase);

      await db.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
          lastPurchasePrice: item.unitPrice,
        },
      });

      if (data.supplierId) {
        const supplier = await db.supplier.findUnique({
          where: { id: data.supplierId },
          include: { supplierContact: true },
        });
        if (supplier?.supplierContact) {
          await db.product.update({
            where: { id: item.productId },
            data: {
              purchasePrice: item.unitPrice,
              supplierId: data.supplierId,
            },
          });
        }
      }
    }

    return createdPurchases;
  },

  async getPurchases(filters?: {
    supplierId?: string;
    productCategoryId?: string;
    startDate?: Date;
    endDate?: Date;
    keyword?: string;
  }) {
    const where: any = {};

    if (filters?.supplierId && filters.supplierId !== '__all__') {
      where.supplierId = filters.supplierId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.purchaseDate = {};
      if (filters.startDate) where.purchaseDate.gte = filters.startDate;
      if (filters.endDate) where.purchaseDate.lte = filters.endDate;
    }
    if (filters?.keyword) {
      where.OR = [
        { batchNo: { contains: filters.keyword } },
        { supplierName: { contains: filters.keyword } },
        { product: { name: { contains: filters.keyword } } },
      ];
    }
    if (filters?.productCategoryId && filters.productCategoryId !== '__all__') {
      where.product = { categoryId: filters.productCategoryId };
    }

    return db.purchase.findMany({
      where,
      include: {
        product: { include: { category: true } },
        supplier: true,
      },
      orderBy: { purchaseDate: 'desc' },
    });
  },

  async getPurchaseById(id: string) {
    return db.purchase.findUnique({
      where: { id },
      include: {
        product: { include: { category: true } },
        supplier: { include: { supplierContact: true } },
      },
    });
  },

  async deletePurchase(id: string) {
    const purchase = await db.purchase.findUnique({ where: { id } });
    if (!purchase) {
      throw new Error('进货记录不存在');
    }

    await db.product.update({
      where: { id: purchase.productId },
      data: {
        stock: {
          decrement: purchase.quantity,
        },
      },
    });

    return db.purchase.delete({ where: { id } });
  },
};
