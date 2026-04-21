/**
 * 业务返点相关计算
 */

interface Commission {
  type: 'OUTGOING' | 'INCOMING';
  category: 'INTRODUCER' | 'SUPPLIER';
  amount: number;
}

interface CommissionStats {
  totalOutgoing: number;
  totalIncoming: number;
  netCommissionImpact: number;
}

/**
 * 计算返点对成本/利润的总影响
 */
export function calculateCommissionStats(commissions: Commission[]): CommissionStats {
  let totalOutgoing = 0;
  let totalIncoming = 0;

  commissions.forEach(comm => {
    if (comm.type === 'OUTGOING') {
      totalOutgoing += comm.amount;
    } else if (comm.type === 'INCOMING') {
      totalIncoming += comm.amount;
    }
  });

  const netCommissionImpact = totalIncoming - totalOutgoing;

  return {
    totalOutgoing,
    totalIncoming,
    netCommissionImpact,
  };
}

/**
 * 计算包含介绍人返点（支出）的总成本
 * 原始成本 + 介绍人返点
 */
export function calculateTotalCostWithCommission(originalCost: number, commissions: Commission[]): number {
  const outgoingCommissions = commissions.filter(c => c.type === 'OUTGOING');
  const totalOutgoing = outgoingCommissions.reduce((sum, c) => sum + c.amount, 0);
  return originalCost + totalOutgoing;
}

/**
 * 计算包含供应商返点（收入）的总利润
 * 原始利润 + 供应商返点
 */
export function calculateTotalProfitWithCommission(originalProfit: number, commissions: Commission[]): number {
  const incomingCommissions = commissions.filter(c => c.type === 'INCOMING');
  const totalIncoming = incomingCommissions.reduce((sum, c) => sum + c.amount, 0);
  return originalProfit + totalIncoming;
}

/**
 * 按分类统计返点
 */
export function groupCommissionsByCategory(commissions: Commission[]): Map<string, number> {
  const result = new Map<string, number>();
  commissions.forEach(comm => {
    const key = comm.category;
    const current = result.get(key) || 0;
    result.set(key, current + comm.amount);
  });
  return result;
}
