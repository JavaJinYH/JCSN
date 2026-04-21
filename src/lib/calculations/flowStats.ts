/**
 * 流水账统计计算
 */

interface FlowStatsResult {
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  orderCount: number;
  salesIncome: number;
  collectionIncome: number;
  purchaseReturnIncome: number;
  purchaseExpense: number;
  saleReturnExpense: number;
  cashAmount: number;
  wechatAmount: number;
  alipayAmount: number;
  transferAmount: number;
}

interface SaleOrderWithDetails {
  paidAmount: number;
  payments: Array<{ method?: string | null; amount: number }>;
  returns?: Array<{ totalAmount: number }> | null;
}

interface CollectionRecord {
  collectionResult?: string | null;
  collectionAmount?: number | null;
  collectionMethod?: string | null;
}

interface Purchase {
  totalAmount: number;
}

interface PurchaseReturn {
  totalAmount: number;
}

/**
 * 计算流水账统计数据
 */
export function calculateFlowStats(
  orders: SaleOrderWithDetails[],
  collections: CollectionRecord[],
  purchases: Purchase[],
  purchaseReturns: PurchaseReturn[]
): FlowStatsResult {
  let cashAmount = 0;
  let wechatAmount = 0;
  let alipayAmount = 0;
  let transferAmount = 0;
  let salesIncome = 0;
  let collectionIncome = 0;
  let purchaseReturnIncome = 0;
  let purchaseExpense = 0;
  let saleReturnExpense = 0;
  let orderCount = 0;

  // 处理销售订单
  orders.forEach(order => {
    orderCount++;
    salesIncome += order.paidAmount;

    order.payments.forEach(payment => {
      const method = payment.method?.toLowerCase() || '';
      if (method.includes('现金') || method === 'cash') {
        cashAmount += payment.amount;
      } else if (method.includes('微信') || method === 'wechat') {
        wechatAmount += payment.amount;
      } else if (method.includes('支付宝') || method === 'alipay') {
        alipayAmount += payment.amount;
      } else if (method.includes('转账') || method === 'transfer') {
        transferAmount += payment.amount;
      }
    });

    // 处理销售退货
    if (order.returns) {
      order.returns.forEach((ret: any) => {
        saleReturnExpense += ret.totalAmount;
      });
    }
  });

  // 处理客户回款
  collections.forEach(col => {
    if (col.collectionResult === 'success' && col.collectionAmount) {
      collectionIncome += col.collectionAmount;
      const method = col.collectionMethod?.toLowerCase() || '';
      if (method.includes('现金') || method === 'cash') {
        cashAmount += col.collectionAmount;
      } else if (method.includes('微信') || method === 'wechat') {
        wechatAmount += col.collectionAmount;
      } else if (method.includes('支付宝') || method === 'alipay') {
        alipayAmount += col.collectionAmount;
      } else if (method.includes('转账') || method === 'transfer') {
        transferAmount += col.collectionAmount;
      }
    }
  });

  // 处理进货
  purchases.forEach(purchase => {
    purchaseExpense += purchase.totalAmount;
  });

  // 处理进货退货
  purchaseReturns.forEach(ret => {
    purchaseReturnIncome += ret.totalAmount;
  });

  const totalIncome = salesIncome + collectionIncome + purchaseReturnIncome;
  const totalExpense = purchaseExpense + saleReturnExpense;
  const netIncome = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    netIncome,
    orderCount,
    salesIncome,
    collectionIncome,
    purchaseReturnIncome,
    purchaseExpense,
    saleReturnExpense,
    cashAmount,
    wechatAmount,
    alipayAmount,
    transferAmount,
  };
}
