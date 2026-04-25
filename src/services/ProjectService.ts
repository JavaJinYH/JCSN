import { db } from '@/lib/db';
import { AuditLogService } from './AuditLogService';

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
    const project = await db.bizProject.create({
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

    await AuditLogService.createAuditLog({
      actionType: 'CREATE',
      entityType: 'BizProject',
      entityId: project.id,
      newValue: JSON.stringify({ name: project.name }),
    });

    return project;
  },

  async createAuditLog(data: {
    actionType: 'CREATE' | 'UPDATE' | 'DELETE';
    entityType: string;
    entityId: string;
    operatorName?: string;
    newValue?: string;
  }) {
    return db.auditLog.create({
      data: {
        actionType: data.actionType,
        entityType: data.entityType,
        entityId: data.entityId,
        operatorName: data.operatorName,
        newValue: data.newValue,
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

  async deleteProject(id: string) {
    const project = await db.bizProject.findUnique({ where: { id } });
    if (!project) throw new Error('项目不存在');

    await AuditLogService.createAuditLog({
      actionType: 'DELETE',
      entityType: 'BizProject',
      entityId: id,
      oldValue: JSON.stringify({ name: project.name }),
    });

    return db.bizProject.delete({
      where: { id },
    });
  },
};
