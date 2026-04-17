import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getAgingLevel, calculateAgingDays } from '@/lib/customerUtils';
import { toast } from '@/components/Toast';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

type ViewMode = 'summary' | 'customer' | 'company' | 'project';
type CustomerType = 'all' | 'company' | 'personal';

interface CustomerSummary {
  customerId: string;
  customerName: string;
  customerType: string;
  phone: string | null;
  address: string | null;
  totalReceivable: number;
  totalPaid: number;
  totalRemaining: number;
  recordCount: number;
  oldestRecord: Date | null;
  newestRecord: Date | null;
  agingDistribution: {
    normal: number;
    attention: number;
    warning: number;
    danger: number;
  };
}

interface CompanySummary {
  companyName: string;
  customerCount: number;
  totalReceivable: number;
  totalPaid: number;
  totalRemaining: number;
  recordCount: number;
}

interface ProjectSummary {
  projectId: string;
  projectName: string;
  customerName: string;
  totalReceivable: number;
  totalPaid: number;
  totalRemaining: number;
  status: string;
}

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
const AGING_COLORS = {
  normal: '#22c55e',
  attention: '#eab308',
  warning: '#f97316',
  danger: '#ef4444',
};

export function Statements() {
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedYear, setSelectedYear] = useState(dayjs().year().toString());
  const [customers, setCustomers] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [selectedCustomerStatement, setSelectedCustomerStatement] = useState<CustomerSummary | null>(null);
  const [statementDetailData, setStatementDetailData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersData, receivablesData, projectsData, salesData] = await Promise.all([
        db.customer.findMany({
          orderBy: { name: 'asc' },
          include: { phoneRecords: true },
        }),
        db.accountReceivable.findMany({
          where: {
            status: { in: ['pending', 'partial'] },
            remainingAmount: { gt: 0 },
          },
          include: { customer: true },
          orderBy: { createdAt: 'desc' },
        }),
        db.project.findMany({
          where: { status: { in: ['进行中', '已暂停'] } },
          include: { customer: true },
          orderBy: { createdAt: 'desc' },
        }),
        db.sale.findMany({
          where: {
            paidAmount: { lt: db.sale.fields.totalAmount },
          },
          include: {
            customer: true,
            project: true,
            items: true,
            payments: true,
          },
          orderBy: { saleDate: 'desc' },
        }),
      ]);

      setCustomers(customersData);
      setReceivables(receivablesData);
      setProjects(projectsData);
      setSales(salesData);
    } catch (error) {
      console.error('[Statements] 加载数据失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const customerSummaries = useMemo(() => {
    const yearStart = new Date(parseInt(selectedYear), 0, 1);
    const yearEnd = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);

    const filteredReceivables = receivables.filter(r => {
      const createdAt = new Date(r.createdAt);
      return createdAt >= yearStart && createdAt <= yearEnd;
    });

    const summaryMap = new Map<string, CustomerSummary>();

    filteredReceivables.forEach(r => {
      const existing = summaryMap.get(r.customerId);
      const agingDays = calculateAgingDays(r.agreedPaymentDate, r.createdAt);
      const aging = getAgingLevel(agingDays);

      if (existing) {
        existing.totalReceivable += r.originalAmount;
        existing.totalPaid += r.paidAmount;
        existing.totalRemaining += r.remainingAmount;
        existing.recordCount += 1;
        if (!existing.oldestRecord || r.createdAt < existing.oldestRecord) {
          existing.oldestRecord = r.createdAt;
        }
        if (!existing.newestRecord || r.createdAt > existing.newestRecord) {
          existing.newestRecord = r.createdAt;
        }
        if (aging.level === 'normal') existing.agingDistribution.normal += r.remainingAmount;
        else if (aging.level === 'attention') existing.agingDistribution.attention += r.remainingAmount;
        else if (aging.level === 'warning') existing.agingDistribution.warning += r.remainingAmount;
        else existing.agingDistribution.danger += r.remainingAmount;
      } else {
        const customer = customers.find(c => c.id === r.customerId);
        summaryMap.set(r.customerId, {
          customerId: r.customerId,
          customerName: customer?.name || '未知客户',
          customerType: customer?.customerType || '普通客户',
          phone: customer?.phone || (customer?.phoneRecords?.[0]?.phone) || null,
          address: customer?.address || null,
          totalReceivable: r.originalAmount,
          totalPaid: r.paidAmount,
          totalRemaining: r.remainingAmount,
          recordCount: 1,
          oldestRecord: r.createdAt,
          newestRecord: r.createdAt,
          agingDistribution: {
            normal: aging.level === 'normal' ? r.remainingAmount : 0,
            attention: aging.level === 'attention' ? r.remainingAmount : 0,
            warning: aging.level === 'warning' ? r.remainingAmount : 0,
            danger: aging.level === 'danger' ? r.remainingAmount : 0,
          },
        });
      }
    });

    let summaries = Array.from(summaryMap.values());

    if (customerTypeFilter !== 'all') {
      summaries = summaries.filter(s => {
        if (customerTypeFilter === 'company') {
          return s.customerType === '装修公司' || s.customerType === '批发商' || s.customerType === '单位';
        }
        return s.customerType === '散客' || s.customerType === '业主' || s.customerType === '水电工';
      });
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      summaries = summaries.filter(s =>
        s.customerName.toLowerCase().includes(keyword) ||
        s.phone?.toLowerCase().includes(keyword)
      );
    }

    return summaries.sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [receivables, customers, selectedYear, customerTypeFilter, searchKeyword]);

  const companySummaries = useMemo(() => {
    const companyMap = new Map<string, CompanySummary>();

    customerSummaries.forEach(cs => {
      if (cs.customerType === '装修公司' || cs.customerType === '批发商' || cs.customerType === '单位') {
        const existing = companyMap.get(cs.customerName);
        if (existing) {
          existing.totalReceivable += cs.totalReceivable;
          existing.totalPaid += cs.totalPaid;
          existing.totalRemaining += cs.totalRemaining;
          existing.recordCount += cs.recordCount;
        } else {
          companyMap.set(cs.customerName, {
            companyName: cs.customerName,
            customerCount: 1,
            totalReceivable: cs.totalReceivable,
            totalPaid: cs.totalPaid,
            totalRemaining: cs.totalRemaining,
            recordCount: cs.recordCount,
          });
        }
      }
    });

    return Array.from(companyMap.values()).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [customerSummaries]);

  const projectSummaries = useMemo(() => {
    const projectReceivables = receivables.filter(r => r.projectId);

    return projectReceivables.map(r => {
      const project = projects.find(p => p.id === r.projectId);
      const customer = customers.find(c => c.id === r.customerId);
      return {
        projectId: r.projectId,
        projectName: project?.name || '未知项目',
        customerName: customer?.name || '未知客户',
        totalReceivable: r.originalAmount,
        totalPaid: r.paidAmount,
        totalRemaining: r.remainingAmount,
        status: project?.status || '未知',
      };
    }).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [receivables, projects, customers]);

  const totalReceivableSummary = useMemo(() => {
    return customerSummaries.reduce((sum, cs) => sum + cs.totalReceivable, 0);
  }, [customerSummaries]);

  const totalRemainingSummary = useMemo(() => {
    return customerSummaries.reduce((sum, cs) => sum + cs.totalRemaining, 0);
  }, [customerSummaries]);

  const agingChartData = useMemo(() => {
    const totals = customerSummaries.reduce(
      (acc, cs) => ({
        normal: acc.normal + cs.agingDistribution.normal,
        attention: acc.attention + cs.agingDistribution.attention,
        warning: acc.warning + cs.agingDistribution.warning,
        danger: acc.danger + cs.agingDistribution.danger,
      }),
      { normal: 0, attention: 0, warning: 0, danger: 0 }
    );

    return [
      { name: '30天内', value: totals.normal, color: AGING_COLORS.normal },
      { name: '31-90天', value: totals.attention, color: AGING_COLORS.attention },
      { name: '91-180天', value: totals.warning, color: AGING_COLORS.warning },
      { name: '180天以上', value: totals.danger, color: AGING_COLORS.danger },
    ].filter(item => item.value > 0);
  }, [customerSummaries]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(new Set(customerSummaries.map(cs => cs.customerId)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    const newSelected = new Set(selectedCustomers);
    if (checked) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleGenerateStatement = async (customerSummary: CustomerSummary) => {
    try {
      const customerReceivables = receivables.filter(r => r.customerId === customerSummary.customerId);
      const customerSales = sales.filter(s => s.customerId === customerSummary.customerId);
      const customer = customers.find(c => c.id === customerSummary.customerId);

      const detailData = {
        customer: customer,
        receivables: customerReceivables,
        sales: customerSales,
        summary: customerSummary,
        generatedAt: new Date(),
        shopInfo: await db.systemSetting.findFirst(),
      };

      setStatementDetailData(detailData);
      setSelectedCustomerStatement(customerSummary);
      setShowStatementDialog(true);
    } catch (error) {
      console.error('[Statements] 生成对账单失败:', error);
      toast('生成对账单失败，请重试', 'error');
    }
  };

  const handleBatchGenerateStatements = async () => {
    if (selectedCustomers.size === 0) {
      toast('请先选择客户', 'warning');
      return;
    }

    try {
      const selectedSummaries = customerSummaries.filter(cs => selectedCustomers.has(cs.customerId));
      const batchData = selectedSummaries.map(cs => {
        const customer = customers.find(c => c.id === cs.customerId);
        return {
          customer,
          summary: cs,
        };
      });

      const wsData = batchData.map((item, index) => ({
        '序号': index + 1,
        '客户名称': item.customer?.name || '未知',
        '联系电话': item.customer?.phone || '-',
        '客户类型': item.customer?.customerType || '普通客户',
        '欠款总额': item.summary.totalReceivable,
        '已还金额': item.summary.totalPaid,
        '剩余欠款': item.summary.totalRemaining,
        '欠款笔数': item.summary.recordCount,
        '最早欠款日期': item.summary.oldestRecord ? formatDate(item.summary.oldestRecord) : '-',
        '最近欠款日期': item.summary.newestRecord ? formatDate(item.summary.newestRecord) : '-',
        '30天内': item.summary.agingDistribution.normal,
        '31-90天': item.summary.agingDistribution.attention,
        '91-180天': item.summary.agingDistribution.warning,
        '180天以上': item.summary.agingDistribution.danger,
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '对账单汇总');

      wsData.forEach((row, index) => {
        const cellRefs = ['E', 'F', 'G', 'J', 'K', 'L', 'M', 'N'];
        cellRefs.forEach(col => {
          const cellRef = `${col}${index + 2}`;
          if (ws[cellRef]) {
            ws[cellRef].t = 'n';
            ws[cellRef].z = '¥#,##0.00';
          }
        });
      });

      XLSX.writeFile(wb, `年底对账单汇总_${selectedYear}_${dayjs().format('YYYYMMDD')}.xlsx`);
      toast(`成功导出 ${batchData.length} 份对账单汇总`, 'success');

      await db.auditLog.create({
        data: {
          actionType: 'EXPORT_BATCH_STATEMENTS',
          entityType: 'Statement',
          entityId: 'batch',
          newValue: JSON.stringify({
            year: selectedYear,
            count: batchData.length,
            customerIds: Array.from(selectedCustomers),
          }),
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('[Statements] 批量导出失败:', error);
      toast('批量导出失败，请重试', 'error');
    }
  };

  const handleExportSingleStatement = async (customerSummary: CustomerSummary) => {
    try {
      const customer = customers.find(c => c.id === customerSummary.customerId);
      const customerReceivables = receivables.filter(r => r.customerId === customerSummary.customerId);
      const customerSales = sales.filter(s => s.customerId === customerSummary.customerId);

      const statementContent: any[] = [];

      statementContent.push({ '内容': '【客户信息】' });
      statementContent.push({ '内容': `客户名称: ${customer?.name || '未知'}` });
      statementContent.push({ '内容': `联系电话: ${customer?.phone || '-'}` });
      statementContent.push({ '内容': `客户类型: ${customer?.customerType || '普通客户'}` });
      if (customer?.address) {
        statementContent.push({ '内容': `地址: ${customer.address}` });
      }
      statementContent.push({ '内容': '' });

      statementContent.push({ '内容': '【账务汇总】' });
      statementContent.push({ '内容': `挂账总额: ¥${customerSummary.totalReceivable.toFixed(2)}` });
      statementContent.push({ '内容': `已还金额: ¥${customerSummary.totalPaid.toFixed(2)}` });
      statementContent.push({ '内容': `剩余欠款: ¥${customerSummary.totalRemaining.toFixed(2)}` });
      statementContent.push({ '内容': `欠款笔数: ${customerSummary.recordCount} 笔` });
      statementContent.push({ '内容': '' });

      statementContent.push({ '内容': '【账龄分析】' });
      statementContent.push({ '内容': `30天内: ¥${customerSummary.agingDistribution.normal.toFixed(2)}` });
      statementContent.push({ '内容': `31-90天: ¥${customerSummary.agingDistribution.attention.toFixed(2)}` });
      statementContent.push({ '内容': `91-180天: ¥${customerSummary.agingDistribution.warning.toFixed(2)}` });
      statementContent.push({ '内容': `180天以上: ¥${customerSummary.agingDistribution.danger.toFixed(2)}` });
      statementContent.push({ '内容': '' });

      statementContent.push({ '内容': '【未结清销售单明细】' });
      statementContent.push({
        '内容': '单号',
        '日期': '金额',
        '已付': '欠款',
        '状态': ''
      });

      customerReceivables.forEach(r => {
        statementContent.push({
          '内容': r.id.substring(0, 8),
          '日期': formatDate(r.createdAt),
          '金额': `¥${r.originalAmount.toFixed(2)}`,
          '已付': `¥${r.paidAmount.toFixed(2)}`,
          '状态': r.isOverdue ? '逾期' : '正常',
        });
      });

      const ws = XLSX.utils.json_to_sheet(statementContent);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '对账单');

      XLSX.writeFile(wb, `对账单_${customer?.name || '未知'}_${dayjs().format('YYYYMMDD')}.xlsx`);
      toast('对账单导出成功', 'success');

      await db.auditLog.create({
        data: {
          actionType: 'EXPORT_SINGLE_STATEMENT',
          entityType: 'Statement',
          entityId: customerSummary.customerId,
          newValue: JSON.stringify({ year: selectedYear, customerName: customer?.name }),
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('[Statements] 导出单份对账单失败:', error);
      toast('导出失败，请重试', 'error');
    }
  };

  const handlePrintStatement = () => {
    window.print();
  };

  const handlePrintSelected = () => {
    if (selectedCustomers.size === 0) {
      toast('请先选择要打印的客户', 'warning');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast('无法打开打印窗口，请检查浏览器设置', 'error');
      return;
    }

    const selectedSummaries = customerSummaries.filter(cs => selectedCustomers.has(cs.customerId));
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>批量对账单打印</title>
        <style>
          body { font-family: 'Microsoft YaHei', Arial, sans-serif; padding: 20px; }
          .statement { page-break-after: always; margin-bottom: 40px; }
          .statement:last-child { page-break-after: avoid; }
          h2 { text-align: center; margin-bottom: 20px; }
          h3 { border-bottom: 1px solid #333; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
          .summary-item { padding: 10px; border-radius: 5px; text-align: center; }
          .normal { background-color: #dcfce7; }
          .attention { background-color: #fef9c3; }
          .warning { background-color: #ffedd5; }
          .danger { background-color: #fee2e2; }
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 15px 0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
    `;

    selectedSummaries.forEach((cs, index) => {
      const customer = customers.find(c => c.id === cs.customerId);
      htmlContent += `
        <div class="statement">
          <h2>客户对账单 (${index + 1}/${selectedSummaries.length})</h2>

          <div class="info-grid">
            <div>
              <h3>客户信息</h3>
              <p><strong>客户名称:</strong> ${customer?.name || '未知'}</p>
              <p><strong>联系电话:</strong> ${customer?.phone || '-'}</p>
              <p><strong>客户类型:</strong> ${customer?.customerType || '普通客户'}</p>
              ${customer?.address ? `<p><strong>地址:</strong> ${customer.address}</p>` : ''}
            </div>
            <div>
              <h3>账务汇总</h3>
              <p><strong>挂账总额:</strong> ¥${cs.totalReceivable.toFixed(2)}</p>
              <p><strong>已还金额:</strong> ¥${cs.totalPaid.toFixed(2)}</p>
              <p><strong>剩余欠款:</strong> <span style="color:red; font-weight:bold;">¥${cs.totalRemaining.toFixed(2)}</span></p>
              <p><strong>欠款笔数:</strong> ${cs.recordCount} 笔</p>
            </div>
          </div>

          <h3>账龄分析</h3>
          <div class="summary-grid">
            <div class="summary-item normal">
              <div style="font-size: 18px; font-weight: bold;">¥${cs.agingDistribution.normal.toFixed(2)}</div>
              <div>30天内</div>
            </div>
            <div class="summary-item attention">
              <div style="font-size: 18px; font-weight: bold;">¥${cs.agingDistribution.attention.toFixed(2)}</div>
              <div>31-90天</div>
            </div>
            <div class="summary-item warning">
              <div style="font-size: 18px; font-weight: bold;">¥${cs.agingDistribution.warning.toFixed(2)}</div>
              <div>91-180天</div>
            </div>
            <div class="summary-item danger">
              <div style="font-size: 18px; font-weight: bold;">¥${cs.agingDistribution.danger.toFixed(2)}</div>
              <div>180天以上</div>
            </div>
          </div>

          <p style="text-align: right; color: #666; margin-top: 20px;">
            生成日期: ${dayjs().format('YYYY-MM-DD')}
          </p>
        </div>
      `;
    });

    htmlContent += `
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">年底财务清账汇总</h2>
          <p className="text-slate-500 mt-1">应收账款统计与对账单管理</p>
        </div>
        <div className="flex gap-3">
          {selectedCustomers.size > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleBatchGenerateStatements}
              >
                📥 导出选中 ({selectedCustomers.size})
              </Button>
              <Button
                variant="outline"
                onClick={handlePrintSelected}
              >
                🖨️ 打印选中 ({selectedCustomers.size})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">年度欠款总额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalReceivableSummary)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">待回收金额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalRemainingSummary)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">客户数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{customerSummaries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">欠款笔数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {customerSummaries.reduce((sum, cs) => sum + cs.recordCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">汇总视图</SelectItem>
                <SelectItem value="customer">按客户</SelectItem>
                <SelectItem value="company">按公司/单位</SelectItem>
                <SelectItem value="project">按项目</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[dayjs().year(), dayjs().year() - 1, dayjs().year() - 2].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={customerTypeFilter} onValueChange={(v) => setCustomerTypeFilter(v as CustomerType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="company">公司/单位</SelectItem>
                <SelectItem value="personal">个人</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="搜索客户名称或电话..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-48"
            />

            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedCustomers.size === customerSummaries.length && customerSummaries.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-slate-500">全选</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {viewMode === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>账龄分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agingChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {agingChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {agingChartData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}: {formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>客户欠款排行 TOP10</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={customerSummaries.slice(0, 10).map(cs => ({
                      name: cs.customerName.substring(0, 6),
                      value: cs.totalRemaining,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `¥${v}`} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={60} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(viewMode === 'customer' || viewMode === 'summary') && (
        <Card>
          <CardHeader>
            <CardTitle>客户欠款明细</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500">加载中...</div>
            ) : customerSummaries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无欠款记录</div>
            ) : (
              <div className="space-y-3">
                {customerSummaries.map((cs) => {
                  const isSelected = selectedCustomers.has(cs.customerId);
                  const agingDays = cs.oldestRecord
                    ? calculateAgingDays(null, cs.oldestRecord)
                    : 0;
                  const aging = getAgingLevel(agingDays);

                  return (
                    <div
                      key={cs.customerId}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        isSelected ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectCustomer(cs.customerId, !!checked)}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-800">{cs.customerName}</span>
                              <Badge variant="outline">{cs.customerType}</Badge>
                              {cs.phone && (
                                <span className="text-sm text-slate-500">{cs.phone}</span>
                              )}
                              <Badge className={`${aging.bgColor} ${aging.color} border ${aging.borderColor}`}>
                                {aging.label}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                              欠款: {formatCurrency(cs.totalRemaining)} | 笔数: {cs.recordCount}
                              {cs.oldestRecord && (
                                <span> | 最早: {formatDate(cs.oldestRecord)}</span>
                              )}
                            </div>
                            <div className="flex gap-4 mt-2 text-xs">
                              <span className="text-green-600">30天内: {formatCurrency(cs.agingDistribution.normal)}</span>
                              <span className="text-yellow-600">31-90天: {formatCurrency(cs.agingDistribution.attention)}</span>
                              <span className="text-orange-600">91-180天: {formatCurrency(cs.agingDistribution.warning)}</span>
                              <span className="text-red-600">180天+: {formatCurrency(cs.agingDistribution.danger)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportSingleStatement(cs)}
                          >
                            📥 导出
                          </Button>
                          <Button
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={() => handleGenerateStatement(cs)}
                          >
                            查看详情
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'company' && (
        <Card>
          <CardHeader>
            <CardTitle>公司/单位欠款汇总</CardTitle>
          </CardHeader>
          <CardContent>
            {companySummaries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无公司/单位欠款记录</div>
            ) : (
              <div className="space-y-3">
                {companySummaries.map((company, index) => (
                  <div key={index} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-800">{company.companyName}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          客户数: {company.customerCount} | 欠款笔数: {company.recordCount}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">
                          {formatCurrency(company.totalRemaining)}
                        </div>
                        <div className="text-xs text-slate-500">
                          总额: {formatCurrency(company.totalReceivable)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'project' && (
        <Card>
          <CardHeader>
            <CardTitle>项目欠款汇总</CardTitle>
          </CardHeader>
          <CardContent>
            {projectSummaries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无项目欠款记录</div>
            ) : (
              <div className="space-y-3">
                {projectSummaries.map((project, index) => (
                  <div key={index} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-800">{project.projectName}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          客户: {project.customerName} | 状态: {project.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">
                          {formatCurrency(project.totalRemaining)}
                        </div>
                        <div className="text-xs text-slate-500">
                          总额: {formatCurrency(project.totalReceivable)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showStatementDialog} onOpenChange={() => setShowStatementDialog(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>客户对账单详情</DialogTitle>
          </DialogHeader>

          {statementDetailData && selectedCustomerStatement && (
            <div className="space-y-6" id="statement-content">
              <div className="text-center border-b pb-4">
                <h3 className="text-xl font-bold">客户对账单</h3>
                <p className="text-sm text-slate-500 mt-1">
                  生成日期: {dayjs().format('YYYY-MM-DD')}
                </p>
                {statementDetailData.shopInfo && (
                  <p className="text-sm text-slate-500">
                    {statementDetailData.shopInfo.shopName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">客户信息</h4>
                  <div className="text-sm text-slate-600 mt-2">
                    <p>客户名称: {statementDetailData.customer?.name || '-'}</p>
                    <p>联系电话: {statementDetailData.customer?.phone || '-'}</p>
                    <p>客户类型: {statementDetailData.customer?.customerType || '-'}</p>
                    {statementDetailData.customer?.address && (
                      <p>地址: {statementDetailData.customer.address}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">账务汇总</h4>
                  <div className="text-sm text-slate-600 mt-2">
                    <p>挂账总额: <span className="text-orange-600">{formatCurrency(selectedCustomerStatement.totalReceivable)}</span></p>
                    <p>已还金额: <span className="text-green-600">{formatCurrency(selectedCustomerStatement.totalPaid)}</span></p>
                    <p>剩余欠款: <span className="text-red-600 font-bold">{formatCurrency(selectedCustomerStatement.totalRemaining)}</span></p>
                    <p>欠款笔数: {selectedCustomerStatement.recordCount} 笔</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">账龄分析</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-green-600">{formatCurrency(selectedCustomerStatement.agingDistribution.normal)}</div>
                    <div className="text-xs text-green-600">30天内</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-yellow-600">{formatCurrency(selectedCustomerStatement.agingDistribution.attention)}</div>
                    <div className="text-xs text-yellow-600">31-90天</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-orange-600">{formatCurrency(selectedCustomerStatement.agingDistribution.warning)}</div>
                    <div className="text-xs text-orange-600">91-180天</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-600">{formatCurrency(selectedCustomerStatement.agingDistribution.danger)}</div>
                    <div className="text-xs text-red-600">180天以上</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">未结清挂账记录</h4>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border p-2 text-left">单号</th>
                      <th className="border p-2 text-left">日期</th>
                      <th className="border p-2 text-right">金额</th>
                      <th className="border p-2 text-right">已付</th>
                      <th className="border p-2 text-right">欠款</th>
                      <th className="border p-2 text-left">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementDetailData.receivables.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="border p-2 text-center text-slate-500">
                          无未结清挂账记录
                        </td>
                      </tr>
                    ) : (
                      statementDetailData.receivables.map((r: any) => (
                        <tr key={r.id}>
                          <td className="border p-2">{r.id.substring(0, 8)}</td>
                          <td className="border p-2">{formatDate(r.createdAt)}</td>
                          <td className="border p-2 text-right">{formatCurrency(r.originalAmount)}</td>
                          <td className="border p-2 text-right">{formatCurrency(r.paidAmount)}</td>
                          <td className="border p-2 text-right text-red-600">{formatCurrency(r.remainingAmount)}</td>
                          <td className="border p-2">
                            <Badge variant={r.isOverdue ? 'destructive' : 'default'}>
                              {r.isOverdue ? '逾期' : '正常'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 print:hidden">
                <Button variant="outline" onClick={() => setShowStatementDialog(false)}>
                  关闭
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExportSingleStatement(selectedCustomerStatement)}
                >
                  📥 导出Excel
                </Button>
                <Button onClick={handlePrintStatement} className="bg-orange-500 hover:bg-orange-600">
                  🖨️ 打印对账单
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { padding: 20px; }
        }
      `}</style>
    </div>
  );
}