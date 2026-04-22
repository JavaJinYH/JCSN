import { db } from '@/lib/db';

export const ProjectService = {
  async getEntities() {
    return db.entity.findMany({
      where: { entityType: { not: 'cash' } },
      orderBy: { name: 'asc' },
    });
  },

  async getProjects(where?: any, include?: any) {
    return db.bizProject.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getProjectById(id: string) {
    return db.bizProject.findUnique({
      where: { id },
      include: {
        entity: true,
        contactProjectRoles: {
          include: { contact: true },
        },
      },
    });
  },

  async getOrdersByEntity(entityId: string) {
    return db.saleOrder.findMany({
      where: { projectId: entityId },
      orderBy: { saleDate: 'desc' },
    });
  },

  async getOrdersByProject(projectId: string) {
    return db.saleOrder.findMany({
      where: { projectId },
      include: {
        buyer: true,
        items: { include: { product: true } },
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  async createProject(data: {
    name: string;
    entityId: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
    status?: string;
    remark?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return db.bizProject.create({
      data: {
        name: data.name,
        entityId: data.entityId,
        address: data.address,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        status: data.status || '进行中',
        remark: data.remark,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  },

  async createAuditLog(data: {
    action: string;
    entityType: string;
    entityId: string;
    operatorName?: string;
    remark?: string;
  }) {
    return db.auditLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        operatorName: data.operatorName,
        remark: data.remark,
      },
    });
  },

  async updateProject(id: string, data: {
    name?: string;
    entityId?: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
    status?: string;
    remark?: string;
  }) {
    return db.bizProject.update({
      where: { id },
      data: {
        name: data.name,
        entityId: data.entityId,
        address: data.address,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        status: data.status,
        remark: data.remark,
      },
    });
  },
};
