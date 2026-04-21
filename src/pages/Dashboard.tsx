import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuickActions } from '@/components/QuickActions';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { DashboardService } from '@/services/DashboardService';
import { formatCurrency } from '@/lib/utils';
import { calculateFlowStats } from '@/lib/calculations';
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
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  orderCount: number;
  // 收入明细
  salesIncome: number;
  collectionIncome: number;
  purchaseReturnIncome: number;
  supplierCommissionIncome: number;
  // 支出明细
  purchaseExpense: number;
  saleReturnExpense: number;
  dailyExpenseTotal: number;
  introducerCommissionExpense: number;
  installationFeeTotal: number;
  // 按支付方式统计
  cashAmount: number;
  wechatAmount: number;
  alipayAmount: number;
  transferAmount: number;
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

interface ReminderOrder {
  id: string;
  deliveryStatus: string;
  totalFee: number;
  saleOrder: {
    buyer: { name: string } | null;
    totalAmount: number;
  } | null;
}

interface ReminderAppointment {
  id: string;
  contact: { name: string } | null;
  appointmentDate: Date;
  serviceType: string;
  installer: string | null;
  status: string;
}

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
  const [reminderOrders, setReminderOrders] = useState<ReminderOrder[]>([]);
  const [reminderAppointments, setReminderAppointments] = useState<ReminderAppointment[]>([]);
  const [flowStats, setFlowStats] = useState<FlowStats>({
    totalIncome: 0,
    totalExpense: 0,
    netIncome: 0,
    orderCount: 0,
    salesIncome: 0,
    collectionIncome: 0,
    purchaseReturnIncome: 0,
    purchaseExpense: 0,
    saleReturnExpense: 0,
    cashAmount: 0,
    wechatAmount: 0,
    alipayAmount: 0,
    transferAmount: 0,
    supplierCommissionIncome: 0,
    dailyExpenseTotal: 0,
    introducerCommissionExpense: 0,
    installationFeeTotal: 0,
  });
  const [flowPeriod, setFlowPeriod] = useState<FlowPeriod>('today');
  const [flowCollapsed, setFlowCollapsed] = useState(true);
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

      const [
        allProducts,
        todayNewOrders,
        recentNewOrders,
        allNewOrders,
        newOrderItems,
        deliveringOrders,
        upcomingAppointments,
      ] = await Promise.all([
        DashboardService.getAllProducts(),
        DashboardService.getTodayNewOrders(today),
        DashboardService.getRecentNewOrders(weekAgo),
        DashboardService.getAllNewOrdersInPeriod(weekAgo),
        DashboardService.getNewOrderItemsInPeriod(weekAgo),
        DashboardService.getDeliveringOrders(),
        DashboardService.getUpcomingAppointments(),
      ]);

      setReminderOrders(deliveringOrders);
      setReminderAppointments(upcomingAppointments);

      const lowStock = allProducts.filter(p => p.stock <= p.minStock && p.minStock > 0);
      const todayNewOrdersTotal = todayNewOrders.reduce((sum, o) => sum + o.paidAmount, 0);
      const todaySales = todayNewOrdersTotal;
      const todayOrders = todayNewOrders.length;

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

      const recentAll = recentNewOrders.map(o => ({
        id: o.id,
        paidAmount: o.paidAmount,
        saleDate: o.saleDate,
        customer: o.buyer,
      })).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()).slice(0, 10);
      setRecentSales(recentAll as any);

      const chartMap = new Map<string, { sales: number; orders: number }>();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        chartMap.set(dateStr, { sales: 0, orders: 0 });
      }

      allNewOrders.forEach((order) => {
        const dateStr = new Date(order.saleDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        const existing = chartMap.get(dateStr);
        if (existing) {
          existing.sales += order.paidAmount;
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
      newOrderItems.forEach((item: any) => {
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
      let endDate: Date = new Date();
      if (period === 'today') {
        startDate = today;
      } else if (period === 'week') {
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }

      const [orders, collections, purchases, purchaseReturns, commissions, dailyExpenses, serviceAppointments] = await Promise.all([
        DashboardService.getOrdersInDateRange(startDate, endDate),
        DashboardService.getCollectionsInDateRange(startDate, endDate),
        DashboardService.getPurchasesInDateRange(startDate, endDate),
        DashboardService.getPurchaseReturnsInDateRange(startDate, endDate),
        DashboardService.getBusinessCommissionsInDateRange(startDate, endDate),
        DashboardService.getDailyExpensesInDateRange(startDate, endDate),
        DashboardService.getServiceAppointmentsInDateRange(startDate, endDate),
      ]);

      const stats = calculateFlowStats(orders, collections, purchases, purchaseReturns, commissions, dailyExpenses, serviceAppointments);
      setFlowStats(stats);
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

      <QuickActions />
      </div>

      {(reminderOrders.length > 0 || reminderAppointments.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reminderOrders.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                  🚚 即将配送（3天内）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reminderOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-2 bg-white rounded border border-orange-100">
                      <div>
                        <div className="font-medium text-slate-800 text-sm">
                          {order.saleOrder?.buyer?.name || '散客'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {order.deliveryStatus === 'pending' ? '待发货' :
                           order.deliveryStatus === 'shipped' ? '已发货' :
                           order.deliveryStatus === 'in_transit' ? '配送中' : order.deliveryStatus}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          待处理
                        </Badge>
                        <div className="text-xs text-slate-500 mt-1">
                          ¥{(order.totalFee || 0).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {reminderAppointments.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  📅 今日预约
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reminderAppointments.map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                      <div>
                        <div className="font-medium text-slate-800 text-sm">
                          {appt.serviceType}
                        </div>
                        <div className="text-xs text-slate-500">
                          {appt.contact?.name || '无联系人'} {appt.installer && `- ${appt.installer}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          {appt.status}
                        </Badge>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(appt.appointmentDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader 
          className="flex flex-row items-center justify-between cursor-pointer"
          onClick={() => setFlowCollapsed(!flowCollapsed)}
        >
          <div className="flex items-center gap-2">
            <CardTitle>💰 流水账</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!flowCollapsed && (
              <div className="flex gap-1">
                <Button
                  variant={flowPeriod === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFlowPeriod('today');
                  }}
                >
                  今日
                </Button>
                <Button
                  variant={flowPeriod === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFlowPeriod('week');
                  }}
                >
                  本周
                </Button>
                <Button
                  variant={flowPeriod === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFlowPeriod('month');
                  }}
                >
                  本月
                </Button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFlowCollapsed(!flowCollapsed); }}>
              {flowCollapsed ? '展开' : '收起'}
            </Button>
          </div>
        </CardHeader>
        {!flowCollapsed && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm text-green-600">📈 总收入</div>
                <div className="text-2xl font-bold text-green-700">{formatCurrency(flowStats.totalIncome)}</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-sm text-red-600">📉 总支出</div>
                <div className="text-2xl font-bold text-red-700">{formatCurrency(flowStats.totalExpense)}</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600">💰 净收入</div>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(flowStats.netIncome)}</div>
                <div className="text-xs text-blue-500">{flowStats.orderCount} 笔订单</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-slate-700 flex items-center gap-2">
                  <span className="text-green-600">📥</span> 收入明细
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>销售收款</span>
                    <span className="font-bold text-slate-800">{formatCurrency(flowStats.salesIncome)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>客户回款</span>
                    <span className="font-bold text-slate-800">{formatCurrency(flowStats.collectionIncome)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>进货退款</span>
                    <span className="font-bold text-slate-800">{formatCurrency(flowStats.purchaseReturnIncome)}</span>
                  </div>
                  {flowStats.supplierCommissionIncome > 0 && (
                    <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                      <span>供应商返点</span>
                      <span className="font-bold text-green-800">{formatCurrency(flowStats.supplierCommissionIncome)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-slate-700 flex items-center gap-2">
                  <span className="text-red-600">📤</span> 支出明细
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>进货付款</span>
                    <span className="font-bold text-slate-800">{formatCurrency(flowStats.purchaseExpense)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span>销售退款</span>
                    <span className="font-bold text-slate-800">{formatCurrency(flowStats.saleReturnExpense)}</span>
                  </div>
                  {flowStats.dailyExpenseTotal > 0 && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span>日常支出</span>
                      <span className="font-bold text-orange-800">{formatCurrency(flowStats.dailyExpenseTotal)}</span>
                    </div>
                  )}
                  {flowStats.introducerCommissionExpense > 0 && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span>介绍人返点</span>
                      <span className="font-bold text-orange-800">{formatCurrency(flowStats.introducerCommissionExpense)}</span>
                    </div>
                  )}
                  {flowStats.installationFeeTotal > 0 && (
                    <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                      <span>安装费</span>
                      <span className="font-bold text-orange-800">{formatCurrency(flowStats.installationFeeTotal)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                <span>💳</span> 收款方式统计
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              </div>
            </div>
          </CardContent>
        )}
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
