import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  lowStockCount: number;
  totalProducts: number;
}

interface FlowStats {
  totalSales: number;
  cashAmount: number;
  wechatAmount: number;
  alipayAmount: number;
  transferAmount: number;
  newReceivable: number;
  orderCount: number;
}

interface ChartData {
  date: string;
  sales: number;
  orders: number;
}

interface TopProduct {
  id: string;
  name: string;
  totalQuantity: number;
  totalAmount: number;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
}

interface Sale {
  id: string;
  paidAmount: number;
  totalAmount: number;
  saleDate: Date;
  customer: { name: string } | null;
}

type FlowPeriod = 'today' | 'week' | 'month';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    lowStockCount: 0,
    totalProducts: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [flowStats, setFlowStats] = useState<FlowStats>({
    totalSales: 0,
    cashAmount: 0,
    wechatAmount: 0,
    alipayAmount: 0,
    transferAmount: 0,
    newReceivable: 0,
    orderCount: 0,
  });
  const [flowPeriod, setFlowPeriod] = useState<FlowPeriod>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadFlowStats('today');
  }, []);

  useEffect(() => {
    loadFlowStats(flowPeriod);
  }, [flowPeriod]);

  const loadDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [allProducts, todaySalesData, recentSalesData, allSales, saleItems] = await Promise.all([
        db.product.findMany(),
        db.sale.findMany({
          where: { saleDate: { gte: today } },
          include: { customer: true },
        }),
        db.sale.findMany({
          where: { saleDate: { gte: weekAgo } },
          orderBy: { saleDate: 'desc' },
          take: 10,
          include: { customer: true },
        }),
        db.sale.findMany({
          where: { saleDate: { gte: weekAgo } },
        }),
        db.saleItem.findMany({
          where: { createdAt: { gte: weekAgo } },
          include: { product: true },
        }),
      ]);

      const lowStock = allProducts.filter(p => p.stock <= p.minStock && p.minStock > 0);
      const todaySales = todaySalesData.reduce((sum, s) => sum + s.paidAmount, 0);
      const todayOrders = todaySalesData.length;

      setStats({
        todaySales,
        todayOrders,
        lowStockCount: lowStock.length,
        totalProducts: allProducts.length,
      });
      setLowStockProducts(lowStock.slice(0, 5).map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
        unit: p.unit,
      })));
      setRecentSales(recentSalesData);

      const chartMap = new Map<string, { sales: number; orders: number }>();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        chartMap.set(dateStr, { sales: 0, orders: 0 });
      }

      allSales.forEach((sale) => {
        const dateStr = new Date(sale.saleDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        const existing = chartMap.get(dateStr);
        if (existing) {
          existing.sales += sale.paidAmount;
          existing.orders += 1;
        }
      });

      const chartDataArray = Array.from(chartMap.entries()).map(([date, data]) => ({
        date,
        sales: Math.round(data.sales),
        orders: data.orders,
      }));
      setChartData(chartDataArray);

      const productMap = new Map<string, { name: string; quantity: number; amount: number }>();
      saleItems.forEach((item: any) => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.amount += item.subtotal;
        } else {
          productMap.set(item.productId, {
            name: item.product?.name || '未知商品',
            quantity: item.quantity,
            amount: item.subtotal,
          });
        }
      });

      const topProductsArray = Array.from(productMap.entries())
        .map(([id, data]) => ({ id, ...data, totalQuantity: data.quantity, totalAmount: data.amount }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);
      setTopProducts(topProductsArray);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFlowStats = async (period: FlowPeriod) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let startDate: Date;
      if (period === 'today') {
        startDate = today;
      } else if (period === 'week') {
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }

      const salesInPeriod = await db.sale.findMany({
        where: { saleDate: { gte: startDate } },
        include: { payments: true },
      });

      let cashAmount = 0;
      let wechatAmount = 0;
      let alipayAmount = 0;
      let transferAmount = 0;
      let totalSales = 0;
      let newReceivable = 0;

      salesInPeriod.forEach(sale => {
        totalSales += sale.totalAmount;
        const paidAmount = sale.paidAmount;
        const receivable = sale.totalAmount - sale.paidAmount;
        newReceivable += receivable;

        sale.payments.forEach(payment => {
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
      });

      setFlowStats({
        totalSales,
        cashAmount,
        wechatAmount,
        alipayAmount,
        transferAmount,
        newReceivable,
        orderCount: salesInPeriod.length,
      });
    } catch (error) {
      console.error('Failed to load flow stats:', error);
    }
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
          <h2 className="text-2xl font-bold text-slate-800">欢迎回来！</h2>
          <p className="text-slate-500 mt-1">查看今日经营状况</p>
        </div>
        <div className="flex gap-3">
          <Link to="/sales/new">
            <Button className="bg-orange-500 hover:bg-orange-600">
              + 新增销售
            </Button>
          </Link>
          <Link to="/purchases">
            <Button variant="outline">+ 进货入库</Button>
          </Link>
          <Link to="/products/new">
            <Button variant="outline">+ 添加商品</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">今日销售额</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.todaySales)}</div>
            <p className="text-xs text-slate-500 mt-1">今日订单 {stats.todayOrders} 笔</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">库存预警</CardTitle>
            <span className="text-2xl">⚠️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockCount}</div>
            <p className="text-xs text-slate-500 mt-1">种商品库存不足</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">商品总数</CardTitle>
            <span className="text-2xl">📦</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalProducts}</div>
            <p className="text-xs text-slate-500 mt-1">种商品在库</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">快捷操作</CardTitle>
            <span className="text-2xl">⚡</span>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/sales/new" className="block">
              <Button variant="outline" className="w-full justify-start text-sm">
                💰 快速销售
              </Button>
            </Link>
            <Link to="/inventory" className="block">
              <Button variant="outline" className="w-full justify-start text-sm">
                📦 查看库存
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>💰 流水账</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={flowPeriod === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFlowPeriod('today')}
            >
              今日
            </Button>
            <Button
              variant={flowPeriod === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFlowPeriod('week')}
            >
              本周
            </Button>
            <Button
              variant={flowPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFlowPeriod('month')}
            >
              本月
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-500">总销售额</div>
              <div className="text-xl font-bold text-slate-900">{formatCurrency(flowStats.totalSales)}</div>
              <div className="text-xs text-slate-400">{flowStats.orderCount} 笔订单</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600">💵 现金</div>
              <div className="text-xl font-bold text-green-700">{formatCurrency(flowStats.cashAmount)}</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600">💚 微信</div>
              <div className="text-xl font-bold text-green-700">{formatCurrency(flowStats.wechatAmount)}</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600">💙 支付宝</div>
              <div className="text-xl font-bold text-blue-700">{formatCurrency(flowStats.alipayAmount)}</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600">💜 转账</div>
              <div className="text-xl font-bold text-purple-700">{formatCurrency(flowStats.transferAmount)}</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-sm text-orange-600">📋 新增欠款</div>
              <div className="text-xl font-bold text-orange-700">{formatCurrency(flowStats.newReceivable)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>近7天销售趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#f97316"
                    fill="#fed7aa"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>热销商品 TOP5</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>库存预警提醒</CardTitle>
            <Link to="/inventory?filter=low">
              <Button variant="ghost" size="sm">查看全部</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                🎉 所有商品库存充足
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100"
                  >
                    <div>
                      <div className="font-medium text-slate-800">{product.name}</div>
                      <div className="text-sm text-slate-500">
                        当前库存: {product.stock} {product.unit}
                      </div>
                    </div>
                    <Badge variant="warning">库存不足</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近销售</CardTitle>
            <Link to="/sales">
              <Button variant="ghost" size="sm">查看全部</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                暂无销售记录
              </div>
            ) : (
              <div className="space-y-3">
                {recentSales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-slate-800">
                        {sale.customer?.name || '散客'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {new Date(sale.saleDate).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-orange-600">
                        {formatCurrency(sale.paidAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
