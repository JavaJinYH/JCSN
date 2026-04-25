import { db } from '@/lib/db';
import { AuditLogService } from './AuditLogService';

export const ServiceAppointmentService = {
  async getAppointments() {
    return db.serviceAppointment.findMany({
      include: {
        contact: true,
        project: true,
        installerContact: true,
        items: {
          include: {
            product: true,
            order: true,
          },
        },
      },
      orderBy: { appointmentDate: 'desc' },
    });
  },

  async getAppointmentsByDateRange(start: Date, end: Date) {
    return db.serviceAppointment.findMany({
      where: {
        appointmentDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        contact: true,
        project: true,
        installerContact: true,
        items: {
          include: {
            product: true,
            order: true,
          },
        },
      },
      orderBy: { appointmentDate: 'desc' },
    });
  },

  async createAppointment(data: {
    contactId?: string;
    projectId?: string;
    appointmentDate: Date;
    serviceType: string;
    installerType?: string;
    installerContactId?: string;
    status?: string;
    notes?: string;
    installationFee?: number;
    items?: Array<{
      orderId?: string;
      orderItemId?: string;
      productId: string;
      quantity: number;
      remark?: string;
    }>;
  }) {
    const result = await db.serviceAppointment.create({
      data: {
        contactId: data.contactId,
        projectId: data.projectId,
        appointmentDate: data.appointmentDate,
        serviceType: data.serviceType,
        installerType: data.installerType,
        installerContactId: data.installerContactId,
        status: data.status || '待上门',
        notes: data.notes,
        installationFee: data.installationFee || 0,
        items: data.items ? {
          create: data.items.map(item => ({
            orderId: item.orderId,
            orderItemId: item.orderItemId,
            productId: item.productId,
            quantity: item.quantity,
            remark: item.remark,
          })),
        } : undefined,
      },
      include: {
        items: true,
      },
    });

    await AuditLogService.createAuditLog({
      actionType: 'CREATE',
      entityType: 'ServiceAppointment',
      entityId: result.id,
      newValue: `${data.serviceType}${data.installerType ? ` - ${data.installerType}` : ''}`,
    });

    return result;
  },

  async updateAppointment(
    id: string,
    data: {
      contactId?: string;
      projectId?: string;
      appointmentDate?: Date;
      serviceType?: string;
      installerType?: string;
      installerContactId?: string;
      status?: string;
      notes?: string;
      installationFee?: number;
      items?: Array<{
        orderId?: string;
        orderItemId?: string;
        productId: string;
        quantity: number;
        remark?: string;
      }>;
    }
  ) {
    const old = await db.serviceAppointment.findUnique({ where: { id } });
    
    // 如果有items，先删除旧的再创建新的
    const updateData: any = {
      contactId: data.contactId,
      projectId: data.projectId,
      appointmentDate: data.appointmentDate,
      serviceType: data.serviceType,
      installerType: data.installerType,
      installerContactId: data.installerContactId,
      status: data.status,
      notes: data.notes,
      installationFee: data.installationFee,
    };

    if (data.items) {
      updateData.items = {
        deleteMany: {},
        create: data.items.map(item => ({
          orderId: item.orderId,
          orderItemId: item.orderItemId,
          productId: item.productId,
          quantity: item.quantity,
          remark: item.remark,
        })),
      };
    }

    const result = await db.serviceAppointment.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
      },
    });

    await AuditLogService.createAuditLog({
      actionType: 'UPDATE',
      entityType: 'ServiceAppointment',
      entityId: id,
      oldValue: old?.status,
      newValue: data.status,
    });

    return result;
  },

  async deleteAppointment(id: string) {
    const old = await db.serviceAppointment.findUnique({ where: { id } });
    await db.serviceAppointment.delete({ where: { id } });

    await AuditLogService.createAuditLog({
      actionType: 'DELETE',
      entityType: 'ServiceAppointment',
      entityId: id,
      oldValue: old ? `${old.serviceType} - ${old.status}` : undefined,
    });

    return { success: true };
  },

  // 获取项目的订单和商品
  async getProjectOrdersWithItems(projectId: string) {
    return db.saleOrder.findMany({
      where: {
        projectId: projectId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  // 按联系人获取订单和商品（不依赖项目）
  async getContactOrdersWithItems(contactId: string) {
    return db.saleOrder.findMany({
      where: {
        buyerId: contactId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  // 获取所有可用的销售订单（用于服务预约快速选择）
  async getAvailableOrdersForService() {
    return db.saleOrder.findMany({
      where: {
        status: { not: '已取消' },
      },
      include: {
        buyer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
      take: 50,
    });
  }
};
