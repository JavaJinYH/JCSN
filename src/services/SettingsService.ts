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
    shopAddress?: string;
    shopPhone?: string;
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
    const modelsToBackup = [
      'contact', 'entity', 'product', 'category',
      'saleOrder', 'orderItem', 'payment', 'sale', 'saleItem',
      'purchase', 'purchaseItem', 'purchaseReturn', 'purchaseReturnItem',
      'badDebtWriteOff', 'customerPrice', 'inventoryCheck', 'auditLog'
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
      version: '1.0',
      exportTime: new Date().toISOString(),
      system: '折柳建材管理系统',
      data: backup,
    };
  },

  async restoreData(data: Record<string, any[]>) {
    for (const [model, records] of Object.entries(data)) {
      try {
        await (db as any)[model].deleteMany({});
        if (records.length > 0) {
          await (db as any)[model].createMany({ data: records });
        }
      } catch (e) {
        console.warn(`[Restore] ${model} error:`, e);
      }
    }
  },
};
