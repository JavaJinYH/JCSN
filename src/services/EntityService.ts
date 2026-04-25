import { db } from '@/lib/db';
import { AuditLogService } from './AuditLogService';

export const EntityService = {
  async getEntities() {
    return db.entity.findMany({
      include: { contact: true },
      orderBy: { name: 'asc' },
    });
  },

  async getEntityById(id: string) {
    return db.entity.findUnique({
      where: { id },
      include: { contact: true },
    });
  },

  async getEntityStats(entityId: string) {
    const orders = await db.saleOrder.findMany({
      where: { paymentEntityId: entityId },
      select: { totalAmount: true, paidAmount: true },
    });
    return {
      total: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      paid: orders.reduce((sum, o) => sum + o.paidAmount, 0),
      count: orders.length,
    };
  },

  async getAllEntitiesStats() {
    const entities = await db.entity.findMany({
      include: { contact: true },
      orderBy: { name: 'asc' },
    });
    const stats: Record<string, { total: number; paid: number; count: number }> = {};
    for (const entity of entities) {
      const orders = await db.saleOrder.findMany({
        where: { paymentEntityId: entity.id },
        select: { totalAmount: true, paidAmount: true },
      });
      stats[entity.id] = {
        total: orders.reduce((sum, o) => sum + o.totalAmount, 0),
        paid: orders.reduce((sum, o) => sum + o.paidAmount, 0),
        count: orders.length,
      };
    }
    return { entities, stats };
  },

  async getProjectsByEntity(entityId: string, status?: string) {
    const where: any = { entityId };
    if (status) where.status = status;
    return db.bizProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getCategories() {
    return db.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  },

  async getContacts() {
    return db.contact.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async getEntityOrders(entityId: string, filters?: { status?: string; startDate?: Date; endDate?: Date }) {
    const where: any = { paymentEntityId: entityId };
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.saleDate = {};
      if (filters.startDate) where.saleDate.gte = filters.startDate;
      if (filters.endDate) where.saleDate.lte = filters.endDate;
    }
    return db.saleOrder.findMany({
      where,
      include: {
        buyer: true,
        paymentEntity: true,
        project: true,
        items: { include: { product: true } },
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  async getProjects(entityFilters?: { status?: string }) {
    const where: any = {};
    if (entityFilters?.status) where.status = entityFilters.status;
    return db.bizProject.findMany({
      where,
      include: {
        entity: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createEntity(data: { name: string; entityType?: string; contactId?: string; address?: string; remark?: string }) {
    const entity = await db.entity.create({
      data: {
        name: data.name,
        entityType: data.entityType || 'personal',
        contactId: data.contactId,
        address: data.address,
        remark: data.remark,
      },
    });

    await AuditLogService.createAuditLog({
      actionType: 'CREATE',
      entityType: 'Entity',
      entityId: entity.id,
      newValue: JSON.stringify({ name: entity.name, type: entity.entityType }),
    });

    return entity;
  },

  async updateEntity(id: string, data: { name?: string; entityType?: string; contactId?: string; address?: string; remark?: string }) {
    return db.entity.update({
      where: { id },
      data: {
        name: data.name,
        entityType: data.entityType,
        contactId: data.contactId,
        address: data.address,
        remark: data.remark,
      },
    });
  },

  async deleteEntity(id: string) {
    const entity = await db.entity.findUnique({ where: { id } });
    if (!entity) throw new Error('挂靠主体不存在');

    await AuditLogService.createAuditLog({
      actionType: 'DELETE',
      entityType: 'Entity',
      entityId: id,
      oldValue: JSON.stringify({ name: entity.name, type: entity.entityType }),
    });

    return db.entity.delete({
      where: { id },
    });
  },

  async findCashEntity() {
    return db.entity.findFirst({
      where: { entityType: 'cash' },
    });
  },

  async ensureCashEntity() {
    let cashEntity = await this.findCashEntity();
    if (!cashEntity) {
      cashEntity = await db.entity.create({
        data: {
          name: '现金账户',
          entityType: 'cash',
          address: '系统内置',
          creditLimit: 0,
          remark: '系统内置现金账户，用于无挂靠主体销售',
        },
      });
    }
    return cashEntity;
  },

  async migratePersonalWalkInToCash() {
    const personalWalkIn = await db.entity.findFirst({
      where: {
        name: '散客',
        entityType: 'personal',
      },
    });

    if (!personalWalkIn) {
      return { message: '没有找到个人类型的散客实体，无需迁移', count: 0 };
    }

    const cashEntity = await this.ensureCashEntity();

    const relatedOrders = await db.saleOrder.findMany({
      where: { paymentEntityId: personalWalkIn.id },
    });

    if (relatedOrders.length === 0) {
      await db.entity.delete({ where: { id: personalWalkIn.id } });
      return { message: '散客实体没有关联订单，已直接删除', count: 0 };
    }

    await db.saleOrder.updateMany({
      where: { paymentEntityId: personalWalkIn.id },
      data: { paymentEntityId: cashEntity.id },
    });

    await db.entity.delete({ where: { id: personalWalkIn.id } });

    return {
      message: `已将 ${relatedOrders.length} 个销售订单迁移到现金账户，并删除散客实体`,
      count: relatedOrders.length,
    };
  },

  // 获取挂靠主体的历史商品价格
  async getEntityPrices(entityId: string) {
    const entityPrices = await db.entityPrice.findMany({
      where: { entityId },
    });
    const priceMap: Record<string, number> = {};
    for (const ep of entityPrices) {
      priceMap[ep.productId] = ep.lastPrice;
    }

    // 如果 EntityPrice 里没有，尝试从历史订单里找
    const orders = await db.saleOrder.findMany({
      where: { paymentEntityId: entityId },
      include: { items: true },
      orderBy: { saleDate: 'desc' },
      take: 20,
    });

    for (const order of orders) {
      for (const item of order.items) {
        if (!priceMap[item.productId]) {
          priceMap[item.productId] = item.sellingPriceSnapshot;
        }
      }
    }

    return priceMap;
  },

  // 保存/更新挂靠主体的商品历史价格
  async saveEntityPrice(entityId: string, productId: string, price: number) {
    const existing = await db.entityPrice.findUnique({
      where: { entityId_productId: { entityId, productId } },
    });

    if (existing) {
      return db.entityPrice.update({
        where: { entityId_productId: { entityId, productId } },
        data: { lastPrice: price, transactionCount: existing.transactionCount + 1 },
      });
    } else {
      return db.entityPrice.create({
        data: { entityId, productId, lastPrice: price },
      });
    }
  },
};