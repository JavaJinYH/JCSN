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
import { ReportService } from '@/services/ReportService';
import { formatCurrency } from '@/lib/utils';
import type { Contact } from '@/lib/types';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

type ReportType = 'daily' | 'monthly' | 'yearly' | 'products' | 'profit' | 'customer' | 'returns' | 'baddebt';

interface ReportData {
  totalSales: number;
  totalOrders: number;
  totalProfit: number;
  avgOrderValue: number;
}

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

// 信用等级显示
const getCreditLevelLabel = (level: string) => {
  const labels = {
    excellent: '优秀',
    good: '良好',
    normal: '普通',
    poor: '较差',
    blocked: '冻结',
  };
  return labels[level as keyof typeof labels] || level;
};

const getCreditLevelColor = (level: string) => {
  const colors = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    normal: 'bg-gray-500',
    poor: 'bg-orange-500',
    blocked: 'bg-red-500',
  };
  return colors[level as keyof typeof colors] || 'bg-gray-500';
};

// 风险等级显示
const getRiskLevelLabel = (level: string) => {
  const labels = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '极高风险',
  };
  return labels[level as keyof typeof labels] || level;
};

const getRiskLevelColor = (level: string) => {
  const colors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };
  return colors[level as keyof typeof colors] || 'bg-gray-500';
};

// 价值标签显示
const getAutoTagLabel = (tag: string | null) => {
  const labels = {
    star: '★高价值',
    triangle: '△中等价值',
    circle: '○普通价值',
    cross: '×低价值',
  };
  return labels[tag as keyof typeof labels] || '-';
};

const getAutoTagColor = (tag: string | null) => {
  const colors = {
    star: 'text-yellow-500',
    triangle: 'text-blue-500',
    circle: 'text-gray-500',
    cross: 'text-red-500',
  };
  return colors[tag as keyof typeof colors] || 'text-gray-500';
};

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [productRanking, setProductRanking] = useState<any[]>([]);
  const [customerRanking, setCustomerRanking] = useState<any[]>([]);
  const [returnStats, setReturnStats] = useState<any>(null);
  const [badDebtStats, setBadDebtStats] = useState<any>(null);
  const [returns, setReturns] = useState<any[]>([]);
  const [badDebtWriteOffs, setBadDebtWriteOffs] = useState<any[]>([]);
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
        case 'returns':
          await loadReturnsReport(start, end);
          break;
        case 'baddebt':
          await loadBadDebtReport(start, end);
          break;
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesReport = async (start: Date, end: Date) => {
    const orders = await ReportService.getSalesInPeriod(start, end);

    let totalSales = 0;
    let totalCost = 0;
    orders.forEach(order => {
      const netSales = ReportService.calculateNetSales(order);
      totalSales += netSales;

      let orderCost = order.items.reduce((sum, item) => sum + item.costPriceSnapshot * item.quantity, 0);
      let orderTotal = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);

      if (orderTotal > 0) {
        const retRatio = order.returns?.reduce((sum, r) => sum + r.totalAmount, 0) / orderTotal || 0;
        const writeOffRatio = order.badDebtWriteOffs?.reduce((sum, w) => sum + w.writtenOffAmount, 0) / orderTotal || 0;
        orderCost = orderCost * (1 - retRatio - writeOffRatio);
      }
      totalCost += Math.max(0, orderCost);
    });

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
        existing.sales += ReportService.calculateNetSales(order);
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
    const orderItems = await ReportService.getOrderItemsInPeriod(start, end);

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
    const orders = await ReportService.getSalesInPeriod(start, end);

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
        const netSales = ReportService.calculateNetSales(order);
        let orderCost = order.items.reduce((sum, item) => sum + item.costPriceSnapshot * item.quantity, 0);
        let orderTotal = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);

        if (orderTotal > 0) {
          const retRatio = order.returns?.reduce((sum, r) => sum + r.totalAmount, 0) / orderTotal || 0;
          const writeOffRatio = order.badDebtWriteOffs?.reduce((sum, w) => sum + w.writtenOffAmount, 0) / orderTotal || 0;
          orderCost = orderCost * (1 - retRatio - writeOffRatio);
        }
        
        existing.revenue += netSales;
        existing.cost += orderCost;
        existing.profit += netSales - orderCost;
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

    let totalRevenue = 0;
    let totalCost = 0;
    orders.forEach(order => {
      totalRevenue += ReportService.calculateNetSales(order);
      let orderCost = order.items.reduce((sum, item) => sum + item.costPriceSnapshot * item.quantity, 0);
      let orderTotal = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);

      if (orderTotal > 0) {
        const retRatio = order.returns?.reduce((sum, r) => sum + r.totalAmount, 0) / orderTotal || 0;
        const writeOffRatio = order.badDebtWriteOffs?.reduce((sum, w) => sum + w.writtenOffAmount, 0) / orderTotal || 0;
        orderCost = orderCost * (1 - retRatio - writeOffRatio);
      }
      totalCost += Math.max(0, orderCost);
    });

    setReportData({
      totalSales: totalRevenue,
      totalOrders: orders.length,
      totalProfit: totalRevenue - totalCost,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    });
  };

  const loadCustomerReport = async (start: Date, end: Date) => {
    const orders = await ReportService.getSalesInPeriod(start, end);
    const contacts = await ReportService.getContacts() as Contact[];

    const contactMap = new Map<string, Contact>(contacts.map(c => [c.id, c]));

    const customerMap = new Map<string, {
      name: string;
      phone: string | null;
      type: string;
      amount: number;
      orders: number;
      valueScore: number | null;
      autoTag: string | null;
      creditLevel: string;
      riskLevel: string;
      blacklist: boolean;
    }>();
    
    orders.forEach((order) => {
      if (!order.buyer) return;
      const netSales = ReportService.calculateNetSales(order);
      const existing = customerMap.get(order.buyerId);
      if (existing) {
        existing.amount += netSales;
        existing.orders += 1;
      } else {
        const contact = contactMap.get(order.buyerId);
        customerMap.set(order.buyerId, {
          name: order.buyer.name,
          phone: order.buyer.primaryPhone,
          type: order.buyer.contactType,
          amount: netSales,
          orders: 1,
          valueScore: contact?.valueScore ?? null,
          autoTag: contact?.autoTag ?? null,
          creditLevel: contact?.creditLevel ?? 'normal',
          riskLevel: contact?.riskLevel ?? 'low',
          blacklist: contact?.blacklist ?? false,
        });
      }
    });

    const ranking = Array.from(customerMap.entries())
      .map(([_, data]) => data)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    setCustomerRanking(ranking);
  };

  const loadReturnsReport = async (start: Date, end: Date) => {
    const stats = await ReportService.getReturnStats(start, end);
    const returnsData = await ReportService.getReturnsInPeriod(start, end);
    
    setReturnStats(stats);
    setReturns(returnsData);
    
    if (stats.dailyReturns) {
      setChartData(stats.dailyReturns);
    }
  };

  const loadBadDebtReport = async (start: Date, end: Date) => {
    const stats = await ReportService.getBadDebtStats(start, end);
    const writeOffs = await ReportService.getBadDebtWriteOffsInPeriod(start, end);
    
    setBadDebtStats(stats);
    setBadDebtWriteOffs(writeOffs);
    
    if (stats.dailyWriteOffs) {
      setChartData(stats.dailyWriteOffs);
    }
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
      case 'returns':
        dataToExport = returns.map(r => ({
          日期: dayjs(r.returnDate).format('YYYY-MM-DD'),
          客户: r.saleOrder?.buyer?.name || '-',
          退货金额: r.totalAmount,
          备注: r.remark || '-'
        }));
        filename = `退货报表_${startDate}_${endDate}`;
        break;
      case 'baddebt':
        dataToExport = badDebtWriteOffs.map(w => ({
          日期: dayjs(w.createdAt).format('YYYY-MM-DD'),
          客户: w.contact?.name || '-',
          核销金额: w.writtenOffAmount,
          原因: w.reason || '-'
        }));
        filename = `坏账报表_${startDate}_${endDate}`;
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
                <SelectItem value="returns">退货分析</SelectItem>
                <SelectItem value="baddebt">坏账分析</SelectItem>
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

      {reportData && reportType !== 'returns' && reportType !== 'baddebt' && (
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

      {returnStats && reportType === 'returns' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {returnStats.totalReturns}
              </div>
              <div className="text-sm text-slate-500">退货单数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(returnStats.totalReturnAmount)}
              </div>
              <div className="text-sm text-slate-500">退货总额</div>
            </CardContent>
          </Card>
        </div>
      )}

      {badDebtStats && reportType === 'baddebt' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {badDebtStats.totalWriteOffs}
              </div>
              <div className="text-sm text-slate-500">坏账单数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(badDebtStats.totalWriteOffAmount)}
              </div>
              <div className="text-sm text-slate-500">坏账总额</div>
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

      {reportType === 'returns' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>退货趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
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
                    <Bar dataKey="amount" fill="#ef4444" name="退货金额" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="count" fill="#f97316" name="退货单数" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>退货商品 TOP10</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>排名</TableHead>
                    <TableHead>商品名称</TableHead>
                    <TableHead className="text-right">退货量</TableHead>
                    <TableHead className="text-right">退货金额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnStats?.topProducts?.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.product?.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'baddebt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>坏账趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
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
                    <Bar dataKey="amount" fill="#f97316" name="坏账金额" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="count" fill="#ef4444" name="坏账单数" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>坏账客户 TOP10</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>排名</TableHead>
                    <TableHead>客户名称</TableHead>
                    <TableHead className="text-right">坏账单数</TableHead>
                    <TableHead className="text-right">坏账金额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {badDebtStats?.topContacts?.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.contact?.name}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
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
        <div className="space-y-6">
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
                    <TableHead>价值评分</TableHead>
                    <TableHead>信用等级</TableHead>
                    <TableHead>风险等级</TableHead>
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
                      <TableCell className="font-medium">
                        {item.blacklist && <Badge variant="destructive" className="mr-2">黑名单</Badge>}
                        {item.name}
                      </TableCell>
                      <TableCell>
                        {item.valueScore != null ? (
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-orange-600">{item.valueScore.toFixed(1)}</span>
                            <span className="text-yellow-500">★</span>
                            {item.autoTag && (
                              <span className={`text-xs ${getAutoTagColor(item.autoTag)}`}>
                                {getAutoTagLabel(item.autoTag)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.creditLevel ? (
                          <Badge className={getCreditLevelColor(item.creditLevel)}>
                            {getCreditLevelLabel(item.creditLevel)}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.riskLevel ? (
                          <Badge className={getRiskLevelColor(item.riskLevel)}>
                            {getRiskLevelLabel(item.riskLevel)}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
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
        </div>
      )}

      {reportType === 'returns' && (
        <Card>
          <CardHeader>
            <CardTitle>退货明细</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead className="text-right">退货金额</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{dayjs(item.returnDate).format('YYYY-MM-DD')}</TableCell>
                    <TableCell>{item.saleOrder?.buyer?.name || '-'}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {formatCurrency(item.totalAmount)}
                    </TableCell>
                    <TableCell>{item.remark || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {reportType === 'baddebt' && (
        <Card>
          <CardHeader>
            <CardTitle>坏账明细</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead className="text-right">核销金额</TableHead>
                  <TableHead>原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {badDebtWriteOffs.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{dayjs(item.createdAt).format('YYYY-MM-DD')}</TableCell>
                    <TableCell>{item.contact?.name || '-'}</TableCell>
                    <TableCell className="text-right font-mono text-orange-600">
                      {formatCurrency(item.writtenOffAmount)}
                    </TableCell>
                    <TableCell>{item.reason || '-'}</TableCell>
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
