import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface SaleStatsProps {
  totalCount: number;
  newCount: number;
  paidAmount: number;
  profit: number;
}

export function SaleStats({ totalCount, newCount, paidAmount, profit }: SaleStatsProps) {
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
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(paidAmount)}</div>
          <div className="text-sm text-slate-500">销售总额</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(profit)}</div>
          <div className="text-sm text-slate-500">预估利润</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-blue-600">{newCount}</div>
          <div className="text-sm text-slate-500">新架构订单</div>
        </CardContent>
      </Card>
    </div>
  );
}
