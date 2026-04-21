/**
 * 商品相关的计算
 */

/**
 * 计算单个订单项的利润
 */
export function calculateItemProfit(item: {
  unitPrice: number;
  costPriceSnapshot?: number | null;
  quantity: number;
}): number {
  return (item.unitPrice - (item.costPriceSnapshot || 0)) * item.quantity;
}

/**
 * 计算单个订单项的利润率
 */
export function calculateItemMargin(item: {
  unitPrice: number;
  costPriceSnapshot?: number | null;
}): number {
  if (item.unitPrice === 0) return 0;
  return ((item.unitPrice - (item.costPriceSnapshot || 0)) / item.unitPrice) * 100;
}
