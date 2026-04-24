import { db } from '@/lib/db';
import { generateBatchNo } from '@/lib/utils';
import { CounterService } from './CounterService';

export interface CreatePhotoDTO {
  file?: File;
  preview: string;
  remark?: string;
  type: string;
}

export interface CreatePurchaseOrderDTO {
  items: CreatePurchaseItemDTO[];
  supplierId?: string | null;
  supplierName?: string | null;
  commonBatchNo?: string;
  commonRemark?: string | null;
  purchaseDate?: Date;
  needDelivery?: boolean;
  driverName?: string | null;
  driverPhone?: string | null;
  estimatedDeliveryDate?: Date | null;
  photos?: CreatePhotoDTO[];
  paymentAmount?: number;
  paymentMethod?: string;
  paymentRemark?: string;
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
    const purchaseDate = data.purchaseDate || new Date();
    const { seq: purchaseSeq } = await CounterService.getNextPurchaseSeq();
    const batchNo = data.commonBatchNo || generateBatchNo(purchaseSeq);

    const order = await db.purchaseOrder.create({
      data: {
        batchNo,
        internalSeq: purchaseSeq,
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

    let savedPhotos: any[] = [];
    if (data.photos && data.photos.length > 0 && createdItems.length > 0) {
      for (const photo of data.photos) {
        if (photo.file) {
          const fileName = `purchase_${order.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const result = await (window as any).electronAPI.photo.save(fileName, photo.preview, 'purchases');
          if (result.success) {
            const savedPhoto = await db.purchaseOrderPhoto.create({
              data: {
                purchaseOrderId: order.id,
                photoPath: result.data.path,
                photoType: photo.type,
                photoRemark: photo.remark || null,
              },
            });
            savedPhotos.push(savedPhoto);
          }
        }
      }
    }

    let payment = null;
    if (data.supplierId && data.paymentAmount && data.paymentAmount > 0) {
      payment = await db.supplierPayment.create({
        data: {
          supplierId: data.supplierId,
          purchaseId: createdItems[0]?.id || null,
          amount: data.paymentAmount,
          paymentDate: purchaseDate,
          paymentMethod: data.paymentMethod || null,
          remark: data.paymentRemark || `进货付款（单号：${batchNo}）`,
        },
      });
    }

    return { order, items: createdItems, photos: savedPhotos, payment };
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
          },
          orderBy: { createdAt: 'asc' },
        },
        supplier: true,
        photos: true,
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
          },
          orderBy: { createdAt: 'asc' },
        },
        supplier: true,
        photos: true,
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

    let hasShortage = false;
    for (const item of order.items) {
      const orderedQty = item.quantity;
      const actualQty = actualQuantities[item.id] ?? orderedQty;
      const shortageQty = Math.max(0, orderedQty - actualQty);

      if (shortageQty > 0) {
        hasShortage = true;
      }

      await db.purchase.update({
        where: { id: item.id },
        data: {
          quantity: actualQty,
          totalAmount: actualQty * item.unitPrice,
          shortageQty: shortageQty,
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

    return { ...order, hasShortage };
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

  async markPendingReturn(purchaseId: string, returnQty: number, reason?: string) {
    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: true },
    });

    if (!purchase) throw new Error('进货记录不存在');

    if (returnQty <= 0) throw new Error('退货数量必须大于0');
    if (returnQty > purchase.quantity - purchase.pendingReturnQty) {
      throw new Error(`可退货数量不足，剩余可退：${purchase.quantity - purchase.pendingReturnQty}`);
    }

    await db.purchase.update({
      where: { id: purchaseId },
      data: {
        pendingReturnQty: { increment: returnQty },
      },
    });

    return { success: true, message: `已标记待退货 ${returnQty} 件` };
  },

  async confirmReturn(purchaseId: string, orderId: string | null, returnQty: number, unitPrice: number, isPriceVolatile: boolean, isCompleted: boolean) {
    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
      include: { supplier: true },
    });

    if (!purchase) throw new Error('进货记录不存在');

    if (returnQty <= 0) throw new Error('退货数量必须大于0');

    const totalRefund = returnQty * unitPrice;

    const returnRecord = await db.purchaseReturn.create({
      data: {
        purchaseId,
        totalAmount: totalRefund,
        remark: isPriceVolatile ? '价格波动商品，按市场价退货' : null,
        items: {
          create: {
            productId: purchase.productId,
            returnQuantity: returnQty,
            unitPrice: unitPrice,
            amount: totalRefund,
            marketPrice: isPriceVolatile ? unitPrice : null,
          },
        },
      },
    });

    if (isCompleted) {
      await db.product.update({
        where: { id: purchase.productId },
        data: { stock: { decrement: returnQty } },
      });

      if (purchase.pendingReturnQty > 0) {
        await db.purchase.update({
          where: { id: purchaseId },
          data: { pendingReturnQty: { decrement: returnQty } },
        });
      }

      if (purchase.supplierId && totalRefund > 0) {
        await db.supplierPayment.create({
          data: {
            supplierId: purchase.supplierId,
            purchaseId: purchaseId,
            amount: -totalRefund,
            paymentDate: new Date(),
            paymentMethod: null,
            remark: `退货冲账：${purchase.product?.name} x${returnQty}`,
          },
        });
      }
    }

    return { success: true, returnRecord, totalRefund };
  },

  async createPurchaseReturnWithItems(purchaseId: string, quantity: number, unitPrice: number, isPriceVolatile: boolean, exchangePurchaseId?: string) {
    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: true },
    });

    if (!purchase) throw new Error('进货记录不存在');

    const returnRecord = await db.purchaseReturn.create({
      data: {
        purchaseId,
        totalAmount: quantity * unitPrice,
        items: {
          create: {
            productId: purchase.productId,
            returnQuantity: quantity,
            unitPrice: unitPrice,
            amount: quantity * unitPrice,
            marketPrice: isPriceVolatile ? unitPrice : null,
          },
        },
      },
    });

    await db.product.update({
      where: { id: purchase.productId },
      data: { stock: { decrement: quantity } },
    });

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

  async getPurchaseHistoryByProduct(productId: string) {
    return db.purchase.findMany({
      where: { productId },
      orderBy: { purchaseDate: 'asc' },
      include: { supplier: true },
    });
  },

  async createPurchaseOrderPhoto(purchaseOrderId: string, data: { url?: string; photoPath?: string; remark?: string; type?: string; photoType?: string; photoRemark?: string }) {
    return db.purchaseOrderPhoto.create({
      data: {
        purchaseOrderId,
        photoPath: data.photoPath || data.url || '',
        photoType: data.type || data.photoType || 'delivery',
        photoRemark: data.remark || data.photoRemark || null,
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