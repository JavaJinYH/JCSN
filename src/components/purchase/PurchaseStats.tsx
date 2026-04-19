import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { Purchase } from '@/lib/types';

interface PurchaseStatsProps {
  purchases: Purchase[];
}

export function PurchaseStats({ purchases }: PurchaseStatsProps) {
  const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-slate-800">{purchases.length}</div>
          <div className="text-sm text-slate-500">进货记录数</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-blue-600">{totalQuantity}</div>
          <div className="text-sm text-slate-500">进货商品总数</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
          <div className="text-sm text-slate-500">进货总金额</div>
        </CardContent>
      </Card>
    </div>
  );
}
