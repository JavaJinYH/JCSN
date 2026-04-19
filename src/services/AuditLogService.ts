import { db } from '@/lib/db';

export const AuditLogService = {
  async getAuditLogs(where?: any) {
    return db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 500,
    });
  },
};
