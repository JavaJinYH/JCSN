import { db } from '@/lib/db';

export const DeliveryService = {
  async getDeliveryFees() {
    return db.deliveryFee.findMany({
      orderBy: { zoneName: 'asc' },
    });
  },

  async getDeliveryRecords(filters?: {
    status?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};
    if (filters?.status && filters.status !== 'all') {
      where.deliveryStatus = filters.status;
    }
    if (filters?.entityId && filters.entityId !== '__all__') {
      where.entityId = filters.entityId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return db.deliveryRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getSaleOrders(filters?: {
    status?: string;
    entityId?: string;
    needDelivery?: boolean;
  }) {
    const where: any = {};
    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }
    if (filters?.entityId && filters.entityId !== '__all__') {
      where.paymentEntityId = filters.entityId;
    }
    if (filters?.needDelivery) {
      where.needDelivery = true;
    }

    return db.saleOrder.findMany({
      where,
      include: {
        buyer: true,
        paymentEntity: true,
        project: true,
        deliveryRecord: true,
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  async getPurchases(filters?: {
    status?: string;
    needDelivery?: boolean;
  }) {
    const where: any = {};
    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }
    if (filters?.needDelivery) {
      where.needDelivery = true;
    }

    return db.purchase.findMany({
      where,
      include: {
        supplier: true,
        deliveryRecord: true,
      },
      orderBy: { purchaseDate: 'desc' },
    });
  },

  async createDeliveryFee(data: {
    zoneName: string;
    baseFee?: number;
    perKgFee?: number;
    perKmFee?: number;
    minWeight?: number;
    maxWeight?: number;
    remark?: string;
  }) {
    return db.deliveryFee.create({
      data: {
        zoneName: data.zoneName,
        baseFee: data.baseFee || 0,
        perKgFee: data.perKgFee || 0,
        perKmFee: data.perKmFee || 0,
        minWeight: data.minWeight || 0,
        maxWeight: data.maxWeight || 100,
        remark: data.remark,
      },
    });
  },

  async deleteDeliveryFee(id: string) {
    return db.deliveryFee.delete({
      where: { id },
    });
  },

  async createDeliveryRecord(data: {
    orderId: string;
    orderType: string;
    entityId: string;
    driverName?: string;
    driverPhone?: string;
    deliveryAddress?: string;
    deliveryFee?: number;
    deliveryStatus?: string;
  }) {
    return db.deliveryRecord.create({
      data: {
        orderId: data.orderId,
        orderType: data.orderType,
        entityId: data.entityId,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        deliveryAddress: data.deliveryAddress,
        totalFee: data.deliveryFee || 0,
        deliveryStatus: data.deliveryStatus || 'pending',
      },
    });
  },

  async updateDeliveryRecord(id: string, data: any) {
    return db.deliveryRecord.update({
      where: { id },
      data,
    });
  },

  async updatePurchaseDeliveryStatus(id: string, data: { deliveryStatus: string; deliveryRecordId?: string }) {
    return db.purchase.update({
      where: { id },
      data: {
        deliveryStatus: data.deliveryStatus,
        deliveryRecordId: data.deliveryRecordId,
      },
    });
  },
};