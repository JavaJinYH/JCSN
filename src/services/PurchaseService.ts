import { db } from '@/lib/db';
import { generateBatchNo } from '@/lib/utils';

export interface CreatePurchaseOrderDTO {
  items: CreatePurchaseItemDTO[];
  supplierId?: string | null;
  supplierName?: string | null;
  commonBatchNo?: string;
  commonRemark?: string;
  purchaseDate?: Date;
  needDelivery?: boolean;
  driverName?: string | null;
  driverPhone?: string | null;
  estimatedDeliveryDate?: Date | null;
}

export interface CreatePurchaseItemDTO {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderFilters {
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export const PurchaseService = {
  async createPurchaseOrder(data: CreatePurchaseOrderDTO) {
    const batchNo = data.commonBatchNo || generateBatchNo();
    const purchaseDate = data.purchaseDate || new Date();

    const order = await db.purchaseOrder.create({
      data: {
        batchNo,
        supplierId: data.supplierId || null,
        supplierName: data.supplierName || null,
        purchaseDate,
        remark: data.commonRemark || null,
        needDelivery: data.needDelivery || false,
        driverName: data.needDelivery ? (data.driverName || null) : null,
        driverPhone: data.needDelivery ? (data.driverPhone || null) : null,
        estimatedDeliveryDate: data.needDelivery ? (data.estimatedDeliveryDate || null) : null,
        deliveryStatus: data.needDelivery ? 'pending' : 'not_needed',
      },
    });

    const createdItems = [];
    for (const item of data.items) {
      const purchase = await db.purchase.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.quantity * item.unitPrice,
          supplierId: data.supplierId || null,
          supplierName: data.supplierName || null,
          purchaseDate,
          remark: data.commonRemark || null,
          needDelivery: data.needDelivery || false,
          driverName: data.needDelivery ? (data.driverName || null) : null,
          driverPhone: data.needDelivery ? (data.driverPhone || null) : null,
          estimatedDeliveryDate: data.needDelivery ? (data.estimatedDeliveryDate || null) : null,
          deliveryStatus: data.needDelivery ? 'pending' : 'not_needed',
        },
      });
      createdItems.push(purchase);
    }

    return { order, items: createdItems };
  },

  async getPurchaseOrders(filters?: PurchaseOrderFilters) {
    const where: any = {};
    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }
    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.purchaseDate = {};
      if (filters.startDate) where.purchaseDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.purchaseDate.lte = new Date(filters.endDate + 'T23:59:59');
    }
    if (filters?.keyword) {
      where.OR = [
        { batchNo: { contains: filters.keyword } },
        { supplierName: { contains: filters.keyword } },
        { items: { some: { product: { name: { contains: filters.keyword } } } } },
      ];
    }

    return db.purchaseOrder.findMany({
      where,
      include: {
        items: {
          include: {
            product: { include: { category: true } },
            supplier: true,
            photos: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        supplier: true,
      },
      orderBy: { purchaseDate: 'desc' },
      take: 100,
    });
  },

  async getPurchaseOrderById(id: string) {
    return db.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { category: true } },
            supplier: true,
            photos: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        supplier: true,
      },
    });
  },

  async updatePurchaseOrderStatus(id: string, status: string, extraData?: any) {
    const updateData: any = { status, ...extraData };
    if (status === 'sent') updateData.sentDate = new Date();
    if (status === 'delivered') updateData.deliveredDate = new Date();
    if (status === 'completed') updateData.completedDate = new Date();

    return db.purchaseOrder.update({
      where: { id },
      data: updateData,
    });
  },

  async updatePurchaseOrderDeliveryStatus(id: string, deliveryStatus: string) {
    const updateData: any = { deliveryStatus };
    if (deliveryStatus === 'delivered') {
      updateData.deliveredDate = new Date();
      updateData.status = 'delivered';
    }

    await db.purchaseOrder.update({
      where: { id },
      data: updateData,
    });

    await db.purchase.updateMany({
      where: { orderId: id },
      data: { deliveryStatus },
    });
  },

  async confirmPurchaseDelivery(id: string, actualQuantities: { [purchaseId: string]: number }) {
    const order = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new Error('进货单不存在');

    for (const item of order.items) {
      const actualQty = actualQuantities[item.id] ?? item.quantity;
      await db.purchase.update({
        where: { id: item.id },
        data: {
          quantity: actualQty,
          totalAmount: actualQty * item.unitPrice,
          status: 'delivered',
        },
      });

      await db.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: actualQty },
          lastPurchasePrice: item.unitPrice,
        },
      });
    }

    await db.purchaseOrder.update({
      where: { id },
      data: {
        status: 'delivered',
        deliveryStatus: 'delivered',
        deliveredDate: new Date(),
      },
    });

    return order;
  },

  async createPurchaseReturn(purchaseId: string, quantity: number, type: 'return' | 'exchange', newPurchaseId?: string) {
    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: true },
    });

    if (!purchase) throw new Error('进货记录不存在');

    const returnRecord = await db.purchaseReturn.create({
      data: {
        purchaseId,
        returnDate: new Date(),
        quantity,
        unitPrice: purchase.unitPrice,
        totalAmount: quantity * purchase.unitPrice,
        returnType: type,
        status: 'pending',
      },
    });

    await db.product.update({
      where: { id: purchase.productId },
      data: {
        stock: { decrement: quantity },
      },
    });

    if (type === 'exchange' && newPurchaseId) {
      await db.purchaseReturn.update({
        where: { id: returnRecord.id },
        data: { exchangePurchaseId: newPurchaseId },
      });
    }

    return returnRecord;
  },

  async createExchangePurchase(originalPurchaseId: string, newQuantity: number, newUnitPrice: number) {
    const original = await db.purchase.findUnique({
      where: { id: originalPurchaseId },
      include: { order: true },
    });

    if (!original) throw new Error('原进货记录不存在');

    const newPurchase = await db.purchase.create({
      data: {
        orderId: original.orderId,
        productId: original.productId,
        quantity: newQuantity,
        unitPrice: newUnitPrice,
        totalAmount: newQuantity * newUnitPrice,
        supplierId: original.supplierId,
        supplierName: original.supplierName,
        purchaseDate: new Date(),
        remark: `换货：替换原进货记录 ${original.id.slice(-8)}`,
        needDelivery: false,
        deliveryStatus: 'not_needed',
      },
    });

    await db.product.update({
      where: { id: original.productId },
      data: {
        stock: { increment: newQuantity },
        lastPurchasePrice: newUnitPrice,
      },
    });

    return newPurchase;
  },

  async deletePurchaseOrder(id: string) {
    const order = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new Error('进货单不存在');

    for (const item of order.items) {
      await db.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return db.purchaseOrder.delete({ where: { id } });
  },

  async getCategories() {
    return db.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  },

  async getProducts() {
    return db.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  },

  async getSuppliers() {
    return db.supplier.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async createPurchasePhoto(purchaseId: string, data: { url?: string; photoPath?: string; remark?: string; type?: string; photoType?: string; photoRemark?: string }) {
    return db.purchasePhoto.create({
      data: {
        purchaseId,
        url: data.url,
        photoPath: data.photoPath,
        type: data.type || data.photoType,
        remark: data.remark || data.photoRemark,
      },
    });
  },

  async updatePurchase(purchaseId: string, data: { quantity?: number; unitPrice?: number; totalAmount?: number; remark?: string | null; deliveryStatus?: string; deliveredDate?: Date; status?: string }) {
    return db.purchase.update({
      where: { id: purchaseId },
      data,
    });
  },

  async deletePurchase(purchaseId: string) {
    return db.purchase.delete({
      where: { id: purchaseId },
    });
  },
};