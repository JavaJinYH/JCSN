/**
 * 购物车相关计算
 */

interface CartItem {
  quantity: number;
  unitPrice: number;
  costPrice: number;
}

interface CartCalculationResult {
  subtotal: number;
  costTotal: number;
  rateDiscount: number;
  totalDiscount: number;
  deliveryFeeAmount: number;
  calculatedFinalAmount: number;
  finalAmount: number;
  totalCost: number;
  totalProfit: number;
  profitRate: number;
  showLowProfitWarning: boolean;
  showLossWarning: boolean;
}

/**
 * 计算购物车总计
 */
export function calculateCartTotals(
  cart: CartItem[],
  discount: number,
  discountRate: number,
  manualFinalAmount: number | null,
  needsDelivery: boolean,
  deliveryFee: string
): CartCalculationResult {
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const costTotal = cart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  const rateDiscount = subtotal * (100 - discountRate) / 100;
  const totalDiscount = discount + rateDiscount;
  const deliveryFeeAmount = needsDelivery ? parseFloat(deliveryFee) || 0 : 0;
  const calculatedFinalAmount = subtotal - totalDiscount + deliveryFeeAmount;
  const finalAmount = manualFinalAmount !== null ? manualFinalAmount : calculatedFinalAmount;
  const totalCost = costTotal + deliveryFeeAmount;
  const totalProfit = finalAmount - totalCost;
  const profitRate = finalAmount > 0 ? (totalProfit / finalAmount) * 100 : 0;
  const showLowProfitWarning = profitRate < 10 && profitRate >= 0 && finalAmount > 0;
  const showLossWarning = totalProfit < 0 && finalAmount > 0;

  return {
    subtotal,
    costTotal,
    rateDiscount,
    totalDiscount,
    deliveryFeeAmount,
    calculatedFinalAmount,
    finalAmount,
    totalCost,
    totalProfit,
    profitRate,
    showLowProfitWarning,
    showLossWarning,
  };
}
