import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatProductName } from '@/lib/utils';
import { PurchaseService } from '@/services/PurchaseService';
import type { Product } from '@/lib/types';
import { toast } from '@/components/Toast';

interface PriceHistoryProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChartData {
  date: string;
  price: number;
  supplier: string;
}

export function PriceHistory({
  product,
  open,
  onOpenChange,
}: PriceHistoryProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && product) {
      loadHistory();
    }
  }, [open, product]);

  const loadHistory = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const historyData = await PurchaseService.getPurchaseHistoryByProduct(product.id);
      const data = historyData.map(p => ({
        date: new Date(p.purchaseDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        price: p.unitPrice,
        supplier: p.supplier?.name || '-',
      }));
      setChartData(data);
    } catch (error) {
      console.error('[PriceHistory] 加载失败:', error);
      toast('加载价格历史失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="space-y-4 py-4">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-500">加载中...</div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          暂无进货记录
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-sm text-slate-500">最新价格</div>
              <div className="text-xl font-bold text-orange-600">
                {formatCurrency(chartData[chartData.length - 1]?.price || 0)}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-sm text-slate-500">最低价格</div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(Math.min(...chartData.map(d => d.price)))}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-sm text-slate-500">最高价格</div>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(Math.max(...chartData.map(d => d.price)))}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-sm text-slate-500">记录条数</div>
              <div className="text-xl font-bold text-slate-700">
                {chartData.length}
              </div>
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="bg-white p-4 border rounded-lg">
              <h4 className="text-sm font-medium text-slate-600 mb-4">价格趋势图</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v) => `¥${v}`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), '价格']} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: '#f97316', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>价格</TableHead>
                  <TableHead>供应商</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...chartData].reverse().map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-sm">{item.date}</TableCell>
                    <TableCell className="font-mono font-medium">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-slate-500">{item.supplier}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
