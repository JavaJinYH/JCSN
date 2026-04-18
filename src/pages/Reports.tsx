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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

type ReportType = 'daily' | 'monthly' | 'yearly' | 'products' | 'profit' | 'customer';

interface ReportData {
  totalSales: number;
  totalOrders: number;
  totalProfit: number;
  avgOrderValue: number;
}

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [productRanking, setProductRanking] = useState<any[]>([]);
  const [customerRanking, setCustomerRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [reportType, startDate, endDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate + 'T23:59:59');

      switch (reportType) {
        case 'daily':
        case 'monthly':
        case 'yearly':
          await loadSalesReport(start, end);
          break;
        case 'products':
          await loadProductReport(start, end);
          break;
        case 'profit':
          await loadProfitReport(start, end);
          break;
        case 'customer':
          await loadCustomerReport(start, end);
          break;
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesReport = async (start: Date, end: Date) => {
    const orders = await db.saleOrder.findMany({
      where: { saleDate: { gte: start, lte: end } },
      include: { items: true },
    });

    const totalSales = orders.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalCost = orders.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => itemSum + item.costPriceSnapshot * item.quantity, 0);
    }, 0);
    const totalProfit = totalSales - totalCost;
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    setReportData({ totalSales, totalOrders, totalProfit, avgOrderValue });

    const dailyData = new Map<string, { sales: number; orders: number }>();
    const current = new Date(start);
    while (current <= end) {
      const key = dayjs(current).format('MM-DD');
      dailyData.set(key, { sales: 0, orders: 0 });
      current.setDate(current.getDate() + 1);
    }

    orders.forEach((order) => {
      const key = dayjs(order.saleDate).format('MM-DD');
      const existing = dailyData.get(key);
      if (existing) {
        existing.sales += order.paidAmount;
        existing.orders += 1;
      }
    });

    setChartData(
      Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        sales: Math.round(data.sales),
        orders: data.orders,
      }))
    );
  };

  const loadProductReport = async (start: Date, end: Date) => {
    const orderItems = await db.orderItem.findMany({
      where: {
        order: {
          saleDate: { gte: start, lte: end },
        },
      },
      include: { product: true },
    });

    const productMap = new Map<string, any>();
    orderItems.forEach((item) => {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.amount += item.subtotal;
        existing.profit += (item.unitPrice - item.costPriceSnapshot) * item.quantity;
      } else {
        productMap.set(item.productId, {
          name: item.product.name,
          quantity: item.quantity,
          amount: item.subtotal,
          profit: (item.unitPrice - item.costPriceSnapshot) * item.quantity,
        });
      }
    });

    const ranking = Array.from(productMap.entries())
      .map(([_, data]) => data)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    setProductRanking(ranking);
    setChartData(ranking.slice(0, 5));
  };

  const loadProfitReport = async (start: Date, end: Date) => {
    const orders = await db.saleOrder.findMany({
      where: { saleDate: { gte: start, lte: end } },
      include: { items: true },
    });

    const dailyData = new Map<string, { revenue: number; cost: number; profit: number }>();
    const current = new Date(start);
    while (current <= end) {
      const key = dayjs(current).format('MM-DD');
      dailyData.set(key, { revenue: 0, cost: 0, profit: 0 });
      current.setDate(current.getDate() + 1);
    }

    orders.forEach((order) => {
      const key = dayjs(order.saleDate).format('MM-DD');
      const existing = dailyData.get(key);
      if (existing) {
        const orderCost = order.items.reduce((sum, item) => sum + item.costPriceSnapshot * item.quantity, 0);
        existing.revenue += order.paidAmount;
        existing.cost += orderCost;
        existing.profit += order.paidAmount - orderCost;
      }
    });

    setChartData(
      Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue),
        cost: Math.round(data.cost),
        profit: Math.round(data.profit),
      }))
    );

    const totalRevenue = orders.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalCost = orders.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => itemSum + item.costPriceSnapshot * item.quantity, 0);
    }, 0);

    setReportData({
      totalSales: totalRevenue,
      totalOrders: orders.length,
      totalProfit: totalRevenue - totalCost,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    });
  };

  const loadCustomerReport = async (start: Date, end: Date) => {
    const orders = await db.saleOrder.findMany({
      where: {
        saleDate: { gte: start, lte: end },
      },
      include: { buyer: true },
    });

    const customerMap = new Map<string, any>();
    orders.forEach((order) => {
      if (!order.buyer) return;
      const existing = customerMap.get(order.buyerId);
      if (existing) {
        existing.amount += order.paidAmount;
        existing.orders += 1;
      } else {
        customerMap.set(order.buyerId, {
          name: order.buyer.name,
          phone: order.buyer.primaryPhone,
          type: order.buyer.contactType,
          amount: order.paidAmount,
          orders: 1,
        });
      }
    });

    const ranking = Array.from(customerMap.entries())
      .map(([_, data]) => data)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    setCustomerRanking(ranking);
  };

  const exportToExcel = () => {
    let dataToExport: any[] = [];
    let filename = '';

    switch (reportType) {
      case 'daily':
      case 'monthly':
      case 'yearly':
        dataToExport = chartData;
        filename = `销售报表_${startDate}_${endDate}`;
        break;
      case 'products':
        dataToExport = productRanking;
        filename = `商品销售排行_${startDate}_${endDate}`;
        break;
      case 'profit':
        dataToExport = chartData;
        filename = `利润分析_${startDate}_${endDate}`;
        break;
      case 'customer':
        dataToExport = customerRanking;
        filename = `客户消费排行_${startDate}_${endDate}`;
        break;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '报表');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">报表统计</h2>
          <p className="text-slate-500 mt-1">查看销售数据和分析报表</p>
        </div>
        <Button variant="outline" onClick={exportToExcel}>
          📥 导出Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <Select
              value={reportType}
              onValueChange={(value) => setReportType(value as ReportType)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">日报</SelectItem>
                <SelectItem value="monthly">月报</SelectItem>
                <SelectItem value="yearly">年报</SelectItem>
                <SelectItem value="products">商品排行</SelectItem>
                <SelectItem value="profit">利润分析</SelectItem>
                <SelectItem value="customer">客户分析</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
              />
              <span className="text-slate-400">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
              />
            </div>

            <Button variant="outline" onClick={loadReport}>
              🔄 查询
            </Button>
          </div>
        </CardHeader>
      </Card>

      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(reportData.totalSales)}
              </div>
              <div className="text-sm text-slate-500">销售总额</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-800">
                {reportData.totalOrders}
              </div>
              <div className="text-sm text-slate-500">订单总数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(reportData.totalProfit)}
              </div>
              <div className="text-sm text-slate-500">预估利润</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(reportData.avgOrderValue)}
              </div>
              <div className="text-sm text-slate-500">平均客单价</div>
            </CardContent>
          </Card>
        </div>
      )}

      {(reportType === 'daily' || reportType === 'monthly' || reportType === 'yearly') && (
        <Card>
          <CardHeader>
            <CardTitle>销售趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="销售额"
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="订单数"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {reportType === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>商品销售排行 TOP10</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>排名</TableHead>
                    <TableHead>商品名称</TableHead>
                    <TableHead className="text-right">销量</TableHead>
                    <TableHead className="text-right">销售额</TableHead>
                    <TableHead className="text-right">利润</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productRanking.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(item.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>销售额占比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'profit' && (
        <Card>
          <CardHeader>
            <CardTitle>利润分析趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
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
                  <Legend />
                  <Bar dataKey="revenue" fill="#f97316" name="销售额" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" fill="#94a3b8" name="成本" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#22c55e" name="利润" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {reportType === 'customer' && (
        <Card>
          <CardHeader>
            <CardTitle>客户消费排行 TOP10</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>排名</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="text-right">消费金额</TableHead>
                  <TableHead className="text-right">订单数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerRanking.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant={index < 3 ? 'default' : 'secondary'}>
                        {index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-slate-500">{item.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-orange-600">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell className="text-right">{item.orders}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
