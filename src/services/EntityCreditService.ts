import { db } from '../lib/db';
import type { Entity } from '@prisma/client';

export interface CreditScoreResult {
  creditScore: number;
  creditLevel: string;
  riskLevel: string;
  detailScores: {
    repaymentScore: number;
    scaleScore: number;
    debtScore: number;
    stabilityScore: number;
    profitScore: number;
  };
}

export class EntityCreditService {
  private static AGREED_PAYMENT_DAYS = 30;

  /**
   * 计算单个挂靠主体的信用评分
   */
  static async calculateCreditScore(entityId: string): Promise<CreditScoreResult> {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.setMonth(now.getMonth() - 12));

    // 1. 获取所有必要数据
    const [entity, orders, receivables, badDebts, legacyBills, orderItems] = await Promise.all([
      db.entity.findUnique({ where: { id: entityId } }),
      db.saleOrder.findMany({
        where: {
          entityId,
          saleDate: { gte: twelveMonthsAgo }
        },
        include: { payments: true }
      }),
      db.receivable.findMany({
        where: { entityId }
      }),
      db.badDebtWriteOff.findMany({
        where: {
          receivable: { entityId }
        },
        include: { receivable: true }
      }),
      db.legacyBill.findMany({
        where: { entityId }
      }),
      db.orderItem.findMany({
        where: {
          saleOrder: { entityId, saleDate: { gte: twelveMonthsAgo } }
        }
      })
    ]);

    if (!entity) {
      throw new Error('Entity not found');
    }

    // 2. 计算各个维度评分
    const repaymentScore = this.calculateRepaymentScore(orders, badDebts);
    const scaleScore = this.calculateScaleScore(orders);
    const debtScore = this.calculateDebtScore(entity);
    const stabilityScore = this.calculateStabilityScore(orders, legacyBills, entity.createdAt);
    const profitScore = this.calculateProfitScore(orderItems);

    // 3. 加权计算总分
    const totalScore = Math.round(
      repaymentScore * 0.35 +
      scaleScore * 0.25 +
      debtScore * 0.20 +
      stabilityScore * 0.10 +
      profitScore * 0.10
    );

    // 4. 计算等级
    const { creditLevel, riskLevel } = this.calculateLevel(totalScore, entity);

    return {
      creditScore: totalScore,
      creditLevel,
      riskLevel,
      detailScores: {
        repaymentScore,
        scaleScore,
        debtScore,
        stabilityScore,
        profitScore
      }
    };
  }

  /**
   * 更新单个挂靠主体的信用评估
   */
  static async updateEntityCredit(entityId: string): Promise<Entity> {
    const result = await this.calculateCreditScore(entityId);

    return db.entity.update({
      where: { id: entityId },
      data: {
        creditScore: result.creditScore,
        creditLevel: result.creditLevel,
        riskLevel: result.riskLevel,
        lastCreditEvalDate: new Date()
      }
    });
  }

  /**
   * 批量更新所有挂靠主体的信用评估
   */
  static async batchUpdateAllEntities(): Promise<void> {
    const entities = await db.entity.findMany({
      select: { id: true }
    });

    for (const entity of entities) {
      try {
        await this.updateEntityCredit(entity.id);
      } catch (e) {
        console.error(`Failed to update credit for entity ${entity.id}`, e);
      }
    }
  }

  /**
   * 计算还款记录评分
   */
  private static calculateRepaymentScore(
    orders: any[],
    badDebts: any[]
  ): number {
    if (orders.length === 0) {
      return 60; // 新客户基础分
    }

    // 准时还款率
    const onTimeCount = orders.filter(order => {
      if (order.payStatus !== 'paid') return false;
      const agreedDate = new Date(order.saleDate);
      agreedDate.setDate(agreedDate.getDate() + this.AGREED_PAYMENT_DAYS);
      const actualPaid = order.payments?.[0]?.paidAt || new Date();
      return actualPaid <= agreedDate;
    }).length;
    const onTimeRate = onTimeCount / orders.length;
    const onTimeScore = onTimeRate * 40;

    // 逾期次数惩罚
    const overdueCount = orders.filter(order => {
      if (order.payStatus === 'paid') return false;
      const agreedDate = new Date(order.saleDate);
      agreedDate.setDate(agreedDate.getDate() + this.AGREED_PAYMENT_DAYS);
      return new Date() > agreedDate;
    }).length;
    const overduePenalty = overdueCount * 5;

    // 坏账率惩罚
    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const badDebtAmount = badDebts
      .filter(b => b.writeOffType === 'bad_debt')
      .reduce((sum, b) => sum + (b.writeOffAmount || 0), 0);
    const badDebtRate = totalSales > 0 ? badDebtAmount / totalSales : 0;
    const badDebtPenalty = badDebtRate * 100 * 2;

    return Math.max(0, Math.min(100, onTimeScore - overduePenalty - badDebtPenalty));
  }

  /**
   * 计算交易规模评分
   */
  private static calculateScaleScore(orders: any[]): number {
    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalSalesWan = totalSales / 10000;

    if (totalSalesWan >= 50) return 100;
    if (totalSalesWan >= 20) return 80;
    if (totalSalesWan >= 5) return 60;
    if (totalSalesWan > 0) return 30;
    return 20;
  }

  /**
   * 计算欠款状况评分
   */
  private static calculateDebtScore(entity: { creditLimit: number; creditUsed: number }): number {
    if (entity.creditLimit <= 0) return 50;

    const ratio = entity.creditUsed / entity.creditLimit;
    if (ratio <= 0.3) return 100;
    if (ratio <= 0.5) return 80;
    if (ratio <= 0.7) return 50;
    if (ratio <= 0.9) return 20;
    return 0;
  }

  /**
   * 计算合作稳定性评分（考虑历史账单最早日期）
   */
  private static calculateStabilityScore(
    orders: any[],
    legacyBills: any[],
    entityCreatedAt: Date
  ): number {
    const now = new Date();

    // 找到最早合作日期：取历史账单、订单、实体创建时间的最小值
    const dates = [entityCreatedAt];
    if (orders.length > 0) {
      dates.push(...orders.map(o => new Date(o.saleDate)));
    }
    if (legacyBills.length > 0) {
      dates.push(...legacyBills.map(b => new Date(b.billDate)));
    }
    const firstDate = new Date(Math.min(...dates.map(d => d.getTime())));

    // 计算合作时长（月）
    const monthsDiff = (now.getFullYear() - firstDate.getFullYear()) * 12 +
                      (now.getMonth() - firstDate.getMonth());

    let score = 0;
    if (monthsDiff >= 12) score = 100;
    else if (monthsDiff >= 6) score = 80;
    else if (monthsDiff >= 3) score = 60;
    else score = 40;

    // 月均订单数加分
    const monthlyOrders = orders.length / Math.max(1, monthsDiff);
    if (monthlyOrders >= 3) score += 20;

    return Math.min(100, score);
  }

  /**
   * 计算利润贡献评分
   */
  private static calculateProfitScore(orderItems: any[]): number {
    if (orderItems.length === 0) return 40;

    const totalRevenue = orderItems.reduce((sum, i) => sum + (i.unitPrice || 0) * (i.quantity || 0), 0);
    const totalCost = orderItems.reduce((sum, i) => sum + (i.costPriceSnapshot || 0) * (i.quantity || 0), 0);

    if (totalRevenue <= 0) return 40;

    const avgMargin = (totalRevenue - totalCost) / totalRevenue;
    if (avgMargin > 0.2) return 100;
    if (avgMargin >= 0.15) return 80;
    if (avgMargin >= 0.1) return 60;
    if (avgMargin >= 0.05) return 40;
    return 20;
  }

  /**
   * 根据总分计算信用等级和风险等级
   */
  private static calculateLevel(
    score: number,
    entity: { creditLimit: number; creditUsed: number }
  ): { creditLevel: string; riskLevel: string } {
    // 基础等级
    let creditLevel = 'B';
    let riskLevel = '严重';

    if (score >= 90) {
      creditLevel = 'AAA';
      riskLevel = '低';
    } else if (score >= 80) {
      creditLevel = 'AA';
      riskLevel = '低';
    } else if (score >= 70) {
      creditLevel = 'A';
      riskLevel = '中';
    } else if (score >= 60) {
      creditLevel = 'BBB';
      riskLevel = '中';
    } else if (score >= 50) {
      creditLevel = 'BB';
      riskLevel = '高';
    }

    // 额外调整：如果已用额度 > 90%，风险等级+1
    const usageRatio = entity.creditLimit > 0 ? entity.creditUsed / entity.creditLimit : 0;
    if (usageRatio > 0.9 && riskLevel !== '严重') {
      riskLevel = riskLevel === '低' ? '中' : '高';
    }

    return { creditLevel, riskLevel };
  }

  /**
   * 获取信用额度建议
   */
  static getCreditLimitSuggestion(score: number): {
    defaultLimit: number;
    maxLimit: number;
  } {
    if (score >= 90) return { defaultLimit: 100000, maxLimit: 300000 };
    if (score >= 80) return { defaultLimit: 50000, maxLimit: 200000 };
    if (score >= 70) return { defaultLimit: 30000, maxLimit: 100000 };
    if (score >= 60) return { defaultLimit: 10000, maxLimit: 50000 };
    if (score >= 50) return { defaultLimit: 5000, maxLimit: 10000 };
    return { defaultLimit: 0, maxLimit: 0 };
  }
}
