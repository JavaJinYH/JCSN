/**
 * 订单金额相关计算
 */

/**
 * 计算订单原始金额（总金额+运费-折扣-退款-坏账核销）
 * 用于应收款等计算
 */
export function calculateOrderOriginalAmount(order: {
  totalAmount: number;
  deliveryFee?: number | null;
  discount?: number | null;
  returns?: Array<{ totalAmount: number }> | null;
  badDebtWriteOffs?: Array<{ writtenOffAmount: number }> | null;
}): number {
  let amount = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);

  for (const ret of order.returns || []) {
    amount -= ret.totalAmount;
  }

  for (const writeOff of order.badDebtWriteOffs || []) {
    amount -= writeOff.writtenOffAmount;
  }

  return Math.max(0, amount);
}

/**
 * 计算退货单总金额
 */
export function calculateReturnTotal(items: Array<{ quantity: number; unitPrice: number }>): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}
