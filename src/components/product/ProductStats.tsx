import { Card, CardContent } from '@/components/ui/card';

interface ProductStatsProps {
  productCount: number;
  categoryCount: number;
  totalStock: number;
}

export function ProductStats({ productCount, categoryCount, totalStock }: ProductStatsProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{productCount}</div>
            <div className="text-sm text-slate-500">商品种类</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{categoryCount}</div>
            <div className="text-sm text-slate-500">商品分类</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{totalStock}</div>
            <div className="text-sm text-slate-500">总库存量</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
