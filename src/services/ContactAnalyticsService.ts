import { db } from '../lib/db';
import { EntityCreditService } from './EntityCreditService';

export interface ContactAsEntityAnalytics {
  contactId: string;
  contactName: string;
  entityName: string;
  totalSales: number;
  orderCount: number;
  avgProfitMargin: number;
  totalProfit: number;
  avgPaymentDays: number;
  badDebtRate: number;
  creditScore?: number;
  creditLevel?: string;
  riskLevel?: string;
}

export interface ContactAsIntroducerAnalytics {
  contactId: string;
  contactName: string;
  introducedOrderCount: number;
  introducedTotalSales: number;
  avgProfitMargin: number;
  avgPaymentDays: number;
  badDebtRate: number;
  repeatRate: number;
  introducerValueScore: number;
}

export class ContactAnalyticsService {
  /**
   * 获取联系人作为挂靠主体的分析数据
   */
  static async getContactAsEntityAnalytics(
    contactId: string
  ): Promise<ContactAsEntityAnalytics | null> {
    const contact = await db.contact.findUnique({
      where: { id: contactId },
      include: {
        entities: {
          include: {
            orders: {
              include: {
                items: true,
                payments: true
              }
            },
            entityPrices: true
          }
        }
      }
    });

    if (!contact || !contact.entities.length) {
      return null;
    }

    const entity = contact.entities[0];
    const orders = entity.orders;

    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const orderCount = orders.length;

    // 计算利润
    const allItems = orders.flatMap(o => o.items || []);
    const totalRevenue = allItems.reduce((sum, i) => sum + (i.unitPrice || 0) * (i.quantity || 0), 0);
    const totalCost = allItems.reduce((sum, i) => sum + (i.costPriceSnapshot || 0) * (i.quantity || 0), 0);
    const avgProfitMargin = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0;
    const totalProfit = totalRevenue - totalCost;

    // 计算平均回款天数
    const paidOrders = orders.filter(o => o.payStatus === 'paid' && o.payments?.[0]?.paidAt);
    let totalPaymentDays = 0;
    for (const order of paidOrders) {
      const paidAt = new Date(order.payments[0].paidAt);
      const saleDate = new Date(order.saleDate);
      totalPaymentDays += (paidAt.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
    }
    const avgPaymentDays = paidOrders.length > 0 ? totalPaymentDays / paidOrders.length : 0;

    // 坏账率
    const badDebts = await db.badDebtWriteOff.count({
      where: {
        writeOffType: 'bad_debt',
        receivable: { entityId: entity.id }
      }
    });
    const badDebtRate = orderCount > 0 ? badDebts / orderCount : 0;

    // 获取信用信息
    let creditScore, creditLevel, riskLevel;
    if (entity.creditScore !== null) {
      creditScore = entity.creditScore;
      creditLevel = entity.creditLevel || undefined;
      riskLevel = entity.riskLevel || undefined;
    }

    return {
      contactId: contact.id,
      contactName: contact.name,
      entityName: entity.name,
      totalSales,
      orderCount,
      avgProfitMargin,
      totalProfit,
      avgPaymentDays,
      badDebtRate,
      creditScore,
      creditLevel,
      riskLevel
    };
  }

  /**
   * 获取联系人作为介绍人的分析数据
   */
  static async getContactAsIntroducerAnalytics(
    contactId: string
  ): Promise<ContactAsIntroducerAnalytics | null> {
    const contact = await db.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      return null;
    }

    // 获取该联系人推荐的所有订单
    const introducedOrders = await db.saleOrder.findMany({
      where: { introducerId: contactId },
      include: {
        items: true,
        payments: true,
        badDebtWriteOffs: true,
        entity: true
      }
    });

    if (introducedOrders.length === 0) {
      return {
        contactId: contact.id,
        contactName: contact.name,
        introducedOrderCount: 0,
        introducedTotalSales: 0,
        avgProfitMargin: 0,
        avgPaymentDays: 0,
        badDebtRate: 0,
        repeatRate: 0,
        introducerValueScore: 0
      };
    }

    const introducedOrderCount = introducedOrders.length;
    const introducedTotalSales = introducedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // 计算平均利润率
    const allItems = introducedOrders.flatMap(o => o.items || []);
    const totalRevenue = allItems.reduce((sum, i) => sum + (i.unitPrice || 0) * (i.quantity || 0), 0);
    const totalCost = allItems.reduce((sum, i) => sum + (i.costPriceSnapshot || 0) * (i.quantity || 0), 0);
    const avgProfitMargin = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0;

    // 计算平均回款天数
    const paidOrders = introducedOrders.filter(o => o.payStatus === 'paid' && o.payments?.[0]?.paidAt);
    let totalPaymentDays = 0;
    for (const order of paidOrders) {
      const paidAt = new Date(order.payments[0].paidAt);
      const saleDate = new Date(order.saleDate);
      totalPaymentDays += (paidAt.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
    }
    const avgPaymentDays = paidOrders.length > 0 ? totalPaymentDays / paidOrders.length : 0;

    // 坏账率
    const badDebtCount = introducedOrders.filter(o =>
      (o.badDebtWriteOffs || []).some(b => b.writeOffType === 'bad_debt')
    ).length;
    const badDebtRate = introducedOrderCount > 0 ? badDebtCount / introducedOrderCount : 0;

    // 复购率：有多少个客户（挂靠主体）是重复下单的
    const entityIds = new Set(introducedOrders.map(o => o.entityId));
    const repeatEntities = Array.from(entityIds).filter(entityId => {
      return introducedOrders.filter(o => o.entityId === entityId).length > 1;
    }).length;
    const repeatRate = entityIds.size > 0 ? repeatEntities / entityIds.size : 0;

    // 计算推荐价值评分
    const valueScore = this.calculateIntroducerValueScore(
      introducedTotalSales,
      avgProfitMargin,
      badDebtRate,
      introducedOrderCount
    );

    return {
      contactId: contact.id,
      contactName: contact.name,
      introducedOrderCount,
      introducedTotalSales,
      avgProfitMargin,
      avgPaymentDays,
      badDebtRate,
      repeatRate,
      introducerValueScore: valueScore
    };
  }

  /**
   * 计算推荐价值评分
   */
  private static calculateIntroducerValueScore(
    totalSales: number,
    avgProfitMargin: number,
    badDebtRate: number,
    orderCount: number
  ): number {
    if (orderCount === 0) return 0;

    // 1. 交易规模评分（30%）
    const salesInWan = totalSales / 10000;
    let scaleScore = 0;
    if (salesInWan >= 100) scaleScore = 100;
    else if (salesInWan >= 50) scaleScore = 80;
    else if (salesInWan >= 20) scaleScore = 60;
    else if (salesInWan >= 5) scaleScore = 40;
    else scaleScore = 20;

    // 2. 利润贡献评分（30%）
    let profitScore = 0;
    if (avgProfitMargin >= 0.2) profitScore = 100;
    else if (avgProfitMargin >= 0.15) profitScore = 80;
    else if (avgProfitMargin >= 0.1) profitScore = 60;
    else if (avgProfitMargin >= 0.05) profitScore = 40;
    else profitScore = 20;

    // 3. 坏账率评分（20%，倒数关系）
    const badDebtScore = Math.max(0, 100 - badDebtRate * 100 * 2);

    // 4. 推荐频次评分（20%）
    let frequencyScore = 0;
    if (orderCount >= 20) frequencyScore = 100;
    else if (orderCount >= 10) frequencyScore = 80;
    else if (orderCount >= 5) frequencyScore = 60;
    else if (orderCount >= 2) frequencyScore = 40;
    else frequencyScore = 20;

    // 加权总分
    const total = scaleScore * 0.3 + profitScore * 0.3 + badDebtScore * 0.2 + frequencyScore * 0.2;
    return Math.round(total);
  }

  /**
   * 获取所有联系人分析数据（用于报表）
   */
  static async getAllContactAnalytics(): Promise<{
    asEntity: ContactAsEntityAnalytics[];
    asIntroducer: ContactAsIntroducerAnalytics[];
  }> {
    const contacts = await db.contact.findMany({
      select: { id: true }
    });

    const asEntity: ContactAsEntityAnalytics[] = [];
    const asIntroducer: ContactAsIntroducerAnalytics[] = [];

    for (const contact of contacts) {
      try {
        const entityAnalytics = await this.getContactAsEntityAnalytics(contact.id);
        if (entityAnalytics) {
          asEntity.push(entityAnalytics);
        }

        const introducerAnalytics = await this.getContactAsIntroducerAnalytics(contact.id);
        if (introducerAnalytics && introducerAnalytics.introducedOrderCount > 0) {
          asIntroducer.push(introducerAnalytics);
        }
      } catch (e) {
        console.error(`Failed to get analytics for contact ${contact.id}`, e);
      }
    }

    // 排序
    asEntity.sort((a, b) => (b.totalSales - a.totalSales));
    asIntroducer.sort((a, b) => (b.introducerValueScore - a.introducerValueScore));

    return { asEntity, asIntroducer };
  }
}
