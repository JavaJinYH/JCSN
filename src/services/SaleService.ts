import { db } from '@/lib/db';
import { generateInvoiceNo } from '@/lib/utils';

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
  payerId?: string | null;
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

export interface CreateSaleDraftDTO {
  buyerId: string;
  payerId?: string | null;
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

export interface SaleDraftResult {
  draft: any;
  items: any[];
  payments?: any[];
}

export interface CreateOrderItemDTO {
  productId: string;
  productName: string;
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
    if (data.buyerId === '__none__') {
      const walkInCustomer = await db.contact.findFirst({
        where: { name: '散客' },
      });
      if (!walkInCustomer) {
        throw new Error('散客不存在，请先创建散客联系人');
      }
      buyerId = walkInCustomer.id;
    }

    let entityId = data.paymentEntityId;
    if (data.paymentEntityId === '__cash__') {
      const cashEntity = await db.entity.findFirst({
        where: { entityType: 'cash' },
      });
      entityId = cashEntity?.id || '';
    }

    const sale = await db.saleOrder.create({
      data: {
        invoiceNo: generateInvoiceNo(),
        buyerId,
        payerId: data.payerId === '__none__' ? null : data.payerId || null,
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
            productName: item.productName,
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

      if (data.payerId && data.payerId !== '__none__') {
        await db.customerPrice.upsert({
          where: {
            contactId_productId: {
              contactId: data.payerId,
              productId: item.productId,
            },
          },
          create: {
            contactId: data.payerId,
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
        payer: true,
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

  async getLegacySales() {
    return db.sale.findMany({
      include: { customer: true, _count: { select: { items: true } } },
      orderBy: { saleDate: 'desc' },
    });
  },

  async getContacts() {
    return db.contact.findMany({ orderBy: { name: 'asc' } });
  },

  async getSaleOrderById(id: string) {
    return db.saleOrder.findUnique({
      where: { id },
      include: {
        buyer: true,
        payer: true,
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

  /**
   * 创建销售草稿（暂存）
   * @param data - 草稿数据
   * @returns 创建的草稿结果
   */
  async createSaleDraft(data: CreateSaleDraftDTO): Promise<SaleDraftResult> {
    let buyerId = data.buyerId;
    if (data.buyerId === '__none__') {
      const walkInCustomer = await db.contact.findFirst({
        where: { name: '散客' },
      });
      if (!walkInCustomer) {
        throw new Error('散客不存在，请先创建散客联系人');
      }
      buyerId = walkInCustomer.id;
    }

    let entityId = data.paymentEntityId;
    if (data.paymentEntityId === '__cash__') {
      entityId = '__cash__';
    } else if (data.paymentEntityId) {
      const entity = await db.entity.findUnique({
        where: { id: data.paymentEntityId },
      });
      entityId = entity?.id || data.paymentEntityId;
    }

    const draft = await db.saleSlip.create({
      data: {
        buyerCustomerId: buyerId,
        payerCustomerId: data.payerId === '__none__' ? null : data.payerId || null,
        introducerCustomerId: data.introducerId === '__none__' ? null : data.introducerId || null,
        pickerCustomerId: data.pickerId === '__none__' ? null : data.pickerId || null,
        pickerName: data.pickerName || null,
        pickerPhone: data.pickerPhone || null,
        projectId: data.projectId === '__none__' ? null : data.projectId || null,
        paymentEntityId: entityId,
        totalAmount: data.totalAmount,
        discount: data.discount,
        discountRate: 100,
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

  /**
   * 更新销售草稿
   * @param slipId - 草稿ID
   * @param data - 更新数据
   */
  async updateSaleDraft(slipId: string, data: Partial<CreateSaleDraftDTO>): Promise<SaleDraftResult> {
    let buyerId = data.buyerId;
    if (data.buyerId === '__none__') {
      const walkInCustomer = await db.contact.findFirst({
        where: { name: '散客' },
      });
      buyerId = walkInCustomer?.id || '';
    }

    let entityId = data.paymentEntityId;
    if (data.paymentEntityId === '__cash__') {
      entityId = '__cash__';
    } else if (data.paymentEntityId) {
      const entity = await db.entity.findUnique({
        where: { id: data.paymentEntityId },
      });
      entityId = entity?.id || data.paymentEntityId;
    }

    const draft = await db.saleSlip.update({
      where: { id: slipId },
      data: {
        buyerCustomerId: buyerId,
        payerCustomerId: data.payerId === '__none__' ? null : data.payerId || null,
        introducerCustomerId: data.introducerId === '__none__' ? null : data.introducerId || null,
        pickerCustomerId: data.pickerId === '__none__' ? null : data.pickerId || null,
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

  /**
   * 获取所有草稿
   */
  async getSaleDrafts() {
    return db.saleSlip.findMany({
      where: { status: 'draft' },
      include: {
        items: true,
        buyerCustomer: true,
        payerCustomer: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  /**
   * 获取单个草稿
   */
  async getSaleDraftById(id: string) {
    return db.saleSlip.findUnique({
      where: { id },
      include: {
        items: true,
        buyerCustomer: true,
        payerCustomer: true,
        introducerCustomer: true,
        pickerCustomer: true,
      },
    });
  },

  /**
   * 提交草稿为正式订单
   * @param slipId - 草稿ID
   */
  async submitDraft(slipId: string): Promise<SaleOrderResult> {
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
        buyerId: slip.buyerCustomerId || '',
        payerId: slip.payerCustomerId,
        introducerId: slip.introducerCustomerId,
        pickerId: slip.pickerCustomerId,
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
            productName: '',
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

  /**
   * 删除草稿
   */
  async deleteSaleDraft(slipId: string) {
    await db.saleSlip.delete({
      where: { id: slipId },
    });
  },
};