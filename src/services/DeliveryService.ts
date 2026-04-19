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
        deliveryRecords: true,
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
        product: true,
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
    orderId?: string;
    orderType?: string;
    entityId?: string;
    saleId?: string | null;
    zoneName?: string;
    recipientName?: string;
    recipientPhone?: string | null;
    deliveryAddress?: string;
    distance?: number;
    weight?: number;
    baseFee?: number;
    distanceFee?: number;
    weightFee?: number;
    totalFee?: number;
    deliveryStatus?: string;
    driverName?: string | null;
    driverPhone?: string | null;
    remark?: string | null;
  }) {
    return db.deliveryRecord.create({
      data: {
        orderId: data.orderId,
        orderType: data.orderType,
        entityId: data.entityId,
        saleId: data.saleId,
        zoneName: data.zoneName,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        deliveryAddress: data.deliveryAddress,
        distance: data.distance,
        weight: data.weight,
        baseFee: data.baseFee,
        distanceFee: data.distanceFee,
        weightFee: data.weightFee,
        totalFee: data.totalFee,
        deliveryStatus: data.deliveryStatus || 'pending',
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        remark: data.remark,
      },
    });
  },

  async updateDeliveryRecord(id: string, data: any) {
    return db.deliveryRecord.update({
      where: { id },
      data,
    });
  },

  async updatePurchaseDeliveryStatus(id: string, data: { deliveryStatus: string; deliveredDate?: Date; status?: string }) {
    return db.purchase.update({
      where: { id },
      data: {
        deliveryStatus: data.deliveryStatus,
        deliveredDate: data.deliveredDate,
        status: data.status,
      },
    });
  },
};