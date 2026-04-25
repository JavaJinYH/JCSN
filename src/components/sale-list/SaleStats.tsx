import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface SaleStatsProps {
  totalCount: number;
  newCount: number;
  salesAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export function SaleStats({ totalCount, newCount, salesAmount, paidAmount, unpaidAmount }: SaleStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-slate-800">{totalCount}</div>
          <div className="text-sm text-slate-500">订单总数</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(salesAmount)}</div>
          <div className="text-sm text-slate-500">销售总额</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
          <div className="text-sm text-slate-500">已收款</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className={`text-2xl font-bold ${unpaidAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(unpaidAmount)}
          </div>
          <div className="text-sm text-slate-500">待收款</div>
        </CardContent>
      </Card>
    </div>
  );
}
