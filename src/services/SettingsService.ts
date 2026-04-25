import { db } from '@/lib/db';

export const SettingsService = {
  async getSettings() {
    return db.systemSetting.findUnique({ where: { id: 'default' } });
  },

  async getCategories() {
    return db.category.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async upsertSettings(data: {
    shopName?: string;
    ownerName?: string;
    phone?: string;
    address?: string;
    idleTimeoutMinutes?: number;
    lockPassword?: string;
  }) {
    return db.systemSetting.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });
  },

  async updateIdleTimeout(value: number) {
    return db.systemSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default', shopName: '折柳建材', idleTimeoutMinutes: value, lockPassword: '' },
      update: { idleTimeoutMinutes: value },
    });
  },

  async updateLockPassword(newPassword: string) {
    return db.systemSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default', shopName: '折柳建材', idleTimeoutMinutes: 0, lockPassword: newPassword },
      update: { lockPassword: newPassword },
    });
  },

  async createCategory(data: { name: string; description?: string }) {
    return db.category.create({
      data: {
        name: data.name,
        description: data.description || null,
      },
    });
  },

  async updateCategory(id: string, data: { name: string; description?: string }) {
    return db.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
      },
    });
  },

  async deleteCategory(id: string) {
    return db.category.delete({ where: { id } });
  },

  async backupData() {
    // 按正确的备份顺序（从无依赖到有依赖）
    const modelsToBackup = [
      'dailyCounter',
      'category', 'brand', 'systemSetting', 'deliveryFee',
      'contactCategory',
      'contact', 'supplier', 'supplierPayment', 'entity', 'bizProject',
      'contactPhone', 'contactEntityRole', 'contactProjectRole',
      'product', 'productSpec', 'entityPrice', 'contactPrice',
      'purchaseOrder', 'purchase', 'purchaseReturn', 'purchaseReturnItem', 'purchaseOrderPhoto',
      'saleOrder', 'orderItem', 'orderPayment', 'saleOrderPhoto',
      'saleReturn', 'saleReturnItem',
      'saleSlip', 'saleSlipItem',
      'businessCommission',
      'dailyExpense',
      'serviceAppointment', 'serviceAppointmentItem',
      'deliveryRecord', 'paymentPlan',
      'receivable', 'receivableAuditLog', 'badDebtWriteOff',
      'collectionRecord', 'creditRecord',
      'inventoryCheck', 'inventoryCheckItem',
      'legacyBill', 'auditLog'
    ];

    const backup: Record<string, any[]> = {};

    for (const model of modelsToBackup) {
      try {
        const data = await (db as any)[model].findMany();
        backup[model] = data;
      } catch (e) {
        console.warn(`[Backup] ${model} not found or error:`, e);
      }
    }

    return {
      version: '2.0',
      exportTime: new Date().toISOString(),
      system: '折柳建材管理系统',
      data: backup,
    };
  },

  async restoreData(data: Record<string, any[]>) {
    // 按正确的删除顺序（从有依赖到无依赖）
    const deleteOrder = [
      'auditLog', 'legacyBill',
      'inventoryCheckItem', 'inventoryCheck',
      'creditRecord', 'collectionRecord',
      'badDebtWriteOff', 'receivableAuditLog', 'receivable',
      'paymentPlan', 'deliveryRecord',
      'serviceAppointmentItem', 'serviceAppointment',
      'dailyExpense',
      'businessCommission',
      'saleSlipItem', 'saleSlip',
      'saleReturnItem', 'saleReturn',
      'saleOrderPhoto', 'orderPayment', 'orderItem', 'saleOrder',
      'purchaseOrderPhoto', 'purchaseReturnItem', 'purchaseReturn', 'purchase', 'purchaseOrder',
      'entityPrice', 'contactPrice', 'productSpec', 'product',
      'contactProjectRole', 'contactEntityRole', 'contactPhone',
      'bizProject', 'entity', 'supplier', 'supplierPayment', 'contact',
      'contactCategory',
      'deliveryFee', 'systemSetting', 'brand', 'category',
      'dailyCounter'
    ];

    // 按正确的恢复顺序（从无依赖到有依赖）
    const createOrder = [
      'dailyCounter',
      'category', 'brand', 'systemSetting', 'deliveryFee',
      'contactCategory',
      'contact', 'supplier', 'supplierPayment', 'entity', 'bizProject',
      'contactPhone', 'contactEntityRole', 'contactProjectRole',
      'product', 'productSpec', 'entityPrice', 'contactPrice',
      'purchaseOrder', 'purchase', 'purchaseReturn', 'purchaseReturnItem', 'purchaseOrderPhoto',
      'saleOrder', 'orderItem', 'orderPayment', 'saleOrderPhoto',
      'saleReturn', 'saleReturnItem',
      'saleSlip', 'saleSlipItem',
      'businessCommission',
      'dailyExpense',
      'serviceAppointment', 'serviceAppointmentItem',
      'deliveryRecord', 'paymentPlan',
      'receivable', 'receivableAuditLog', 'badDebtWriteOff',
      'collectionRecord', 'creditRecord',
      'inventoryCheck', 'inventoryCheckItem',
      'legacyBill', 'auditLog'
    ];

    console.log('[Restore] Starting restore process...');

    // 先删除所有数据
    for (const model of deleteOrder) {
      if (data[model]) {
        try {
          await (db as any)[model].deleteMany({});
          console.log(`[Restore] Deleted ${model}`);
        } catch (e) {
          console.warn(`[Restore] Delete ${model} error (maybe doesn't exist):`, e);
        }
      }
    }

    // 再恢复数据
    for (const model of createOrder) {
      const records = data[model];
      if (records && records.length > 0) {
        try {
          await (db as any)[model].createMany({ data: records });
          console.log(`[Restore] Restored ${model}: ${records.length} records`);
        } catch (e) {
          console.error(`[Restore] Failed to restore ${model}:`, e);
          throw e;
        }
      }
    }

    console.log('[Restore] Complete!');
  },
};
