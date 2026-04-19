import { db } from '@/lib/db';

export const EntityService = {
  async getEntities() {
    return db.entity.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async getEntityById(id: string) {
    return db.entity.findUnique({
      where: { id },
    });
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
        items: true,
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
    return db.entity.create({
      data: {
        name: data.name,
        entityType: data.entityType || 'personal',
        contactId: data.contactId,
        address: data.address,
        remark: data.remark,
      },
    });
  },

  async deleteEntity(id: string) {
    return db.entity.delete({
      where: { id },
    });
  },
};