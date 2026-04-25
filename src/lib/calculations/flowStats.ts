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
  supplierCommissionIncome: number;
  serviceIncome: number;
  purchaseExpense: number;
  saleReturnExpense: number;
  dailyExpenseTotal: number;
  introducerCommissionExpense: number;
  installationFeeTotal: number;
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

interface BusinessCommission {
  type: 'OUTGOING' | 'INCOMING';
  category: 'INTRODUCER' | 'SUPPLIER';
  amount: number;
}

interface DailyExpense {
  amount: number;
}

interface ServiceAppointment {
  installationFee?: number;
  installerType?: string | null;
}

/**
 * 计算流水账统计数据
 */
export function calculateFlowStats(
  orders: SaleOrderWithDetails[],
  collections: CollectionRecord[],
  purchases: Purchase[],
  purchaseReturns: PurchaseReturn[],
  commissions: BusinessCommission[],
  dailyExpenses: DailyExpense[],
  serviceAppointments: ServiceAppointment[]
): FlowStatsResult {
  let cashAmount = 0;
  let wechatAmount = 0;
  let alipayAmount = 0;
  let transferAmount = 0;
  let salesIncome = 0;
  let collectionIncome = 0;
  let purchaseReturnIncome = 0;
  let supplierCommissionIncome = 0;
  let serviceIncome = 0;
  let purchaseExpense = 0;
  let saleReturnExpense = 0;
  let dailyExpenseTotal = 0;
  let introducerCommissionExpense = 0;
  let installationFeeTotal = 0;
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

  // 处理业务返点
  commissions.forEach(comm => {
    if (comm.type === 'INCOMING' && comm.category === 'SUPPLIER') {
      supplierCommissionIncome += comm.amount;
    } else if (comm.type === 'OUTGOING' && comm.category === 'INTRODUCER') {
      introducerCommissionExpense += comm.amount;
    }
  });

  // 处理日常支出
  dailyExpenses.forEach(exp => {
    dailyExpenseTotal += exp.amount;
  });

  // 处理安装费
  serviceAppointments.forEach(appt => {
    if (appt.installationFee) {
      if (appt.installerType === '店主') {
        // 店主安装 → 收入
        serviceIncome += appt.installationFee;
      } else {
        // 其他人安装 → 支出
        installationFeeTotal += appt.installationFee;
      }
    }
  });

  const totalIncome = salesIncome + collectionIncome + purchaseReturnIncome + supplierCommissionIncome + serviceIncome;
  const totalExpense = purchaseExpense + saleReturnExpense + dailyExpenseTotal + introducerCommissionExpense + installationFeeTotal;
  const netIncome = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    netIncome,
    orderCount,
    salesIncome,
    collectionIncome,
    purchaseReturnIncome,
    supplierCommissionIncome,
    serviceIncome,
    purchaseExpense,
    saleReturnExpense,
    dailyExpenseTotal,
    introducerCommissionExpense,
    installationFeeTotal,
    cashAmount,
    wechatAmount,
    alipayAmount,
    transferAmount,
  };
}
