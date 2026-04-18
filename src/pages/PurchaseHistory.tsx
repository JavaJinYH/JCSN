import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { db } from '@/lib/db';
import { toast } from '@/components/Toast';
import type { Purchase, Product, Supplier } from '@/lib/types';

export function PurchaseHistory() {
  const [purchases, setPurchases] = useState<(Purchase & { product: Product; supplier?: Supplier })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'all'>('quarter');

  useEffect(() => {
    loadData();
  }, [selectedProduct, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      let startDate: Date | undefined;
      const now = new Date();

      if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      } else if (dateRange === 'quarter') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      }

      const whereClause: any = {};
      if (startDate) {
        whereClause.purchaseDate = { gte: startDate };
      }
      if (selectedProduct !== 'all') {
        whereClause.productId = selectedProduct;
      }

      const [purchasesData, productsData] = await Promise.all([
        db.purchase.findMany({
          where: whereClause,
          include: { product: true, supplier: true },
          orderBy: { purchaseDate: 'desc' },
          take: 500,
        }),
        db.product.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);

      setPurchases(purchasesData);
      setProducts(productsData);
    } catch (error) {
      console.error('[PurchaseHistory] 加载失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = searchTerm
    ? purchases.filter(
        (p) =>
          p.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : purchases;

  const getProductPriceHistory = () => {
    if (selectedProduct === 'all') return [];

    const priceMap = new Map<string, { date: Date; price: number; supplier?: string }>();
    filteredPurchases.forEach((p) => {
      if (!priceMap.has(p.productId)) {
        priceMap.set(p.productId, {
          date: p.purchaseDate,
          price: p.unitPrice,
          supplier: p.supplier?.name,
        });
      }
    });

    return Array.from(priceMap.entries()).map(([productId, data]) => ({
      productId,
      productName: purchases.find((p) => p.productId === productId)?.product.name || '',
      latestPrice: data.price,
      latestDate: data.date,
      supplier: data.supplier,
    }));
  };

  const productHistory = getProductPriceHistory();

  const getPriceChange = (productId: string) => {
    const productPurchases = purchases
      .filter((p) => p.productId === productId)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

    if (productPurchases.length < 2) return null;

    const latest = productPurchases[0].unitPrice;
    const previous = productPurchases[1].unitPrice;
    const change = latest - previous;
    const percent = ((change / previous) * 100).toFixed(1);

    return { change, percent, isUp: change > 0 };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">进货价格历史</h2>
          <p className="text-slate-500 mt-1">查看商品进货价格变动记录</p>
        </div>
        <Button variant="outline" onClick={loadData}>刷新</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-center">
            <Input
              placeholder="搜索商品或供应商..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />

            <select
              className="h-9 w-48 border rounded px-2 text-sm"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="all">全部商品</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="flex gap-1 ml-auto">
              <Button
                size="sm"
                variant={dateRange === 'month' ? 'default' : 'outline'}
                onClick={() => setDateRange('month')}
              >
                近1月
              </Button>
              <Button
                size="sm"
                variant={dateRange === 'quarter' ? 'default' : 'outline'}
                onClick={() => setDateRange('quarter')}
              >
                近3月
              </Button>
              <Button
                size="sm"
                variant={dateRange === 'year' ? 'default' : 'outline'}
                onClick={() => setDateRange('year')}
              >
                近1年
              </Button>
              <Button
                size="sm"
                variant={dateRange === 'all' ? 'default' : 'outline'}
                onClick={() => setDateRange('all')}
              >
                全部
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedProduct !== 'all' && productHistory.length > 0 ? (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium mb-2">价格变动概览</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {productHistory.map((item) => {
                  const priceChange = getPriceChange(item.productId);
                  return (
                    <div key={item.productId} className="bg-white p-3 rounded border">
                      <div className="text-sm text-slate-500">{item.productName}</div>
                      <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(item.latestPrice)}
                      </div>
                      {priceChange && (
                        <div
                          className={`text-xs ${
                            priceChange.isUp ? 'text-red-500' : 'text-green-500'
                          }`}
                        >
                          {priceChange.isUp ? '↑' : '↓'} {formatCurrency(Math.abs(priceChange.change))} (
                          {priceChange.percent}%)
                        </div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(item.latestDate).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead className="text-right">进货单价</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead className="text-right">总价</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    暂无进货记录
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => {
                  const priceChange = getPriceChange(purchase.productId);
                  return (
                    <TableRow key={purchase.id}>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{purchase.product.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{purchase.supplier?.name || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono">{formatCurrency(purchase.unitPrice)}</span>
                        {priceChange && (
                          <span
                            className={`ml-2 text-xs ${
                              priceChange.isUp ? 'text-red-500' : 'text-green-500'
                            }`}
                          >
                            {priceChange.isUp ? '↑' : '↓'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {purchase.quantity} {purchase.product.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        {formatCurrency(purchase.unitPrice * purchase.quantity)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}