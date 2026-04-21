import { db } from '@/lib/db';

export interface CreateAuditLogData {
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  operatorId?: string;
  ipAddress?: string;
}

export const AuditLogService = {
  async getAuditLogs(where?: any) {
    return db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 500,
    });
  },

  async createAuditLog(data: CreateAuditLogData) {
    return db.auditLog.create({
      data: {
        actionType: data.actionType,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue,
        newValue: data.newValue,
        operatorId: data.operatorId,
        ipAddress: data.ipAddress,
        timestamp: new Date(),
      },
    });
  },
};
