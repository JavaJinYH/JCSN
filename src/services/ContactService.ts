import { db } from '@/lib/db';

export interface CreateContactDTO {
  name: string;
  code?: string;
  contactType?: string;
  primaryPhone?: string;
  address?: string;
  remark?: string;
  autoTag?: string;
  manualTag?: string;
}

export interface CreatePhoneDTO {
  phone: string;
  isPrimary?: boolean;
  label?: string;
}

export interface CustomerScoreResult {
  valueScore: number;
  autoTag: string;
  creditLevel: string;
  riskLevel: string;
  creditLimit: number;
  details: {
    annualSalesScore: number;
    profitMarginScore: number;
    paymentSpeedScore: number;
    overdueRateScore: number;
    rebateRatioScore: number;
  };
}

export const ContactService = {
  async createContact(data: CreateContactDTO, phones?: CreatePhoneDTO[]) {
    const contact = await db.contact.create({
      data: {
        name: data.name,
        code: data.code || `C${Date.now().toString(36).toUpperCase()}`,
        contactType: data.contactType || 'customer',
        primaryPhone: data.primaryPhone,
        address: data.address,
        remark: data.remark,
        autoTag: data.autoTag,
        manualTag: data.manualTag,
        ...(phones && phones.length > 0 && {
          phonesObj: {
            create: phones.map(p => ({
              phone: p.phone,
              isPrimary: p.isPrimary || false,
              label: p.label,
            })),
          },
        }),
      },
      include: { phonesObj: true },
    });
    return contact;
  },

  async getContacts(filters?: {
    contactType?: string;
    keyword?: string;
    tag?: string;
  }) {
    const where: any = {};

    if (filters?.contactType && filters.contactType !== 'all') {
      where.contactType = filters.contactType;
    }
    if (filters?.keyword) {
      where.OR = [
        { name: { contains: filters.keyword } },
        { primaryPhone: { contains: filters.keyword } },
        { code: { contains: filters.keyword } },
      ];
    }
    if (filters?.tag) {
      where.OR = [
        { autoTag: { contains: filters.tag } },
        { manualTag: { contains: filters.tag } },
      ];
    }

    return db.contact.findMany({
      where,
      include: { phonesObj: true },
      orderBy: { name: 'asc' },
    });
  },

  async getContactById(id: string) {
    return db.contact.findUnique({
      where: { id },
      include: { phonesObj: true },
    });
  },

  async updateContact(id: string, data: Partial<CreateContactDTO>) {
    return db.contact.update({
      where: { id },
      data: {
        name: data.name,
        contactType: data.contactType,
        primaryPhone: data.primaryPhone,
        address: data.address,
        remark: data.remark,
        autoTag: data.autoTag,
        manualTag: data.manualTag,
      },
      include: { phonesObj: true },
    });
  },

  async deleteContact(id: string) {
    return db.contact.delete({ where: { id } });
  },

  async addPhone(contactId: string, phone: string, isPrimary = false, label?: string) {
    return db.contactPhone.create({
      data: {
        contactId,
        phone,
        isPrimary,
        label,
      },
    });
  },

  async removePhone(phoneId: string) {
    return db.contactPhone.delete({ where: { id: phoneId } });
  },

  async getContactStats(contactId: string) {
    const [salesCount, totalAmount, receivables] = await Promise.all([
      db.saleOrder.count({ where: { buyerId: contactId } }),
      db.saleOrder.aggregate({
        where: { buyerId: contactId },
        _sum: { totalAmount: true },
      }),
      db.receivable.findMany({
        where: { contactId },
      }),
    ]);

    const totalReceivable = receivables.reduce((sum, r) => sum + r.remainingAmount, 0);

    return {
      salesCount,
      totalAmount: totalAmount._sum.totalAmount || 0,
      totalReceivable,
    };
  },

  async getContactPrices(contactId: string) {
    return db.contactPrice.findMany({
      where: { contactId },
    });
  },

  // 获取买家的历史商品价格（优先从 ContactPrice，其次从历史订单）
  async getBuyerPrices(buyerId: string) {
    const priceMap: Record<string, number> = {};
    const contactPrices = await db.contactPrice.findMany({
      where: { contactId: buyerId },
    });
    for (const cp of contactPrices) {
      priceMap[cp.productId] = cp.lastPrice;
    }

    // 如果 CustomerPrice 里没有，从最近订单找
    const orders = await db.saleOrder.findMany({
      where: { buyerId },
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

  // 保存/更新买家的商品历史价格
  async saveBuyerPrice(buyerId: string, productId: string, price: number) {
    const existing = await db.contactPrice.findUnique({
      where: { contactId_productId: { contactId: buyerId, productId } }
    });
    if (existing) {
      return db.contactPrice.update({
        where: { contactId_productId: { contactId: buyerId, productId } },
        data: { lastPrice: price, transactionCount: existing.transactionCount + 1 }
      });
    } else {
      return db.contactPrice.create({
        data: { contactId: buyerId, productId, lastPrice: price }
      });
    }
  },

  async getContactOrders(contactId: string) {
    return db.saleOrder.findMany({
      where: { buyerId: contactId },
      include: { project: true },
      orderBy: { saleDate: 'desc' },
    });
  },

  async getContactLastOrder(contactId: string) {
    return db.saleOrder.findFirst({
      where: { buyerId: contactId },
      orderBy: { saleDate: 'desc' },
    });
  },

  async getContactRebates(contactId: string) {
    return db.businessCommission.findMany({
      where: { contactId: contactId },
      orderBy: { recordedAt: 'desc' },
    });
  },

  async getContactProjectRoles(contactId: string) {
    return db.contactProjectRole.findMany({
      where: { contactId },
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getPersonalEntityByContact(contactId: string) {
    return db.entity.findFirst({
      where: { contactId },
    });
  },

  async findContactByPhone(phone: string) {
    return db.contact.findFirst({
      where: { primaryPhone: phone },
    });
  },

  async countContacts() {
    return db.contact.count();
  },

  async checkPhoneExists(phone: string, excludeId?: string) {
    const where: any = { primaryPhone: phone };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }
    return db.contact.findFirst({ where });
  },

  async findWalkInCustomer() {
    return db.contact.findFirst({
      where: { name: '散客', contactType: 'customer' },
    });
  },

  async ensureWalkInCustomer() {
    let walkInCustomer = await this.findWalkInCustomer();
    if (!walkInCustomer) {
      const contactCount = await db.contact.count();
      walkInCustomer = await db.contact.create({
        data: {
          name: '散客',
          code: `C${String(contactCount + 1).padStart(3, '0')}`,
          contactType: 'customer',
          primaryPhone: '00000000000',
          remark: '系统内置散客账户，用于无联系人销售单',
        },
      });
    }
    return walkInCustomer;
  },

  async calculateCustomerScore(contactId: string): Promise<CustomerScoreResult> {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const orders = await db.saleOrder.findMany({
      where: {
        buyerId: contactId,
        saleDate: { gte: oneYearAgo },
      },
      include: {
        items: true,
        receivables: true,
        rebates: true,
      },
    });

    let totalSales = 0;
    let totalProfit = 0;
    let totalReceivables = 0;
    let overdueReceivables = 0;
    let totalDaysOverdue = 0;
    let totalRebates = 0;

    orders.forEach((order) => {
      const orderNet = order.totalAmount - (order.discount || 0);
      totalSales += orderNet;

      order.items.forEach((item) => {
        totalProfit += (item.sellingPriceSnapshot - item.costPriceSnapshot) * item.quantity;
      });

      order.receivables.forEach((rec) => {
        totalReceivables += rec.originalAmount;
        if (rec.isOverdue) {
          overdueReceivables += 1;
          totalDaysOverdue += rec.overdueDays;
        }
      });

      order.rebates.forEach((rebate) => {
        totalRebates += rebate.rebateAmount;
      });
    });

    const avgDaysOverdue = totalReceivables > 0 ? totalDaysOverdue / totalReceivables : 0;
    const overdueRate = totalReceivables > 0 ? overdueReceivables / totalReceivables : 0;
    const avgProfitMargin = totalSales > 0 ? totalProfit / totalSales : 0;
    const rebateRatio = totalSales > 0 ? totalRebates / totalSales : 0;

    const targetSales = 100000;
    const targetProfitMargin = 0.3;

    const annualSalesScore = Math.min(100, (totalSales / targetSales) * 30);
    const profitMarginScore = Math.min(100, (avgProfitMargin / targetProfitMargin) * 25);
    const paymentSpeedScore = Math.max(0, Math.min(100, ((30 - avgDaysOverdue) / 30) * 20));
    const overdueRateScore = Math.max(0, Math.min(100, (1 - overdueRate) * 15));
    const rebateRatioScore = Math.max(0, Math.min(100, (1 - rebateRatio) * 10));

    const totalScore = annualSalesScore + profitMarginScore + paymentSpeedScore + overdueRateScore + rebateRatioScore;
    const normalizedScore = Math.round(totalScore / 10);

    let autoTag = 'cross';
    if (normalizedScore >= 8.5) autoTag = 'star';
    else if (normalizedScore >= 6) autoTag = 'triangle';
    else if (normalizedScore >= 4) autoTag = 'circle';

    let creditLevel = 'normal';
    if (normalizedScore >= 8.5) creditLevel = 'excellent';
    else if (normalizedScore >= 7) creditLevel = 'good';
    else if (normalizedScore <= 3) creditLevel = 'poor';
    else if (normalizedScore <= 1.5) creditLevel = 'blocked';

    let riskLevel = 'low';
    if (overdueRate > 0.5 || avgDaysOverdue > 60) riskLevel = 'critical';
    else if (overdueRate > 0.3 || avgDaysOverdue > 30) riskLevel = 'high';
    else if (overdueRate > 0.1 || avgDaysOverdue > 15) riskLevel = 'medium';

    let creditLimit = 0;
    if (normalizedScore >= 8.5) creditLimit = 50000;
    else if (normalizedScore >= 7) creditLimit = 30000;
    else if (normalizedScore >= 5) creditLimit = 15000;
    else if (normalizedScore >= 3) creditLimit = 5000;

    return {
      valueScore: normalizedScore,
      autoTag,
      creditLevel,
      riskLevel,
      creditLimit,
      details: {
        annualSalesScore: Math.round(annualSalesScore),
        profitMarginScore: Math.round(profitMarginScore),
        paymentSpeedScore: Math.round(paymentSpeedScore),
        overdueRateScore: Math.round(overdueRateScore),
        rebateRatioScore: Math.round(rebateRatioScore),
      },
    };
  },

  async updateCustomerScore(contactId: string) {
    const scoreResult = await this.calculateCustomerScore(contactId);
    
    return db.contact.update({
      where: { id: contactId },
      data: {
        valueScore: scoreResult.valueScore,
        autoTag: scoreResult.autoTag,
        creditLevel: scoreResult.creditLevel,
        riskLevel: scoreResult.riskLevel,
        creditLimit: scoreResult.creditLimit,
        lastCreditReviewDate: new Date(),
      },
    });
  },

  async recalculateAllCustomerScores() {
    const contacts = await db.contact.findMany({
      where: { contactType: 'customer' },
    });

    const results = [];
    for (const contact of contacts) {
      try {
        const updated = await this.updateCustomerScore(contact.id);
        results.push(updated);
      } catch (error) {
        console.error(`Failed to update score for contact ${contact.id}:`, error);
      }
    }

    return results;
  },

  async getContactWithCreditInfo(contactId: string) {
    return db.contact.findUnique({
      where: { id: contactId },
      include: {
        phonesObj: true,
      },
    });
  },

  async setBlacklist(contactId: string, isBlacklist: boolean, reason?: string) {
    return db.contact.update({
      where: { id: contactId },
      data: {
        blacklist: isBlacklist,
        blacklistReason: reason,
      },
    });
  },
};
