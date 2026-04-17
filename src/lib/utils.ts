import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateInvoiceNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `XS${year}${month}${day}${random}`;
}

export function calculateProfit(
  salePrice: number,
  costPrice: number,
  quantity: number
): number {
  return (salePrice - costPrice) * quantity;
}

export interface CustomerScoreInput {
  totalSales: number;
  totalProfit: number;
  avgProfitMargin: number;
  avgPaymentDays: number;
  overdueRate: number;
  rebateRatio: number;
}

export interface CustomerScoreResult {
  score: number;
  tag: string;
  breakdown: {
    salesScore: number;
    profitScore: number;
    paymentScore: number;
    overdueScore: number;
    rebateScore: number;
  };
}

export function calculateCustomerScore(input: CustomerScoreInput): CustomerScoreResult {
  const weights = {
    sales: 0.3,
    profit: 0.25,
    payment: 0.2,
    overdue: 0.15,
    rebate: 0.1,
  };

  // 销售额得分：10万=60分，每增加1万+1分，上限100
  const salesScore = Math.min(100, 60 + input.totalSales / 10000);
  // 利润率得分：0%=0分，20%以上=100分
  const profitScore = Math.min(100, input.avgProfitMargin * 5);
  // 回款速度：30天内=100分，每增加1天-2分
  const paymentScore = Math.max(0, 100 - input.avgPaymentDays * 2);
  // 逾期率：0%=100分，100%=0分
  const overdueScore = Math.max(0, 100 - input.overdueRate * 100);
  // 返点比例：0%=100分，20%以上=0分
  const rebateScore = Math.max(0, 100 - input.rebateRatio * 500);

  const score = Math.round(
    salesScore * weights.sales +
    profitScore * weights.profit +
    paymentScore * weights.payment +
    overdueScore * weights.overdue +
    rebateScore * weights.rebate
  );

  let tag = '○';
  if (score >= 80) tag = '★';
  else if (score >= 60) tag = '△';
  else if (score < 40) tag = '×';

  return {
    score,
    tag,
    breakdown: {
      salesScore: Math.round(salesScore),
      profitScore: Math.round(profitScore),
      paymentScore: Math.round(paymentScore),
      overdueScore: Math.round(overdueScore),
      rebateScore: Math.round(rebateScore),
    },
  };
}

export function getTagDescription(tag: string): string {
  switch (tag) {
    case '★': return '高价值客户';
    case '△': return '中等价值客户';
    case '○': return '普通客户';
    case '×': return '低价值客户';
    default: return '未知';
  }
}
