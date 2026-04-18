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
} from 'recharts';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getAgingLevel, calculateAgingDays } from '@/lib/customerUtils';
import { toast } from '@/components/Toast';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

type TabType = 'receivable' | 'payable';
type ViewMode = 'summary' | 'contact' | 'entity' | 'project';
type ContactTypeFilter = 'all' | 'company' | 'personal';

interface ContactSummary {
  contactId: string;
  contactName: string;
  contactType: string;
  phone: string | null;
  entityName: string | null;
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

interface EntitySummary {
  entityId: string;
  entityName: string;
  entityType: string;
  contactName: string | null;
  totalReceivable: number;
  totalPaid: number;
  totalRemaining: number;
  recordCount: number;
}

interface ProjectSummary {
  projectId: string;
  projectName: string;
  entityName: string;
  totalReceivable: number;
  totalPaid: number;
  totalRemaining: number;
  status: string;
}

interface SupplierPayable {
  supplierId: string;
  supplierName: string;
  contactName: string | null;
  contactPhone: string | null;
  totalPayable: number;
  recordCount: number;
}

const AGING_COLORS = {
  normal: '#22c55e',
  attention: '#eab308',
  warning: '#f97316',
  danger: '#ef4444',
};

export function Statements() {
  const [activeTab, setActiveTab] = useState<TabType>('receivable');
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [contactTypeFilter, setContactTypeFilter] = useState<ContactTypeFilter>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedYear, setSelectedYear] = useState(dayjs().year().toString());

  const [contacts, setContacts] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [bizProjects, setBizProjects] = useState<any[]>([]);
  const [saleOrders, setSaleOrders] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<ContactSummary | null>(null);
  const [statementDetailData, setStatementDetailData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'receivable') {
        const [contactsData, entitiesData, bizProjectsData, saleOrdersData, receivablesData] = await Promise.all([
          db.contact.findMany({
            where: { contactType: { in: ['customer', 'plumber'] } },
            orderBy: { name: 'asc' },
          }),
          db.entity.findMany({
            orderBy: { name: 'asc' },
            include: { contact: true },
          }),
          db.bizProject.findMany({
            where: { status: { in: ['进行中', '已暂停'] } },
            include: { entity: true },
            orderBy: { createdAt: 'desc' },
          }),
          db.saleOrder.findMany({
            where: {
              status: { in: ['pending', 'partial', 'completed'] },
            },
            include: {
              buyer: true,
              payer: true,
              project: true,
              paymentEntity: true,
            },
            orderBy: { saleDate: 'desc' },
          }),
          db.receivable.findMany({
            where: {
              status: { in: ['pending', 'partial'] },
              remainingAmount: { gt: 0 },
            },
            include: { order: { include: { buyer: true, paymentEntity: true } } },
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        setContacts(contactsData);
        setEntities(entitiesData);
        setBizProjects(bizProjectsData);
        setSaleOrders(saleOrdersData);
        setReceivables(receivablesData);
      } else {
        const [suppliersData, purchasesData] = await Promise.all([
          db.supplier.findMany({
            orderBy: { name: 'asc' },
            include: { supplierContact: true },
          }),
          db.purchase.findMany({
            where: {
              totalAmount: { gt: 0 },
            },
            include: {
              product: true,
              supplier: true,
            },
            orderBy: { purchaseDate: 'desc' },
          }),
        ]);

        setSuppliers(suppliersData);
        setPurchases(purchasesData);
      }
    } catch (error) {
      console.error('[Statements] 加载数据失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const contactSummaries = useMemo(() => {
    const yearStart = new Date(parseInt(selectedYear), 0, 1);
    const yearEnd = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);

    const filteredReceivables = receivables.filter(r => {
      const createdAt = new Date(r.createdAt);
      return createdAt >= yearStart && createdAt <= yearEnd;
    });

    const summaryMap = new Map<string, ContactSummary>();

    filteredReceivables.forEach(r => {
      const order = r.order;
      if (!order) return;

      const contactId = order.buyerId;
      const existing = summaryMap.get(contactId);
      const agingDays = calculateAgingDays(r.agreedPaymentDate, r.createdAt);
      const aging = getAgingLevel(agingDays);
      const contact = contacts.find(c => c.id === contactId);
      const entity = order.paymentEntity;

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
        summaryMap.set(contactId, {
          contactId,
          contactName: contact?.name || '未知联系人',
          contactType: contact?.contactType || 'customer',
          phone: contact?.primaryPhone || contact?.phones?.[0]?.phone || null,
          entityName: entity?.name || null,
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

    if (contactTypeFilter !== 'all') {
      summaries = summaries.filter(s => {
        if (contactTypeFilter === 'company') {
          return s.entityName && s.entityName !== s.contactName;
        }
        return !s.entityName || s.entityName === s.contactName;
      });
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      summaries = summaries.filter(s =>
        s.contactName.toLowerCase().includes(keyword) ||
        s.phone?.toLowerCase().includes(keyword) ||
        s.entityName?.toLowerCase().includes(keyword)
      );
    }

    return summaries.sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [receivables, contacts, selectedYear, contactTypeFilter, searchKeyword]);

  const entitySummaries = useMemo(() => {
    const entityMap = new Map<string, EntitySummary>();

    contactSummaries.forEach(cs => {
      if (cs.entityName) {
        const entity = entities.find(e => e.name === cs.entityName);
        if (!entity) return;

        const existing = entityMap.get(entity.id);
        if (existing) {
          existing.totalReceivable += cs.totalReceivable;
          existing.totalPaid += cs.totalPaid;
          existing.totalRemaining += cs.totalRemaining;
          existing.recordCount += cs.recordCount;
        } else {
          entityMap.set(entity.id, {
            entityId: entity.id,
            entityName: cs.entityName,
            entityType: entity.entityType,
            contactName: entity.contact?.name || null,
            totalReceivable: cs.totalReceivable,
            totalPaid: cs.totalPaid,
            totalRemaining: cs.totalRemaining,
            recordCount: cs.recordCount,
          });
        }
      }
    });

    return Array.from(entityMap.values()).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [contactSummaries, entities]);

  const projectSummaries = useMemo(() => {
    const yearStart = new Date(parseInt(selectedYear), 0, 1);
    const yearEnd = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);

    const projectReceivables = receivables.filter(r => {
      const order = r.order;
      return order?.projectId;
    });

    return projectReceivables.map(r => {
      const order = r.order;
      const project = bizProjects.find(p => p.id === order?.projectId);
      const entity = project?.entity;

      return {
        projectId: order?.projectId,
        projectName: project?.name || '未知项目',
        entityName: entity?.name || '-',
        totalReceivable: r.originalAmount,
        totalPaid: r.paidAmount,
        totalRemaining: r.remainingAmount,
        status: project?.status || '未知',
      };
    }).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [receivables, bizProjects, selectedYear]);

  const supplierPayables = useMemo(() => {
    const supplierMap = new Map<string, SupplierPayable>();

    purchases.forEach(p => {
      const unpaidAmount = p.totalAmount;
      if (unpaidAmount <= 0) return;

      const supplier = suppliers.find(s => s.id === p.supplierId);
      if (!supplier) return;

      const existing = supplierMap.get(supplier.id);
      if (existing) {
        existing.totalPayable += unpaidAmount;
        existing.recordCount += 1;
      } else {
        supplierMap.set(supplier.id, {
          supplierId: supplier.id,
          supplierName: supplier.name,
          contactName: supplier.supplierContact?.name || null,
          contactPhone: supplier.supplierContact?.primaryPhone || supplier.phone || null,
          totalPayable: unpaidAmount,
          recordCount: 1,
        });
      }
    });

    let result = Array.from(supplierMap.values()).sort((a, b) => b.totalPayable - a.totalPayable);

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(s =>
        s.supplierName.toLowerCase().includes(keyword) ||
        s.contactName?.toLowerCase().includes(keyword) ||
        s.contactPhone?.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [purchases, suppliers, searchKeyword]);

  const totalReceivableSummary = useMemo(() => {
    return contactSummaries.reduce((sum, cs) => sum + cs.totalReceivable, 0);
  }, [contactSummaries]);

  const totalRemainingSummary = useMemo(() => {
    return contactSummaries.reduce((sum, cs) => sum + cs.totalRemaining, 0);
  }, [contactSummaries]);

  const totalPayableSummary = useMemo(() => {
    return supplierPayables.reduce((sum, s) => sum + s.totalPayable, 0);
  }, [supplierPayables]);

  const agingChartData = useMemo(() => {
    const totals = contactSummaries.reduce(
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
  }, [contactSummaries]);

  const handleSelectAll = (checked: boolean) => {
    if (activeTab === 'receivable') {
      if (checked) {
        setSelectedItems(new Set(contactSummaries.map(cs => cs.contactId)));
      } else {
        setSelectedItems(new Set());
      }
    } else {
      if (checked) {
        setSelectedItems(new Set(supplierPayables.map(s => s.supplierId)));
      } else {
        setSelectedItems(new Set());
      }
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleGenerateStatement = async (summary: ContactSummary) => {
    try {
      const contactReceivables = receivables.filter(r => {
        const order = r.order;
        return order?.buyerId === summary.contactId;
      });

      const detailData = {
        contact: contacts.find(c => c.id === summary.contactId),
        receivables: contactReceivables,
        summary,
        generatedAt: new Date(),
        shopInfo: await db.systemSetting.findFirst(),
      };

      setStatementDetailData(detailData);
      setSelectedStatement(summary);
      setShowStatementDialog(true);
    } catch (error) {
      console.error('[Statements] 生成对账单失败:', error);
      toast('生成对账单失败，请重试', 'error');
    }
  };

  const handleExportExcel = async () => {
    if (selectedItems.size === 0) {
      toast('请先选择要导出的项目', 'warning');
      return;
    }

    try {
      if (activeTab === 'receivable') {
        const selectedSummaries = contactSummaries.filter(cs => selectedItems.has(cs.contactId));
        const wsData = selectedSummaries.map((item, index) => ({
          '序号': index + 1,
          '联系人': item.contactName,
          '联系电话': item.phone || '-',
          '挂靠主体': item.entityName || '-',
          '欠款总额': item.totalReceivable,
          '已还金额': item.totalPaid,
          '剩余欠款': item.totalRemaining,
          '欠款笔数': item.recordCount,
          '30天内': item.agingDistribution.normal,
          '31-90天': item.agingDistribution.attention,
          '91-180天': item.agingDistribution.warning,
          '180天以上': item.agingDistribution.danger,
        }));

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '应收账款汇总');

        wsData.forEach((row, index) => {
          const cellRefs = ['E', 'F', 'G', 'H', 'I', 'J', 'K'];
          cellRefs.forEach(col => {
            const cellRef = `${col}${index + 2}`;
            if (ws[cellRef]) {
              ws[cellRef].t = 'n';
              ws[cellRef].z = '¥#,##0.00';
            }
          });
        });

        XLSX.writeFile(wb, `应收账款汇总_${selectedYear}_${dayjs().format('YYYYMMDD')}.xlsx`);
        toast(`成功导出 ${selectedSummaries.length} 条记录`, 'success');
      } else {
        const selectedPayables = supplierPayables.filter(s => selectedItems.has(s.supplierId));
        const wsData = selectedPayables.map((item, index) => ({
          '序号': index + 1,
          '供应商': item.supplierName,
          '联系人': item.contactName || '-',
          '联系电话': item.contactPhone || '-',
          '应付总额': item.totalPayable,
          '欠款笔数': item.recordCount,
        }));

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '应付账款汇总');

        wsData.forEach((row, index) => {
          const cellRef = `E${index + 2}`;
          if (ws[cellRef]) {
            ws[cellRef].t = 'n';
            ws[cellRef].z = '¥#,##0.00';
          }
        });

        XLSX.writeFile(wb, `应付账款汇总_${dayjs().format('YYYYMMDD')}.xlsx`);
        toast(`成功导出 ${selectedPayables.length} 条记录`, 'success');
      }
    } catch (error) {
      console.error('[Statements] 导出失败:', error);
      toast('导出失败，请重试', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">财务对账管理</h2>
          <p className="text-slate-500 mt-1">
            {activeTab === 'receivable' ? '应收账款统计与对账单管理' : '应付供应商账款统计'}
          </p>
        </div>
        <div className="flex gap-3">
          {selectedItems.size > 0 && (
            <>
              <Button variant="outline" onClick={handleExportExcel}>
                📥 导出选中 ({selectedItems.size})
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                🖨️ 打印选中 ({selectedItems.size})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === 'receivable' ? 'default' : 'outline'}
          onClick={() => setActiveTab('receivable')}
          className={activeTab === 'receivable' ? 'bg-orange-500' : ''}
        >
          📋 应收账款
        </Button>
        <Button
          variant={activeTab === 'payable' ? 'default' : 'outline'}
          onClick={() => setActiveTab('payable')}
          className={activeTab === 'payable' ? 'bg-orange-500' : ''}
        >
          💵 我应付
        </Button>
      </div>

      {activeTab === 'receivable' && (
        <>
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
                <CardTitle className="text-sm font-medium text-slate-500">联系人数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{contactSummaries.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">欠款笔数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {contactSummaries.reduce((sum, cs) => sum + cs.recordCount, 0)}
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
                    <SelectItem value="contact">按联系人</SelectItem>
                    <SelectItem value="entity">按挂靠主体</SelectItem>
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

                <Select value={contactTypeFilter} onValueChange={(v) => setContactTypeFilter(v as ContactTypeFilter)}>
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
                  placeholder="搜索联系人或主体..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-48"
                />

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.size === contactSummaries.length && contactSummaries.length > 0}
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
                  <CardTitle>欠款排行 TOP10</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={contactSummaries.slice(0, 10).map(cs => ({
                          name: cs.contactName.substring(0, 6),
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

          {(viewMode === 'contact' || viewMode === 'summary') && (
            <Card>
              <CardHeader>
                <CardTitle>联系人欠款明细</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-slate-500">加载中...</div>
                ) : contactSummaries.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">暂无欠款记录</div>
                ) : (
                  <div className="space-y-3">
                    {contactSummaries.map((cs) => {
                      const isSelected = selectedItems.has(cs.contactId);
                      const agingDays = cs.oldestRecord ? calculateAgingDays(null, cs.oldestRecord) : 0;
                      const aging = getAgingLevel(agingDays);

                      return (
                        <div
                          key={cs.contactId}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            isSelected ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectItem(cs.contactId, !!checked)}
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-800">{cs.contactName}</span>
                                  <Badge variant="outline">{cs.contactType === 'plumber' ? '水电工' : '客户'}</Badge>
                                  {cs.phone && (
                                    <span className="text-sm text-slate-500">{cs.phone}</span>
                                  )}
                                  {cs.entityName && (
                                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                      {cs.entityName}
                                    </Badge>
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

          {viewMode === 'entity' && (
            <Card>
              <CardHeader>
                <CardTitle>挂靠主体欠款汇总</CardTitle>
              </CardHeader>
              <CardContent>
                {entitySummaries.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">暂无主体欠款记录</div>
                ) : (
                  <div className="space-y-3">
                    {entitySummaries.map((entity) => {
                      const isSelected = selectedItems.has(entity.entityId);
                      return (
                        <div
                          key={entity.entityId}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            isSelected ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectItem(entity.entityId, !!checked)}
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-800">{entity.entityName}</span>
                                  <Badge variant="outline">
                                    {entity.entityType === 'company' ? '公司' : entity.entityType === 'government' ? '政府' : '个人'}
                                  </Badge>
                                  {entity.contactName && (
                                    <span className="text-sm text-slate-500">联系人: {entity.contactName}</span>
                                  )}
                                </div>
                                <div className="text-sm text-slate-500 mt-1">
                                  欠款笔数: {entity.recordCount}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-red-600">
                                {formatCurrency(entity.totalRemaining)}
                              </div>
                              <div className="text-xs text-slate-500">
                                总额: {formatCurrency(entity.totalReceivable)}
                              </div>
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
                    {projectSummaries.map((project) => {
                      const isSelected = selectedItems.has(project.projectId);
                      return (
                        <div
                          key={project.projectId}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            isSelected ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectItem(project.projectId, !!checked)}
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-800">{project.projectName}</span>
                                  <Badge variant="outline">{project.status}</Badge>
                                  <span className="text-sm text-slate-500">主体: {project.entityName}</span>
                                </div>
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
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === 'payable' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">应付总额</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalPayableSummary)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">供应商数量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{supplierPayables.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">欠款笔数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {supplierPayables.reduce((sum, s) => sum + s.recordCount, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4 flex-wrap">
                <Input
                  placeholder="搜索供应商..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-48"
                />

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.size === supplierPayables.length && supplierPayables.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-slate-500">全选</span>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>供应商应付账款</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">加载中...</div>
              ) : supplierPayables.length === 0 ? (
                <div className="text-center py-8 text-slate-500">暂无应付账款记录</div>
              ) : (
                <div className="space-y-3">
                  {supplierPayables.map((supplier) => {
                    const isSelected = selectedItems.has(supplier.supplierId);
                    return (
                      <div
                        key={supplier.supplierId}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          isSelected ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectItem(supplier.supplierId, !!checked)}
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-800">{supplier.supplierName}</span>
                                {supplier.contactName && (
                                  <span className="text-sm text-slate-500">联系人: {supplier.contactName}</span>
                                )}
                                {supplier.contactPhone && (
                                  <span className="text-sm text-slate-500">电话: {supplier.contactPhone}</span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500 mt-1">
                                欠款笔数: {supplier.recordCount}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-orange-600">
                              {formatCurrency(supplier.totalPayable)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showStatementDialog} onOpenChange={() => setShowStatementDialog(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>联系人对账单详情</DialogTitle>
          </DialogHeader>

          {statementDetailData && selectedStatement && (
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
                  <h4 className="font-medium">联系人信息</h4>
                  <div className="text-sm text-slate-600 mt-2">
                    <p>联系人名称: {statementDetailData.contact?.name || '-'}</p>
                    <p>联系电话: {statementDetailData.contact?.primaryPhone || '-'}</p>
                    <p>类型: {statementDetailData.contact?.contactType === 'plumber' ? '水电工' : '客户'}</p>
                    {selectedStatement.entityName && (
                      <p>挂靠主体: {selectedStatement.entityName}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">账务汇总</h4>
                  <div className="text-sm text-slate-600 mt-2">
                    <p>挂账总额: <span className="text-orange-600">{formatCurrency(selectedStatement.totalReceivable)}</span></p>
                    <p>已还金额: <span className="text-green-600">{formatCurrency(selectedStatement.totalPaid)}</span></p>
                    <p>剩余欠款: <span className="text-red-600 font-bold">{formatCurrency(selectedStatement.totalRemaining)}</span></p>
                    <p>欠款笔数: {selectedStatement.recordCount} 笔</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">账龄分析</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-green-600">{formatCurrency(selectedStatement.agingDistribution.normal)}</div>
                    <div className="text-xs text-green-600">30天内</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-yellow-600">{formatCurrency(selectedStatement.agingDistribution.attention)}</div>
                    <div className="text-xs text-yellow-600">31-90天</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-orange-600">{formatCurrency(selectedStatement.agingDistribution.warning)}</div>
                    <div className="text-xs text-orange-600">91-180天</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-600">{formatCurrency(selectedStatement.agingDistribution.danger)}</div>
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
                <Button onClick={handlePrint} className="bg-orange-500 hover:bg-orange-600">
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