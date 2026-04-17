export interface CustomerValueScore {
  totalScore: number;
  autoTag: string;
  salesScore: number;
  profitScore: number;
  paymentSpeedScore: number;
  overdueRateScore: number;
  rebateRatioScore: number;
}

export const tagLabels: Record<string, string> = {
  '★': '★',
  '△': '△',
  '○': '○',
  '×': '×',
};

export const tagColors: Record<string, string> = {
  '★': 'text-yellow-500',
  '△': 'text-blue-500',
  '○': 'text-slate-400',
  '×': 'text-red-500',
};

export const phoneTypeLabels: Record<string, string> = {
  mobile: '手机',
  tel: '电话',
  fax: '传真',
  other: '其他',
};

export const phoneTypeOptions = [
  { value: 'mobile', label: '手机' },
  { value: 'tel', label: '电话' },
  { value: 'fax', label: '传真' },
  { value: 'other', label: '其他' },
];

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

export function getPrimaryPhone(phones: Array<{ phone: string; isPrimary: boolean }>): string | null {
  const primaryPhone = phones.find(p => p.isPrimary);
  return primaryPhone?.phone || (phones.length > 0 ? phones[0].phone : null);
}

export function formatPhoneList(phones: Array<{ phone: string; phoneType: string; isPrimary: boolean }>): string {
  return phones.map(p => `${p.phone}${p.isPrimary ? ' (主)' : ''}`).join(', ');
}

export async function calculateCustomerValueScore(
  customerId: string,
  sales: Array<{ totalAmount: number; paidAmount: number; saleDate: Date; items?: Array<{ costPriceSnapshot: number; unitPrice: number; quantity: number }> }>,
  receivables: Array<{ remainingAmount: number; isOverdue: boolean; agreedPaymentDate: Date | null }>,
  rebates: Array<{ rebateAmount: number }>
): Promise<CustomerValueScore> {
  const currentYear = new Date().getFullYear();
  const yearSales = sales.filter(s => new Date(s.saleDate).getFullYear() === currentYear);

  const annualSales = yearSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const salesScore = Math.min(100, 60 + annualSales / 10000);

  let totalProfit = 0;
  let totalRevenue = 0;
  yearSales.forEach(sale => {
    sale.items?.forEach(item => {
      const revenue = item.unitPrice * item.quantity;
      const cost = item.costPriceSnapshot * item.quantity;
      totalProfit += revenue - cost;
      totalRevenue += revenue;
    });
  });
  const avgProfitRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const profitScore = Math.min(100, avgProfitRate * 5);

  const pendingReceivables = receivables.filter(r => r.remainingAmount > 0);
  let totalDays = 0;
  pendingReceivables.forEach(r => {
    if (r.agreedPaymentDate) {
      const days = Math.floor((Date.now() - new Date(r.agreedPaymentDate).getTime()) / (1000 * 60 * 60 * 24));
      totalDays += Math.max(0, days);
    }
  });
  const avgOverdueDays = pendingReceivables.length > 0 ? totalDays / pendingReceivables.length : 0;
  const paymentSpeedScore = Math.max(0, 100 - avgOverdueDays * 2);

  const overdueCount = receivables.filter(r => r.isOverdue).length;
  const overdueRate = receivables.length > 0 ? overdueCount / receivables.length : 0;
  const overdueRateScore = Math.max(0, 100 - overdueRate * 100);

  const totalRebates = rebates.reduce((sum, r) => sum + r.rebateAmount, 0);
  const rebateRatio = annualSales > 0 ? (totalRebates / annualSales) * 100 : 0;
  const rebateRatioScore = Math.max(0, 100 - rebateRatio * 500);

  const totalScore =
    salesScore * 0.3 +
    profitScore * 0.25 +
    paymentSpeedScore * 0.2 +
    overdueRateScore * 0.15 +
    rebateRatioScore * 0.1;

  let autoTag = '○';
  if (totalScore >= 80) autoTag = '★';
  else if (totalScore >= 60) autoTag = '△';
  else if (totalScore < 40) autoTag = '×';

  return {
    totalScore: Math.round(totalScore),
    autoTag,
    salesScore: Math.round(salesScore),
    profitScore: Math.round(profitScore),
    paymentSpeedScore: Math.round(paymentSpeedScore),
    overdueRateScore: Math.round(overdueRateScore),
    rebateRatioScore: Math.round(rebateRatioScore),
  };
}

export function getAgingLevel(days: number): { level: string; color: string; label: string; bgColor: string; borderColor: string } {
  if (days <= 30) return { level: 'normal', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200', label: '正常' };
  if (days <= 90) return { level: 'attention', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', label: '关注' };
  if (days <= 180) return { level: 'warning', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', label: '警告' };
  return { level: 'danger', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', label: '严重逾期' };
}

export function calculateAgingDays(agreedPaymentDate: Date | null, createdAt: Date): number {
  if (!agreedPaymentDate) {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }
  const daysSinceAgreed = Math.floor((Date.now() - new Date(agreedPaymentDate).getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceAgreed > 0 ? daysSinceAgreed : 0;
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
