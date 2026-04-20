import { db } from '@/lib/db';
import { generateInvoiceNo } from '@/lib/utils';
import { ContactService } from './ContactService';
import { EntityService } from './EntityService';
import { ProductService } from './ProductService';
import { ReceivableService } from './ReceivableService';

export interface CreatePaymentDTO {
  method: string;
  amount: number;
  payerName?: string | null;
}

export interface CreatePhotoDTO {
  file?: File;
  preview: string;
  remark?: string;
  type: string;
}

export interface CreateSaleOrderDTO {
  buyerId: string;
  introducerId?: string | null;
  pickerId?: string | null;
  pickerName?: string | null;
  pickerPhone?: string | null;
  projectId?: string | null;
  paymentEntityId: string;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  writtenInvoiceNo?: string | null;
  remark?: string | null;
  needDelivery?: boolean;
  deliveryAddress?: string | null;
  deliveryFee?: number;
  items: CreateOrderItemDTO[];
  payments?: CreatePaymentDTO[];
  photos?: CreatePhotoDTO[];
}



export interface CreateOrderItemDTO {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  costPriceSnapshot: number;
  sellingPriceSnapshot: number;
}

export interface SaleOrderResult {
  sale: any;
  items: any[];
  receivable?: any;
  deliveryRecord?: any;
  photos?: any[];
}

export const SaleService = {
  /**
   * 创建销售订单
   * @param data - 订单创建数据
   * @returns 创建的订单结果
   * @throws {Error} 手写单号已存在
   * @throws {Error} 散客不存在
   */
  async createSaleOrder(data: CreateSaleOrderDTO): Promise<SaleOrderResult> {
    if (data.writtenInvoiceNo) {
      const existing = await db.saleOrder.findFirst({
        where: { writtenInvoiceNo: data.writtenInvoiceNo },
      });
      if (existing) {
        throw new Error('该手写单号已存在，请使用其他单号或留空');
      }
    }

    let buyerId = data.buyerId;
    if (!buyerId || buyerId === '__none__') {
      const walkInCustomer = await ContactService.ensureWalkInCustomer();
      buyerId = walkInCustomer.id;
    } else {
      const buyerExists = await db.contact.findUnique({ where: { id: buyerId } });
      if (!buyerExists) {
        throw new Error('选择的买家不存在，请重新选择');
      }
    }

    let entityId = data.paymentEntityId;
    if (!entityId || entityId === '__none__' || entityId === '__cash__') {
      const cashEntity = await EntityService.ensureCashEntity();
      entityId = cashEntity.id;
    } else {
      const entityExists = await db.entity.findUnique({ where: { id: entityId } });
      if (!entityExists) {
        throw new Error('选择的挂靠主体不存在，请重新选择');
      }
    }

    const productIds = data.items.map(item => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      const missingIds = productIds.filter(id => !products.find(p => p.id === id));
      throw new Error(`商品不存在: ${missingIds.join(', ')}`);
    }

    const sale = await db.saleOrder.create({
      data: {
        invoiceNo: generateInvoiceNo(),
        buyerId,
        introducerId: data.introducerId === '__none__' ? null : data.introducerId || null,
        pickerId: data.pickerId === '__none__' ? null : data.pickerId || null,
        pickerName: data.pickerName || null,
        pickerPhone: data.pickerPhone || null,
        projectId: data.projectId === '__none__' ? null : data.projectId || null,
        paymentEntityId: entityId,
        totalAmount: data.totalAmount,
        discount: data.discount,
        paidAmount: data.paidAmount,
        writtenInvoiceNo: data.writtenInvoiceNo || null,
        remark: data.remark || null,
        needDelivery: data.needDelivery || false,
        deliveryAddress: data.needDelivery ? data.deliveryAddress : null,
        deliveryFee: data.needDelivery ? (data.deliveryFee || 0) : 0,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            costPriceSnapshot: item.costPriceSnapshot,
            sellingPriceSnapshot: item.sellingPriceSnapshot,
          })),
        },
        payments: data.payments && data.payments.length > 0 ? {
          create: data.payments
            .filter(p => p.amount > 0)
            .map(p => ({
              amount: p.amount,
              method: p.method,
              payerName: p.payerName || null,
              paidAt: new Date(),
            })),
        } : undefined,
      },
    });

    const remainingAmount = data.totalAmount - data.paidAmount;
    let receivable;
    if (remainingAmount > 0) {
      receivable = await db.receivable.create({
        data: {
          orderId: sale.id,
          originalAmount: data.totalAmount,
          paidAmount: data.paidAmount,
          remainingAmount,
        },
      });
    }

    let deliveryRecord;
    if (data.needDelivery) {
      const contact = await db.contact.findUnique({ where: { id: buyerId } });
      deliveryRecord = await db.deliveryRecord.create({
        data: {
          saleOrderId: sale.id,
          recipientName: contact?.name || data.pickerName || '客户',
          recipientPhone: contact?.primaryPhone || data.pickerPhone,
          deliveryAddress: data.deliveryAddress || '',
          totalFee: data.deliveryFee || 0,
          deliveryStatus: 'pending',
          zoneName: '默认区域',
        },
      });
    }

    for (const item of data.items) {
      await db.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      if (data.buyerId) {
        await db.customerPrice.upsert({
          where: {
            customerId_productId: {
              customerId: data.buyerId,
              productId: item.productId,
            },
          },
          create: {
            customerId: data.buyerId,
            productId: item.productId,
            lastPrice: item.unitPrice,
            transactionCount: 1,
          },
          update: {
            lastPrice: item.unitPrice,
            transactionCount: { increment: 1 },
          },
        });
      }
    }

    let savedPhotos: any[] = [];
    if (data.photos && data.photos.length > 0) {
      for (const photo of data.photos) {
        if (photo.file) {
          const fileName = `sale_${sale.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const result = await (window as any).electronAPI.photo.save(fileName, photo.preview, 'sales');
          if (result.success) {
            const savedPhoto = await db.saleOrderPhoto.create({
              data: {
                saleOrderId: sale.id,
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

    return { sale, items: data.items, receivable, deliveryRecord, photos: savedPhotos };
  },

  async getSaleOrders(filters?: {
    buyerId?: string;
    paymentEntityId?: string;
    projectId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    keyword?: string;
  }) {
    const where: any = {};

    if (filters?.buyerId && filters.buyerId !== '__all__') {
      where.buyerId = filters.buyerId;
    }
    if (filters?.paymentEntityId && filters.paymentEntityId !== '__all__') {
      where.paymentEntityId = filters.paymentEntityId;
    }
    if (filters?.projectId && filters.projectId !== '__all__') {
      where.projectId = filters.projectId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.saleDate = {};
      if (filters.startDate) where.saleDate.gte = filters.startDate;
      if (filters.endDate) where.saleDate.lte = filters.endDate;
    }
    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    const orders = await db.saleOrder.findMany({
      where,
      include: {
        buyer: true,
        introducer: true,
        picker: true,
        paymentEntity: true,
        project: true,
        items: true,
        payments: true,
        receivables: true,
      },
      orderBy: { saleDate: 'desc' },
    });

    return orders;
  },

  async getContacts() {
    return db.contact.findMany({ orderBy: { name: 'asc' } });
  },

  async getSaleOrderById(id: string) {
    return db.saleOrder.findUnique({
      where: { id },
      include: {
        buyer: true,
        introducer: true,
        picker: true,
        paymentEntity: true,
        project: true,
        items: { include: { product: true } },
        payments: true,
        receivables: true,
        photos: true,
        returns: { include: { items: true } },
      },
    });
  },

  async updateSaleOrder(id: string, data: Partial<CreateSaleOrderDTO>) {
    return db.saleOrder.update({
      where: { id },
      data: {
        paidAmount: data.paidAmount,
        remark: data.remark,
      },
    });
  },

  async createSaleReturn(saleOrderId: string, items: { productId: string; quantity: number; unitPrice: number }[]) {
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const returnRecord = await db.saleReturn.create({
      data: {
        saleOrderId,
        totalAmount,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            returnQuantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
          })),
        },
      },
    });

    for (const item of items) {
      await ProductService.updateStock(item.productId, item.quantity, 'increment');
    }

    try {
      await ReceivableService.incrementRemainingByOrderId(saleOrderId, totalAmount);
    } catch (e) {
      console.warn('[SaleService] 更新欠款失败:', e);
    }

    return returnRecord;
  },

  async createSaleDraft(data: CreateSaleOrderDTO) {
    let buyerId = data.buyerId;
    if (!buyerId || buyerId === '__none__') {
      const walkInCustomer = await ContactService.ensureWalkInCustomer();
      buyerId = walkInCustomer.id;
    }

    let entityId = data.paymentEntityId;
    if (!entityId || entityId === '__none__' || entityId === '__cash__') {
      const cashEntity = await EntityService.ensureCashEntity();
      entityId = cashEntity.id;
    }

    const draft = await db.saleSlip.create({
      data: {
        buyerId: buyerId,
        introducerId: data.introducerId === '__none__' ? null : data.introducerId || null,
        pickerId: data.pickerId === '__none__' ? null : data.pickerId || null,
        pickerName: data.pickerName || null,
        pickerPhone: data.pickerPhone || null,
        projectId: data.projectId === '__none__' ? null : data.projectId || null,
        paymentEntityId: entityId,
        totalAmount: data.totalAmount,
        discount: data.discount,
        paidAmount: data.paidAmount,
        writtenInvoiceNo: data.writtenInvoiceNo || null,
        remark: data.remark || null,
        needDelivery: data.needDelivery || false,
        deliveryAddress: data.needDelivery ? data.deliveryAddress : null,
        deliveryFee: data.needDelivery ? (data.deliveryFee || 0) : 0,
        status: 'draft',
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
        payments: JSON.stringify(data.payments || []),
      },
      include: {
        items: true,
      },
    });

    return { draft, items: data.items, payments: data.payments };
  },

  async updateSaleDraft(slipId: string, data: Partial<CreateSaleOrderDTO>) {
    let buyerId = data.buyerId;
    if (!buyerId || buyerId === '__none__') {
      const walkInCustomer = await ContactService.ensureWalkInCustomer();
      buyerId = walkInCustomer.id;
    }

    let entityId = data.paymentEntityId;
    if (!entityId || entityId === '__none__' || entityId === '__cash__') {
      const cashEntity = await EntityService.ensureCashEntity();
      entityId = cashEntity.id;
    }

    const draft = await db.saleSlip.update({
      where: { id: slipId },
      data: {
        buyerId: buyerId,
        introducerId: data.introducerId === '__none__' ? null : data.introducerId || null,
        pickerId: data.pickerId === '__none__' ? null : data.pickerId || null,
        pickerName: data.pickerName || null,
        pickerPhone: data.pickerPhone || null,
        projectId: data.projectId === '__none__' ? null : data.projectId || null,
        paymentEntityId: entityId,
        totalAmount: data.totalAmount,
        discount: data.discount,
        paidAmount: data.paidAmount,
        writtenInvoiceNo: data.writtenInvoiceNo || null,
        remark: data.remark || null,
        needDelivery: data.needDelivery || false,
        deliveryAddress: data.needDelivery ? data.deliveryAddress : null,
        deliveryFee: data.needDelivery ? (data.deliveryFee || 0) : 0,
        items: data.items ? {
          deleteMany: {},
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        } : undefined,
        payments: data.payments ? JSON.stringify(data.payments) : undefined,
      },
      include: {
        items: true,
      },
    });

    return { draft, items: data.items || [], payments: data.payments };
  },

  async getSaleDrafts() {
    return db.saleSlip.findMany({
      where: { status: 'draft' },
      include: {
        items: true,
        buyer: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async getSaleDraftById(id: string) {
    return db.saleSlip.findUnique({
      where: { id },
      include: {
        items: true,
        buyer: true,
        introducer: true,
        picker: true,
      },
    });
  },

  async submitDraft(slipId: string) {
    const slip = await db.saleSlip.findUnique({
      where: { id: slipId },
      include: { items: true },
    });

    if (!slip) {
      throw new Error('草稿不存在');
    }

    const payments = slip.payments ? JSON.parse(slip.payments) : [];

    let entityId = slip.paymentEntityId;
    if (entityId === '__cash__') {
      const cashEntity = await db.entity.findFirst({
        where: { entityType: 'cash' },
      });
      entityId = cashEntity?.id || '';
    }

    const sale = await db.saleOrder.create({
      data: {
        invoiceNo: generateInvoiceNo(),
        buyerId: slip.buyerId || '',
        introducerId: slip.introducerId,
        pickerId: slip.pickerId,
        pickerName: slip.pickerName,
        pickerPhone: slip.pickerPhone,
        projectId: slip.projectId,
        paymentEntityId: entityId || '__cash__',
        totalAmount: slip.totalAmount,
        discount: slip.discount,
        paidAmount: slip.paidAmount,
        writtenInvoiceNo: slip.writtenInvoiceNo,
        remark: slip.remark,
        needDelivery: slip.needDelivery || false,
        deliveryAddress: slip.needDelivery ? slip.deliveryAddress : null,
        deliveryFee: slip.needDelivery ? (slip.deliveryFee || 0) : 0,
        status: 'completed',
        items: {
          create: slip.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            costPriceSnapshot: 0,
            sellingPriceSnapshot: item.unitPrice,
          })),
        },
        payments: {
          create: payments
            .filter((p: any) => p.amount > 0)
            .map((p: any) => ({
              amount: p.amount,
              method: p.method,
              payerName: p.payerName || null,
              paidAt: new Date(),
            })),
        },
      },
    });

    for (const item of slip.items) {
      await db.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    await db.saleSlip.update({
      where: { id: slipId },
      data: { status: 'completed' },
    });

    return { sale, items: slip.items };
  },

  async deleteSaleDraft(slipId: string) {
    await db.saleSlip.delete({
      where: { id: slipId },
    });
  },
};