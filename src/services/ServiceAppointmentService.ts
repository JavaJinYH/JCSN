import { db } from '@/lib/db';
import { AuditLogService } from './AuditLogService';

export const ServiceAppointmentService = {
  async getAppointments() {
    return db.serviceAppointment.findMany({
      include: {
        contact: true,
        product: true,
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
        product: true,
      },
      orderBy: { appointmentDate: 'desc' },
    });
  },

  async createAppointment(data: {
    contactId?: string;
    productId?: string;
    appointmentDate: Date;
    serviceType: string;
    installer?: string;
    status?: string;
    notes?: string;
    installationFee?: number;
  }) {
    const result = await db.serviceAppointment.create({
      data: {
        contactId: data.contactId,
        productId: data.productId,
        appointmentDate: data.appointmentDate,
        serviceType: data.serviceType,
        installer: data.installer,
        status: data.status || '待上门',
        notes: data.notes,
        installationFee: data.installationFee || 0,
      },
    });

    await AuditLogService.createAuditLog({
      actionType: 'CREATE',
      entityType: 'ServiceAppointment',
      entityId: result.id,
      newValue: `${data.serviceType}${data.installer ? ` - ${data.installer}` : ''}`,
    });

    return result;
  },

  async updateAppointment(
    id: string,
    data: {
      contactId?: string;
      productId?: string;
      appointmentDate?: Date;
      serviceType?: string;
      installer?: string;
      status?: string;
      notes?: string;
      installationFee?: number;
    }
  ) {
    const old = await db.serviceAppointment.findUnique({ where: { id } });
    const result = await db.serviceAppointment.update({
      where: { id },
      data,
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
};
