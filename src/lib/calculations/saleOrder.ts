/**
 * 销售单相关的计算
 */

/**
 * 计算销售单的净销售额
 * 净销售额 = 总金额 + 运费 - 折扣 - 退款金额
 */
export function calculateNetSales(order: {
  totalAmount: number;
  deliveryFee?: number | null;
  discount?: number | null;
  returns?: Array<{ totalAmount: number }> | null;
}): number {
  let sales = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);
  for (const ret of order.returns || []) {
    sales -= ret.totalAmount;
  }
  return sales;
}

/**
 * 计算销售单的成本（已按比例分摊退货和坏账）
 */
export function calculateOrderCost(order: {
  items: Array<{ costPriceSnapshot?: number | null; quantity: number }>;
  totalAmount: number;
  deliveryFee?: number | null;
  discount?: number | null;
  returns?: Array<{ totalAmount: number }> | null;
  badDebtWriteOffs?: Array<{ writtenOffAmount: number }> | null;
}): number {
  let cost = 0;
  for (const item of order.items || []) {
    cost += (item.costPriceSnapshot || 0) * item.quantity;
  }

  cost += order.deliveryFee || 0;

  const orderTotal = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);

  if (orderTotal > 0) {
    const retRatio = order.returns?.reduce((sum, r) => sum + r.totalAmount, 0) / orderTotal || 0;
    const writeOffRatio = order.badDebtWriteOffs?.reduce((sum, w) => sum + w.writtenOffAmount, 0) / orderTotal || 0;
    cost = cost * (1 - retRatio - writeOffRatio);
  }

  return Math.max(0, cost);
}

/**
 * 计算销售单的净利润
 * 净利润 = 净销售额 - 成本 - 坏账核销
 */
export function calculateOrderProfit(order: {
  totalAmount: number;
  deliveryFee?: number | null;
  discount?: number | null;
  returns?: Array<{ totalAmount: number }> | null;
  badDebtWriteOffs?: Array<{ writtenOffAmount: number }> | null;
  items: Array<{ costPriceSnapshot?: number | null; quantity: number }>;
}): number {
  const netSales = calculateNetSales(order);
  const cost = calculateOrderCost(order);
  
  let writeOffs = 0;
  for (const writeOff of order.badDebtWriteOffs || []) {
    writeOffs += writeOff.writtenOffAmount;
  }

  return Math.max(0, netSales - cost - writeOffs);
}
